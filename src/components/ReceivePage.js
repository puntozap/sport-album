import '../styles/give-receive.css';
import { collectionStore } from '../data/collectionStore.js';
import { countries } from '../data/countries.js';
import { isEmpresaMode, getEmpresaEntities } from '../data/albumContext.js';
import { transferService } from '../data/transferService.js';
import { router } from '../router.js';
import { refreshStickerTray } from './StickerTray.js';

export function ReceivePage({ transferId }) {
  const activeEntities = isEmpresaMode() ? getEmpresaEntities() : countries;
  const countryMap = {};
  activeEntities.forEach(c => { countryMap[c.id] = c; });

  // Ocultar sticker tray mientras estamos en receive
  function hideTray() { document.querySelector('.st-tray')?.classList.add('st-tray--hidden'); }
  hideTray();
  const trayObserver = new MutationObserver(hideTray);
  trayObserver.observe(document.body, { childList: true, subtree: true });

  const overlay = document.createElement('div');
  overlay.className = 'rv-overlay';

  overlay.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  overlay.addEventListener('touchend',   e => e.stopPropagation(), { passive: true });
  overlay.addEventListener('touchmove',  e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
  overlay.addEventListener('pointerdown', e => e.stopPropagation());

  overlay.innerHTML = `
    <div class="rv-header">
      <div class="rv-title">🎁 ¡Te quieren regalar cromos!</div>
      <div class="rv-subtitle">Cargando tu regalo…</div>
    </div>
    <div class="rv-loader">
      <div class="rv-loader-spinner"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  transferService.status(transferId)
    .then(res => {
      if (res.error || !res.stickers?.length) {
        showError(overlay, res.error || 'Código no válido o ya expirado');
        return;
      }
      if (res.status === 'accepted') {
        showAlreadyAccepted(overlay);
        return;
      }
      showStickers(overlay, transferId, res.stickers, countryMap);
    })
    .catch(() => showError(overlay, 'Error de conexión. Verifica tu internet e inténtalo de nuevo.'));

  return overlay;
}

function showStickers(overlay, transferId, stickers, countryMap) {
  const cards = stickers.map(({ countryId, slotIndex }) => {
    const country = countryMap[countryId];
    const slot    = country?.slots.find(s => s.number === slotIndex);
    if (!slot?.stickerUrl) return '';
    return `
      <div class="rv-card">
        <img src="${slot.stickerUrl}" alt="${slot.name || ''}">
        <div class="rv-card-code">${country.code} ${slotIndex}</div>
      </div>
    `;
  }).join('');

  const n = stickers.length;

  overlay.innerHTML = `
    <div class="rv-header">
      <div class="rv-title">🎁 ¡Te quieren regalar cromos!</div>
      <div class="rv-subtitle">${n} cromo${n !== 1 ? 's' : ''} para tu álbum</div>
    </div>
    <div class="rv-stickers">${cards}</div>
    <div class="rv-info">Acepta para guardarlos en tu bandeja y pegarlos al instante</div>
    <div class="rv-footer">
      <button class="rv-btn" id="rv-accept">✅ Aceptar cromos</button>
    </div>
  `;

  overlay.querySelector('#rv-accept').addEventListener('click', async () => {
    const btn = overlay.querySelector('#rv-accept');
    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    try {
      const res = await transferService.accept(transferId);
      if (res.error) throw new Error(res.error);

      collectionStore.savePendingPack(stickers);
      refreshStickerTray();
      showSuccess(overlay, stickers[0]?.countryId);
    } catch (err) {
      btn.disabled    = false;
      btn.textContent = '❌ Error. Reintentar';
    }
  });
}

function restoreTray() {
  trayObserver.disconnect();
  document.querySelector('.st-tray')?.classList.remove('st-tray--hidden');
}

function showSuccess(overlay, firstCountryId) {
  overlay.innerHTML = `
    <div class="rv-success">
      <div class="rv-success-icon">🎉</div>
      <div class="rv-success-title">¡Cromos recibidos!</div>
      <div class="rv-success-sub">Ya están en tu bandeja listos para pegar en tu álbum.</div>
    </div>
    <div class="rv-footer">
      <button class="rv-btn" id="rv-go-album">🎴 Pegar en mi álbum</button>
    </div>
  `;

  overlay.querySelector('#rv-go-album').addEventListener('click', () => {
    window.location.href = window.location.origin + '/';
  });
}

function showError(overlay, msg) {
  overlay.innerHTML = `
    <div class="rv-error">
      <div class="rv-error-icon">❌</div>
      <div class="rv-error-title">No se pudo cargar</div>
      <div class="rv-error-sub">${msg}</div>
    </div>
    <div class="rv-footer">
      <button class="rv-btn" id="rv-go-home" style="background:#132018;color:rgba(255,255,255,0.7);">Ir al álbum</button>
    </div>
  `;
  overlay.querySelector('#rv-go-home').addEventListener('click', () => {
    window.location.href = window.location.origin + '/';
  });
}

function showAlreadyAccepted(overlay) {
  overlay.innerHTML = `
    <div class="rv-error">
      <div class="rv-error-icon">✅</div>
      <div class="rv-error-title" style="color:#22c55e">Ya reclamado</div>
      <div class="rv-error-sub">Estos cromos ya fueron aceptados anteriormente. Cada código QR es de un solo uso.</div>
    </div>
    <div class="rv-footer">
      <button class="rv-btn" id="rv-go-home2" style="background:#132018;color:rgba(255,255,255,0.7);">Ir al álbum</button>
    </div>
  `;
  overlay.querySelector('#rv-go-home2').addEventListener('click', () => {
    window.location.href = window.location.origin + '/';
  });
}
