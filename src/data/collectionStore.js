import { isFreePlay } from './albumContext.js';

// Ventana de sobres: cada 4 horas se genera una nueva cuota aleatoria (3..10)
const PACK_WINDOW_MS = 4 * 60 * 60 * 1000;
const DEMO_MAX_PACKS = 5;

// Namespace dinámico: en empresa usa el albumId del meta tag, en FIFA usa 'wc2026'
function _ns() {
  const slug = document.querySelector('meta[name="empresa-slug"]')?.content?.trim();
  return slug || 'wc2026';
}

function _keys() {
  const ns = _ns();
  return {
    collection: `${ns}_collection`,
    lastPack:   `${ns}_last_pack`,
    pending:    `${ns}_pending`,
    duplicates: `${ns}_duplicates`,
  };
}

function _load() {
  try { return JSON.parse(localStorage.getItem(_keys().collection)) || {}; }
  catch { return {}; }
}

function _save(data) {
  localStorage.setItem(_keys().collection, JSON.stringify(data));
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
    try { quota = JSON.parse(localStorage.getItem(_keys().lastPack)); } catch {}

    if (!quota || quota.date !== today) {
      // Nuevo día → generar cuota aleatoria entre 3 y 10
      quota = {
        date: today,
        allowed: Math.floor(Math.random() * 8) + 3, // 3..10
        used: 0
      };
      localStorage.setItem(_keys().lastPack, JSON.stringify(quota));
    }
    return { ...quota, remaining: quota.allowed - quota.used };
  },

  // Devuelve { windowStart, allowed, used, remaining } para esta ventana de 4h
  _getWindowQuota() {
    const now = Date.now();
    const windowStart = Math.floor(now / PACK_WINDOW_MS) * PACK_WINDOW_MS;

    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(_keys().lastPack)); } catch {}

    // Normalizar: si no coincide la ventana, generar nueva cuota
    if (!stored || stored.windowStart !== windowStart) {
      stored = {
        windowStart,
        allowed: Math.floor(Math.random() * 8) + 3, // 3..10
        used: 0,
      };
      localStorage.setItem(_keys().lastPack, JSON.stringify(stored));
    }

    const remaining = Math.max(0, Number(stored.allowed || 0) - Number(stored.used || 0));
    return { ...stored, remaining };
  },

  // ── Demo mode: contador total de sobres (máx DEMO_MAX_PACKS) ──────────────
  _getDemoUsed() {
    try { return parseInt(localStorage.getItem(_keys().lastPack + '_demo') || '0'); }
    catch { return 0; }
  },

  canOpenPack() {
    if (isFreePlay()) return this._getWindowQuota().remaining > 0;
    return this._getDemoUsed() < DEMO_MAX_PACKS;
  },

  packsRemaining() {
    if (isFreePlay()) return this._getWindowQuota().remaining;
    return Math.max(0, DEMO_MAX_PACKS - this._getDemoUsed());
  },

  markPackOpened() {
    if (isFreePlay()) {
      const q = this._getWindowQuota();
      localStorage.setItem(_keys().lastPack, JSON.stringify({
        windowStart: q.windowStart,
        allowed: q.allowed,
        used: Math.min(Number(q.used || 0) + 1, Number(q.allowed || 0)),
      }));
    } else {
      const used = this._getDemoUsed();
      localStorage.setItem(_keys().lastPack + '_demo', String(Math.min(used + 1, DEMO_MAX_PACKS)));
    }
  },

  msUntilNextPack() {
    if (!isFreePlay()) return 0; // demo: no hay recarga automática
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
    localStorage.setItem(_keys().pending, JSON.stringify(merged));
  },

  getPendingPack() {
    try { return JSON.parse(localStorage.getItem(_keys().pending)) || []; }
    catch { return []; }
  },

  removePending(countryId, slotIndex) {
    const p = this.getPendingPack();
    const i = p.findIndex(s => s.countryId === countryId && s.slotIndex === slotIndex);
    if (i !== -1) {
      p.splice(i, 1);
      localStorage.setItem(_keys().pending, JSON.stringify(p));
    }
  },

  clearPendingPack() {
    localStorage.removeItem(_keys().pending);
  },

  // ── Duplicados disponibles para intercambio ─────────────────────────────
  // Store separado: no afecta el progreso del álbum ni la colección.

  _loadDupes() {
    try { return JSON.parse(localStorage.getItem(_keys().duplicates)) || {}; } catch { return {}; }
  },

  // Registra un cromo como duplicado disponible para intercambio
  addDuplicate(countryId, slotIndex) {
    const data = this._loadDupes();
    const key  = stickerKey(countryId, slotIndex);
    data[key]  = (data[key] || 0) + 1;
    localStorage.setItem(_keys().duplicates, JSON.stringify(data));
  },

  // Quita un duplicado (cuando se intercambia)
  removeDuplicate(countryId, slotIndex) {
    const data = this._loadDupes();
    const key  = stickerKey(countryId, slotIndex);
    if (!data[key]) return;
    data[key]--;
    if (data[key] <= 0) delete data[key];
    localStorage.setItem(_keys().duplicates, JSON.stringify(data));
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
  }
};
