const COLLECTION_KEY = 'wc2026_collection';
const LAST_PACK_KEY  = 'wc2026_last_pack';
const PENDING_KEY    = 'wc2026_pending';
const DUPLICATES_KEY = 'wc2026_duplicates';

// Ventana de sobres: cada 4 horas se genera una nueva cuota aleatoria (3..10)
const PACK_WINDOW_MS = 4 * 60 * 60 * 1000;

function _load() {
  try { return JSON.parse(localStorage.getItem(COLLECTION_KEY)) || {}; }
  catch { return {}; }
}

function _save(data) {
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(data));
}

function stickerKey(countryId, slotIndex) {
  return `${countryId}:${slotIndex}`;
}

export const collectionStore = {
  has(countryId, slotIndex) {
    return !!_load()[stickerKey(countryId, slotIndex)];
  },

  // Devuelve 'new' o 'duplicate'
  collect(countryId, slotIndex) {
    const data = _load();
    const key = stickerKey(countryId, slotIndex);
    if (data[key]) {
      data[key] += 1;
      _save(data);
      return 'duplicate';
    }
    data[key] = 1;
    _save(data);
    return 'new';
  },

  // Progreso global y por país
  getProgress(countries) {
    const data = _load();
    let total = 0;
    let collected = 0;
    const byCountry = {};

    countries.forEach(c => {
      const missing = [];
      let found = 0;
      c.slots.forEach(slot => {
        total++;
        if (data[stickerKey(c.id, slot.number)]) {
          collected++;
          found++;
        } else {
          missing.push(slot.number);
        }
      });
      byCountry[c.id] = { total: c.slots.length, found, missing };
    });

    return {
      total,
      collected,
      percent: total > 0 ? Math.round(collected / total * 1000) / 10 : 0,
      byCountry
    };
  },

  // Devuelve { allowed: N, used: N, remaining: N } para hoy
  _getDailyQuota() {
    // Deprecated: cuota diaria. Se deja por compatibilidad, pero el sistema actual usa ventanas de 4h.
    return this._getWindowQuota();
    const today = new Date().toISOString().slice(0, 10);
    let quota = null;
    try { quota = JSON.parse(localStorage.getItem(LAST_PACK_KEY)); } catch {}

    if (!quota || quota.date !== today) {
      // Nuevo día → generar cuota aleatoria entre 3 y 10
      quota = {
        date: today,
        allowed: Math.floor(Math.random() * 8) + 3, // 3..10
        used: 0
      };
      localStorage.setItem(LAST_PACK_KEY, JSON.stringify(quota));
    }
    return { ...quota, remaining: quota.allowed - quota.used };
  },

  // Devuelve { windowStart, allowed, used, remaining } para esta ventana de 4h
  _getWindowQuota() {
    const now = Date.now();
    const windowStart = Math.floor(now / PACK_WINDOW_MS) * PACK_WINDOW_MS;

    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(LAST_PACK_KEY)); } catch {}

    // Normalizar: si no coincide la ventana, generar nueva cuota
    if (!stored || stored.windowStart !== windowStart) {
      stored = {
        windowStart,
        allowed: Math.floor(Math.random() * 8) + 3, // 3..10
        used: 0,
      };
      localStorage.setItem(LAST_PACK_KEY, JSON.stringify(stored));
    }

    const remaining = Math.max(0, Number(stored.allowed || 0) - Number(stored.used || 0));
    return { ...stored, remaining };
  },

  canOpenPack() {
    return this._getWindowQuota().remaining > 0;
  },

  // Cuántos sobres quedan en esta ventana de 4h
  packsRemaining() {
    return this._getWindowQuota().remaining;
  },

  markPackOpened() {
    const q = this._getWindowQuota();
    const next = {
      windowStart: q.windowStart,
      allowed: q.allowed,
      used: Math.min(Number(q.used || 0) + 1, Number(q.allowed || 0)),
    };
    localStorage.setItem(LAST_PACK_KEY, JSON.stringify(next));
  },

  // ms hasta la próxima ventana (nuevo set de 3..10 sobres)
  msUntilNextPack() {
    const now = Date.now();
    const nextWindow = (Math.floor(now / PACK_WINDOW_MS) * PACK_WINDOW_MS) + PACK_WINDOW_MS;
    return Math.max(0, nextWindow - now);
  },

  // ── Cromos pendientes de pegar ──────────────────────────────────────────
  savePendingPack(stickers) {
    // stickers: [{ countryId, slotIndex }]
    // Se acumulan (merge) con los pendientes existentes para no perder sobres anteriores.
    const existing = this.getPendingPack();
    const merged = [];
    const seen = new Set();

    const add = (s) => {
      if (!s || !s.countryId || s.slotIndex == null) return;
      const key = `${s.countryId}:${s.slotIndex}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({ countryId: s.countryId, slotIndex: Number(s.slotIndex) });
    };

    existing.forEach(add);
    (stickers || []).forEach(add);
    localStorage.setItem(PENDING_KEY, JSON.stringify(merged));
  },

  getPendingPack() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || []; }
    catch { return []; }
  },

  removePending(countryId, slotIndex) {
    const p = this.getPendingPack();
    const i = p.findIndex(s => s.countryId === countryId && s.slotIndex === slotIndex);
    if (i !== -1) {
      p.splice(i, 1);
      localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    }
  },

  clearPendingPack() {
    localStorage.removeItem(PENDING_KEY);
  },

  // ── Duplicados disponibles para intercambio ─────────────────────────────
  // Store separado: no afecta el progreso del álbum ni la colección.

  _loadDupes() {
    try { return JSON.parse(localStorage.getItem(DUPLICATES_KEY)) || {}; } catch { return {}; }
  },

  // Registra un cromo como duplicado disponible para intercambio
  addDuplicate(countryId, slotIndex) {
    const data = this._loadDupes();
    const key  = stickerKey(countryId, slotIndex);
    data[key]  = (data[key] || 0) + 1;
    localStorage.setItem(DUPLICATES_KEY, JSON.stringify(data));
  },

  // Quita un duplicado (cuando se intercambia)
  removeDuplicate(countryId, slotIndex) {
    const data = this._loadDupes();
    const key  = stickerKey(countryId, slotIndex);
    if (!data[key]) return;
    data[key]--;
    if (data[key] <= 0) delete data[key];
    localStorage.setItem(DUPLICATES_KEY, JSON.stringify(data));
  },

  // Devuelve [{ countryId, slotIndex, count }] de cromos disponibles para intercambio
  getDuplicates() {
    const data = this._loadDupes();
    return Object.entries(data)
      .filter(([, count]) => count >= 1)
      .map(([key, count]) => {
        const [countryId, slotIndex] = key.split(':');
        return { countryId, slotIndex: Number(slotIndex), count };
      });
  },

  // Cuántas copias tiene en duplicados de un cromo específico
  getDuplicateCount(countryId, slotIndex) {
    const data = this._loadDupes();
    return data[stickerKey(countryId, slotIndex)] || 0;
  },

  // Recibir un cromo de regalo — lo añade directamente a la colección
  receiveGift(countryId, slotIndex) {
    return this.collect(countryId, slotIndex);
  }
};
