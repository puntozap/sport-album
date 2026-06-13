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

      // Stickers ya poseídos (colección O bandeja pendiente) van a repetidas
      const pendingKeys = new Set(
        collectionStore.getPendingPack().map(s => `${s.countryId}:${s.slotIndex}`)
      );
      const newStickers = [];
      let dupCount = 0;
      stickers.forEach(({ countryId, slotIndex }) => {
        const inCollection = collectionStore.has(countryId, slotIndex);
        const inTray       = pendingKeys.has(`${countryId}:${slotIndex}`);
        if (inCollection || inTray) {
          collectionStore.addDuplicate(countryId, slotIndex);
          dupCount++;
        } else {
          newStickers.push({ countryId, slotIndex });
        }
      });

      if (newStickers.length > 0) collectionStore.savePendingPack(newStickers);

      const parts = [];
      if (newStickers.length > 0) parts.push(`${newStickers.length} nuevo${newStickers.length !== 1 ? 's' : ''} en tu bandeja`);
      if (dupCount > 0)           parts.push(`${dupCount} añadido${dupCount !== 1 ? 's' : ''} a tus repetidas`);

      overlay.innerHTML = `
        <div class="rv-header">
          <div class="rv-title">✅ ¡Cromos recibidos!</div>
          <div class="rv-subtitle">${parts.join(' · ')}</div>
        </div>
        <div class="rv-footer">
          <button class="rv-btn" id="rv-done">Ir al álbum</button>
        </div>
      `;
      overlay.querySelector('#rv-done').addEventListener('click', () => {
        overlay.remove();
        window._skipNextCurtain = true;
        router.navigate('/');
        setTimeout(() => refreshStickerTray(), 80);
      });
    } catch {
      btn.disabled    = false;
      btn.textContent = '❌ Error. Reintentar';
    }
  });
}

function goHome() {
  document.querySelector('.rv-overlay')?.remove();
  window._skipNextCurtain = true;
  router.navigate('/');
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
  overlay.querySelector('#rv-go-home').addEventListener('click', goHome);
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
  overlay.querySelector('#rv-go-home2').addEventListener('click', goHome);
}
