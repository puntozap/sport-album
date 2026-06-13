import '../styles/give-receive.css';
import { collectionStore } from '../data/collectionStore.js';
import { countries } from '../data/countries.js';
import { isEmpresaMode, getEmpresaEntities } from '../data/albumContext.js';
import { transferService } from '../data/transferService.js';
import { showPhoneModal, getSavedPhone, getSavedName } from './PhoneModal.js';
import { openPackModal } from './PackOpener.js';
import { router } from '../router.js';

const GIFT_TOTAL_KEY = 'give_total_gifted';
const REWARD_EVERY   = 30;
const REWARD_PACKS   = 5;

function getTotalGifted() {
  return parseInt(localStorage.getItem(GIFT_TOTAL_KEY) || '0', 10);
}

function incrementGifted(count) {
  const oldTotal = getTotalGifted();
  const newTotal = oldTotal + count;
  localStorage.setItem(GIFT_TOTAL_KEY, String(newTotal));
  return { oldTotal, newTotal };
}

function getReceiveUrl(id) {
  // Siempre desde la raíz, sin importar en qué ruta esté el emisor
  return window.location.origin + '/#/receive/' + id;
}

export function GivePage() {
  const activeEntities = isEmpresaMode() ? getEmpresaEntities() : countries;
  const countryMap = {};
  activeEntities.forEach(c => { countryMap[c.id] = c; });

  const dupes = collectionStore.getDuplicates();

  function hideTray() { document.querySelector('.st-tray')?.classList.add('st-tray--hidden'); }
  hideTray();
  const trayObserver = new MutationObserver(hideTray);
  trayObserver.observe(document.body, { childList: true, subtree: true });

  const overlay = document.createElement('div');
  overlay.className = 'gr-overlay';
  overlay.addEventListener('pointerdown', e => e.stopPropagation());

  let selected  = [];
  let pollTimer = null;
  let curStep   = 'select';

  // ── Sin duplicados ──
  if (dupes.length === 0) {
    overlay.innerHTML = `
      <div class="gr-header">
        <button class="gr-header-back" id="gr-back">←</button>
        <div class="gr-header-title">Regalar cromos</div>
      </div>
      <div class="gr-empty">
        <div class="gr-empty-icon">🎴</div>
        <div class="gr-empty-title">Sin duplicados</div>
        <div class="gr-empty-sub">No tienes cromos repetidos para regalar. Sigue completando tu álbum.</div>
      </div>
    `;
    overlay.querySelector('#gr-back').addEventListener('click', close);
    document.body.appendChild(overlay);
    attachPanToClose();
    return overlay;
  }

  // Agrupar dupes por país
  const dupesByCountry = {};
  dupes.forEach(d => {
    if (!dupesByCountry[d.countryId]) dupesByCountry[d.countryId] = [];
    dupesByCountry[d.countryId].push(d);
  });

  overlay.innerHTML = `
    <div class="gr-header">
      <button class="gr-header-back" id="gr-back">←</button>
      <div class="gr-header-title">Regalar cromos</div>
    </div>

    <!-- PASO 1: Selección por grupos -->
    <div class="gr-step active" id="gr-step-select">
      <div class="gr-search-wrap">
        <input class="gr-search" id="gr-search" type="search"
               placeholder="🔍 Buscar equipo…" autocomplete="off" spellcheck="false">
      </div>
      <div class="gr-groups" id="gr-groups"></div>
      <div class="gr-footer">
        <button class="gr-btn" id="gr-btn-generate" disabled>Selecciona al menos 1 cromo</button>
      </div>
    </div>

    <!-- PASO 2: QR + espera -->
    <div class="gr-step" id="gr-step-qr">
      <div class="gr-qr-section">
        <div class="gr-qr-box">
          <img id="gr-qr-img" src="" alt="QR código">
        </div>
        <div class="gr-qr-label">Muestra este QR a la persona que quieres regalar los cromos</div>
        <div class="gr-stickers-preview" id="gr-preview"></div>
        <div class="gr-waiting">
          <div class="gr-spinner"></div>
          <span>Esperando que escaneen…</span>
        </div>
        <button class="gr-btn" id="gr-btn-wa" style="background:#25d366;color:#fff;max-width:280px;">
          📲 Compartir enlace
        </button>
      </div>
      <div class="gr-footer">
        <button class="gr-btn" id="gr-btn-cancel" style="background:#132018;color:#ef4444;border:1px solid rgba(239,68,68,0.25);">
          Cancelar
        </button>
      </div>
    </div>

    <!-- PASO 3: Éxito -->
    <div class="gr-step" id="gr-step-success">
      <div class="gr-success">
        <div class="gr-success-icon">🎉</div>
        <div class="gr-success-title">¡Cromos enviados!</div>
        <div class="gr-success-sub" id="gr-success-sub">Los cromos ya están en el álbum de tu amigo.</div>
        <div class="gr-reward-badge" id="gr-reward" style="display:none"></div>
      </div>
      <div class="gr-footer">
        <button class="gr-btn" id="gr-btn-close">Cerrar</button>
      </div>
    </div>
  `;

  // ── Construir grupos ──────────────────────────────────────────────────────
  function buildGroups(query = '') {
    const q = query.toLowerCase().trim();
    const container = overlay.querySelector('#gr-groups');
    container.innerHTML = '';

    const visible = activeEntities.filter(country => {
      if (!dupesByCountry[country.id]) return false;
      if (q && !country.name.toLowerCase().includes(q) && !country.code.toLowerCase().includes(q)) return false;
      return true;
    });

    if (visible.length === 0) {
      container.innerHTML = `<div class="gr-no-results">Sin resultados${q ? ` para "${query}"` : ''}</div>`;
      return;
    }

    visible.forEach(country => {
      const countryDupes = dupesByCountry[country.id] || [];
      const totalDupes   = countryDupes.reduce((s, d) => s + d.count, 0);

      const block = document.createElement('div');
      block.className = 'gr-country-block';
      block.dataset.country = country.id;

      block.innerHTML = `
        <div class="gr-country-label">
          <span class="gr-country-code">${country.code}</span>
          <span class="gr-country-name">${country.name}</span>
          <span class="gr-country-count">${totalDupes} repetida${totalDupes !== 1 ? 's' : ''}</span>
          <span class="gr-country-sel" id="sel-${country.id}" style="display:none"></span>
        </div>
        <div class="gr-stickers-row" id="row-${country.id}"></div>
      `;

      const row = block.querySelector(`#row-${country.id}`);

      countryDupes.forEach(({ countryId, slotIndex, count }) => {
        const slot = country.slots.find(s => s.number === slotIndex);
        if (!slot?.stickerUrl) return;

        const stickerKey = `${countryId}:${slotIndex}`;

        for (let copyIdx = 0; copyIdx < count; copyIdx++) {
          const card = document.createElement('div');
          card.className = 'gr-card';
          card.dataset.sticker = stickerKey;

          const initSel = selected.filter(s => s.countryId === countryId && s.slotIndex === slotIndex).length;
          if (copyIdx < initSel) card.classList.add('gr-card--selected');

          card.innerHTML = `
            <img src="${slot.stickerUrl}" alt="${slot.name || ''}">
            <div class="gr-card-code">${country.code} ${slotIndex}</div>
            <div class="gr-card-check">✓</div>
          `;

          card.addEventListener('click', () => {
            const numSel = selected.filter(s => s.countryId === countryId && s.slotIndex === slotIndex).length;
            if (copyIdx < numSel) {
              // Deseleccionar: quitar la última entrada de este cromo
              for (let i = selected.length - 1; i >= 0; i--) {
                if (selected[i].countryId === countryId && selected[i].slotIndex === slotIndex) {
                  selected.splice(i, 1);
                  break;
                }
              }
            } else {
              selected.push({ countryId, slotIndex, stickerUrl: slot.stickerUrl, name: slot.name || '' });
            }
            // Actualizar estado visual de todas las copias de este cromo
            const newSel = selected.filter(s => s.countryId === countryId && s.slotIndex === slotIndex).length;
            overlay.querySelectorAll(`[data-sticker="${stickerKey}"]`).forEach((c, i) => {
              c.classList.toggle('gr-card--selected', i < newSel);
            });
            updateCountryBadge(country.id);
            refreshFooter();
          });

          row.appendChild(card);
        }
      });

      container.appendChild(block);
    });

    selected.forEach(s => updateCountryBadge(s.countryId));
  }

  function updateCountryBadge(countryId) {
    const n = selected.filter(s => s.countryId === countryId).length;
    const badge = overlay.querySelector(`#sel-${countryId}`);
    if (!badge) return;
    if (n > 0) {
      badge.textContent = `${n} ✓`;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }

  function refreshFooter() {
    const btn = overlay.querySelector('#gr-btn-generate');
    const n   = selected.length;
    btn.disabled    = n === 0;
    btn.textContent = n === 0
      ? 'Selecciona al menos 1 cromo'
      : `Generar QR (${n} cromo${n !== 1 ? 's' : ''})`;
  }

  function showStep(name) {
    overlay.querySelectorAll('.gr-step').forEach(s => s.classList.remove('active'));
    overlay.querySelector(`#gr-step-${name}`).classList.add('active');
    curStep = name;
  }

  // Render inicial
  buildGroups();

  // Buscador
  overlay.querySelector('#gr-search').addEventListener('input', e => {
    buildGroups(e.target.value);
  });

  // ── Generar QR ──────────────────────────────────────────────────────────
  overlay.querySelector('#gr-btn-generate').addEventListener('click', () => {
    const phone = getSavedPhone();
    const name  = getSavedName();

    if (!phone) {
      // Pedir teléfono antes de continuar
      showPhoneModal({
        onDone: (n, p) => doGenerateQr(n, p),
        onCancel: () => {},
      });
    } else {
      doGenerateQr(name, phone);
    }
  });

  async function doGenerateQr(name, phone) {
    const btn = overlay.querySelector('#gr-btn-generate');
    btn.disabled    = true;
    btn.textContent = 'Generando…';

    try {
      const stickers  = selected.map(s => ({ countryId: s.countryId, slotIndex: s.slotIndex }));
      const res       = await transferService.create(stickers, { phone, name });
      if (res.error) throw new Error(res.error);

      const receiveUrl = getReceiveUrl(res.id);
      overlay.querySelector('#gr-qr-img').src =
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(receiveUrl)}`;

      overlay.querySelector('#gr-preview').innerHTML =
        selected.map(s => `<img src="${s.stickerUrl}" alt="${s.name}">`).join('');

      showStep('qr');
      startPolling(res.id);

      overlay.querySelector('#gr-btn-wa').addEventListener('click', async () => {
        const text = `🎁 ¡Te regalo cromos para el álbum! Ábrelo aquí:\n${receiveUrl}`;
        if (navigator.share) {
          try { await navigator.share({ title: '🎁 Regalo de cromos', text, url: receiveUrl }); } catch {}
        } else {
          try {
            await navigator.clipboard.writeText(text);
            const b = overlay.querySelector('#gr-btn-wa');
            b.textContent = '✓ Enlace copiado';
            setTimeout(() => { b.textContent = '📲 Compartir enlace'; }, 2000);
          } catch {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
          }
        }
      });
    } catch (err) {
      btn.disabled    = false;
      btn.textContent = '❌ Error. Reintentar';
    }
  }

  // ── Polling ──────────────────────────────────────────────────────────────
  function startPolling(transferId) {
    pollTimer = setInterval(async () => {
      try {
        const res = await transferService.status(transferId);
        if (res.status === 'accepted') { clearInterval(pollTimer); onAccepted(); }
      } catch {}
    }, 3000);
  }

  function onAccepted() {
    selected.forEach(s => collectionStore.removeDuplicate(s.countryId, s.slotIndex));

    const { oldTotal, newTotal } = incrementGifted(selected.length);
    const rewardCount = Math.floor(newTotal / REWARD_EVERY) - Math.floor(oldTotal / REWARD_EVERY);

    showStep('success');

    if (rewardCount > 0) {
      const totalPacks = rewardCount * REWARD_PACKS;
      overlay.querySelector('#gr-reward').textContent = `🎁 ¡Ganaste ${totalPacks} sobre${totalPacks !== 1 ? 's' : ''} de regalo!`;
      overlay.querySelector('#gr-reward').style.display = 'block';
      overlay.querySelector('#gr-success-sub').textContent = `Los cromos ya están con tu amigo. ¡Abre tus sobres!`;
      setTimeout(() => {
        let rem = totalPacks;
        function openNext() { if (rem-- > 0) openPackModal({ onClose: openNext }); }
        openNext();
      }, 900);
    }
  }

  // ── Cancelar / volver ───────────────────────────────────────────────────
  overlay.querySelector('#gr-btn-cancel').addEventListener('click', () => {
    clearInterval(pollTimer);
    showStep('select');
  });

  overlay.querySelector('#gr-btn-close').addEventListener('click', close);

  overlay.querySelector('#gr-back').addEventListener('click', () => {
    if (curStep === 'qr') { clearInterval(pollTimer); showStep('select'); }
    else close();
  });

  function close() {
    clearInterval(pollTimer);
    trayObserver.disconnect();
    overlay.remove();
    document.querySelector('.st-tray')?.classList.remove('st-tray--hidden');
    router.navigate('/');
  }

  function attachPanToClose() {
    const header = overlay.querySelector('.gr-header');
    if (!header) return;
    let startY = 0, isPanning = false;
    header.addEventListener('touchstart', e => { startY = e.touches[0].clientY; isPanning = true; }, { passive: true });
    header.addEventListener('touchmove', e => {
      if (!isPanning) return;
      if (e.touches[0].clientY - startY > 80) { isPanning = false; close(); }
    }, { passive: true });
    header.addEventListener('touchend', () => { isPanning = false; });
  }

  document.body.appendChild(overlay);
  attachPanToClose();
  return overlay;
}
