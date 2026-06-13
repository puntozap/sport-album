import '../styles/sticker-trade.css';
import jsQR from 'jsqr';
import { parseScanUrl, giveStickerUrl } from '../data/TradeEncoder.js';
import { collectionStore } from '../data/collectionStore.js';
import { transferService } from '../data/transferService.js';
import { countries } from '../data/countries.js';
import { isEmpresaMode, getEmpresaEntities } from '../data/albumContext.js';
import { getLang } from '../i18n.js';
import { initStickerReveal } from './StickerReveal.js';
import { refreshStickerTray } from './StickerTray.js';
import { router } from '../router.js';
import { REMOTE } from '../config/remote.js';

async function sendWhatsApp(number, message, urlMedia) {
  const body = { message, number: String(number).replace(/\D/g, '') };
  if (urlMedia) body.urlMedia = urlMedia;
  const res = await fetch(REMOTE.whatsappApiUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('wa error');
}

function getEntities() {
  return isEmpresaMode() ? getEmpresaEntities() : countries;
}

function findCountry(countryId) {
  return getEntities().find(c => c.id === countryId) || null;
}

// ─── Estado del escáner ──────────────────────────────────────────────────────
let stream = null;
let rafId  = null;

function stopCamera() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

// ─── Pantalla: cámara escaneando ─────────────────────────────────────────────
function buildScannerView(overlay, onDetected) {
  const es = getLang() === 'es';

  overlay.innerHTML = `
    <div class="sc-wrap">
      <button class="sc-close" aria-label="${es ? 'Cerrar' : 'Close'}">✕</button>
      <div class="sc-title">${es ? 'Escanear QR de cromo' : 'Scan sticker QR'}</div>

      <div class="sc-viewfinder">
        <video class="sc-video" autoplay playsinline webkit-playsinline muted></video>
        <canvas class="sc-canvas" style="display:none"></canvas>
        <div class="sc-corner sc-corner--tl"></div>
        <div class="sc-corner sc-corner--tr"></div>
        <div class="sc-corner sc-corner--bl"></div>
        <div class="sc-corner sc-corner--br"></div>
        <div class="sc-scan-line"></div>
      </div>

      <p class="sc-hint">
        ${es
          ? 'Apunta al QR que muestra tu amigo'
          : 'Point at the QR your friend is showing'}
      </p>
      <div class="sc-status" id="sc-status"></div>
    </div>
  `;

  const video  = overlay.querySelector('.sc-video');
  const canvas = overlay.querySelector('.sc-canvas');
  const status = overlay.querySelector('#sc-status');
  const ctx    = canvas.getContext('2d', { willReadFrequently: true });

  // iOS Safari requiere que el video esté "adjunto" al DOM antes de llamar play()
  // y necesita interacción previa del usuario (ya la hay: el botón que abrió el escáner)
  async function startCamera() {
    // Intentar primero con cámara trasera (mejor para escanear)
    const constraints = [
      { video: { facingMode: { exact: 'environment' } }, audio: false },
      { video: { facingMode: 'environment' }, audio: false },
      { video: true, audio: false }  // fallback: cualquier cámara disponible
    ];

    let lastError = null;
    for (const c of constraints) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(c);
        stream = s;
        video.srcObject = s;
        // iOS Safari: play() debe ser explícito después de asignar srcObject
        await video.play();
        tick();
        return;
      } catch (err) {
        lastError = err;
        if (err.name === 'NotAllowedError') break; // permiso denegado, no reintentar
      }
    }

    // Mostrar error apropiado
    if (lastError?.name === 'NotAllowedError') {
      status.innerHTML = es
        ? '❌ Permiso de cámara denegado.<br><small>Ve a Ajustes → Safari → Cámara</small>'
        : '❌ Camera permission denied.<br><small>Go to Settings → Safari → Camera</small>';
    } else {
      status.textContent = es
        ? '❌ No se pudo acceder a la cámara'
        : '❌ Could not access the camera';
    }
  }

  startCamera();

  function tick() {
    // Esperar a que el video tenga dimensiones reales
    if (!video.videoWidth || !video.videoHeight) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      // getImageData puede fallar si el video todavía no tiene frames válidos
      rafId = requestAnimationFrame(tick);
      return;
    }

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code?.data) {
      const tradeData = parseScanUrl(code.data);
      if (tradeData) {
        stopCamera();
        onDetected(tradeData);
        return;
      }
      // Detectar QR de transferencia masiva: /#/receive/<id>
      const transferMatch = code.data.match(/\/receive\/([^?#\s]+)/);
      if (transferMatch) {
        stopCamera();
        onDetected({ action: 'transfer', transferId: transferMatch[1] });
        return;
      }
    }
    rafId = requestAnimationFrame(tick);
  }
}

// ─── Pantalla: Usuario B tiene repetido → Dar ────────────────────────────────
function buildHasDupeView(overlay, { countryId, slotIndex }, onGive, onBack) {
  const es      = getLang() === 'es';
  const country = findCountry(countryId);
  const slot    = country?.slots?.find(s => s.number === slotIndex);
  const imgSrc  = slot?.stickerUrl || '';
  const label   = `${country?.code || countryId} ${slotIndex}`;
  const name    = slot?.name?.replace(/\n/g, ' ') || '';
  const dupeCount = collectionStore.getDuplicateCount(countryId, slotIndex);

  overlay.innerHTML = `
    <div class="sc-result-wrap">
      <button class="sc-close" aria-label="Cerrar">✕</button>

      <div class="sc-result-badge sc-result-badge--yes">
        🎉 ${es ? '¡Tienes este repetido!' : 'You have a duplicate!'}
      </div>

      ${imgSrc ? `<img class="sc-result-sticker sc-result-sticker--enter" src="${imgSrc}" alt="${label}">` : ''}

      <div class="sc-result-info">
        <span class="sc-result-code">${label}</span>
        ${name ? `<span class="sc-result-name">${name}</span>` : ''}
        <span class="sc-result-dupes">
          ${es ? `Tienes ${dupeCount} repetida${dupeCount !== 1 ? 's' : ''}` : `You have ${dupeCount} duplicate${dupeCount !== 1 ? 's' : ''}`}
        </span>
      </div>

      <button class="sc-give-btn" id="sc-give-btn">
        🎁 ${es ? 'Mostrar QR de regalo' : 'Show gift QR'}
      </button>
      <button class="sc-share-give-btn" id="sc-share-give-btn">
        📤 ${es ? 'Compartir enlace de regalo' : 'Share gift link'}
      </button>
      <button class="sc-back-btn" id="sc-back-btn">
        ← ${es ? 'Volver a escanear' : 'Scan again'}
      </button>
    </div>
  `;

  overlay.querySelector('#sc-give-btn').addEventListener('click', onGive);
  overlay.querySelector('#sc-back-btn').addEventListener('click', onBack);

  overlay.querySelector('#sc-share-give-btn').addEventListener('click', async () => {
    const giveUrl        = giveStickerUrl(countryId, slotIndex);
    const rawImg         = slot?.stickerUrl || null;
    const absoluteImgUrl = rawImg
      ? (rawImg.startsWith('http') ? rawImg : window.location.origin + rawImg)
      : null;
    const shareMsg = es ? `🎁 ¡Toma este cromo!\n${giveUrl}` : `🎁 Here's your sticker!\n${giveUrl}`;
    const btn = overlay.querySelector('#sc-share-give-btn');

    collectionStore.removeDuplicate(countryId, slotIndex);

    // ── Versión 1: API WhatsApp — pasa URL de imagen al servidor ─────────────
    if (REMOTE.whatsappApiUrl) {
      const number = window.prompt(es ? 'Número WhatsApp (con código de país, sin +):' : 'WhatsApp number (country code, no +):');
      if (!number) return;
      btn.textContent = es ? 'Enviando…' : 'Sending…';
      try {
        await sendWhatsApp(number, shareMsg, absoluteImgUrl);
        btn.textContent = es ? '✓ ¡Enviado!' : '✓ Sent!';
      } catch {
        btn.textContent = es ? '❌ Error' : '❌ Error';
      }
      setTimeout(() => { btn.textContent = `📤 ${es ? 'Compartir enlace de regalo' : 'Share gift link'}`; }, 2500);
      return;
    }

    // ── Versión 2: Web Share API — adjunta imagen como archivo ───────────────
    if (navigator.share) {
      if (absoluteImgUrl && navigator.canShare) {
        try {
          const res  = await fetch(absoluteImgUrl);
          const blob = await res.blob();
          const file = new File([blob], `cromo-${label}.png`, { type: blob.type || 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: es ? '🎁 Te doy este cromo' : '🎁 Sticker gift', text: shareMsg, files: [file] });
            return;
          }
        } catch {}
      }
      try { await navigator.share({ title: es ? '🎁 Te doy este cromo' : '🎁 Sticker gift', text: shareMsg }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareMsg);
        btn.textContent = es ? '✓ ¡Enlace copiado!' : '✓ Link copied!';
        setTimeout(() => { btn.textContent = `📤 ${es ? 'Compartir enlace de regalo' : 'Share gift link'}`; }, 2200);
      } catch {
        window.prompt(es ? 'Copia este enlace:' : 'Copy this link:', giveUrl);
      }
    }
  });
}

// ─── Pantalla: Usuario B NO tiene ese cromo repetido ────────────────────────
function buildNoDupeView(overlay, { countryId, slotIndex }, onBack) {
  const es      = getLang() === 'es';
  const country = findCountry(countryId);
  const slot    = country?.slots?.find(s => s.number === slotIndex);
  const imgSrc  = slot?.stickerUrl || '';
  const label   = `${country?.code || countryId} ${slotIndex}`;
  const name    = slot?.name?.replace(/\n/g, ' ') || '';
  const hasSticker = collectionStore.has(countryId, slotIndex);

  overlay.innerHTML = `
    <div class="sc-result-wrap">
      <button class="sc-close" aria-label="Cerrar">✕</button>

      <div class="sc-result-badge sc-result-badge--no">
        😔 ${es ? 'No tienes este repetido' : "You don't have a duplicate"}
      </div>

      ${imgSrc ? `<img class="sc-result-sticker" src="${imgSrc}" alt="${label}" style="opacity:.45;filter:grayscale(60%)">` : ''}

      <div class="sc-result-info">
        <span class="sc-result-code">${label}</span>
        ${name ? `<span class="sc-result-name">${name}</span>` : ''}
        <span class="sc-result-dupes" style="color:rgba(255,255,255,.45)">
          ${hasSticker
            ? (es ? 'Solo tienes una copia (en tu álbum)' : 'You only have one copy (in your album)')
            : (es ? 'No lo tienes en tu álbum' : "You don't have it in your album")}
        </span>
      </div>

      <button class="sc-back-btn" id="sc-back-btn">
        ← ${es ? 'Volver a escanear' : 'Scan again'}
      </button>
    </div>
  `;

  overlay.querySelector('#sc-back-btn').addEventListener('click', onBack);
}

// ─── Pantalla: QR de regalo generado (Usuario B lo muestra a Usuario A) ─────
function buildGiveQrView(overlay, { countryId, slotIndex }, onClose) {
  const es      = getLang() === 'es';
  const country = findCountry(countryId);
  const slot    = country?.slots?.find(s => s.number === slotIndex);
  const label   = `${country?.code || countryId} ${slotIndex}`;
  const name    = slot?.name?.replace(/\n/g, ' ') || '';
  const giveUrl = giveStickerUrl(countryId, slotIndex);
  const qrSrc   = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(giveUrl)}`;

  // Descontar el duplicado
  collectionStore.removeDuplicate(countryId, slotIndex);

  overlay.innerHTML = `
    <div class="sc-giveqr-wrap">
      <div class="sc-giveqr-badge">
        🎁 ${es ? '¡Dale este QR a tu amigo!' : 'Show this QR to your friend!'}
      </div>

      <div class="sc-giveqr-info">
        <span class="sc-result-code">${label}</span>
        ${name ? `<span class="sc-result-name">${name}</span>` : ''}
      </div>

      <div class="sc-giveqr-box">
        <div class="sc-spinner-wrap"><div class="srm-spinner"></div></div>
        <img class="sc-giveqr-img" src="${qrSrc}" alt="QR regalo" style="display:none">
      </div>

      <p class="sc-giveqr-hint">
        ${es
          ? 'Que tu amigo escanee este QR con la app para recibir el cromo'
          : 'Have your friend scan this QR with the app to receive the sticker'}
      </p>

      <button class="sc-close-btn" id="sc-close-btn">
        ✓ ${es ? 'Listo' : 'Done'}
      </button>
    </div>
  `;

  const img = overlay.querySelector('.sc-giveqr-img');
  const spinWrap = overlay.querySelector('.sc-spinner-wrap');
  img.onload = () => { spinWrap.style.display = 'none'; img.style.display = 'block'; };

  overlay.querySelector('#sc-close-btn').addEventListener('click', onClose);
}

// ─── Pantalla: recibir regalo — usa el StickerReveal completo ────────────────
function buildReceiveView(overlay, { countryId, slotIndex }, onClose) {
  const es      = getLang() === 'es';
  const country = findCountry(countryId);
  const slot    = country?.slots?.find(s => s.number === slotIndex);

  const result = collectionStore.receiveGift(countryId, slotIndex);
  const isNew  = result === 'new';

  // Cerrar el overlay del scanner limpiamente primero
  stopCamera();
  overlay.classList.remove('sc-active');

  setTimeout(() => {
    overlay.remove();

    if (!slot?.stickerUrl) {
      // Sin imagen → feedback simple
      onClose();
      return;
    }

    const reveal = initStickerReveal();

    reveal.show({
      stickerUrl:  slot.stickerUrl,
      countryName: country?.name || countryId,
      countryCode: country?.code || countryId.toUpperCase(),
      flag:        country?.federation?.flag || null,
      playerName:  slot.name?.replace(/\n/g, ' ') || '',
      slotNumber:  slotIndex,
      isGold:      slot.type === 'gold',
      onCardClick: (closeReveal) => {
        window._skipNextCurtain = true;
        closeReveal();
        onClose();
        router.navigate('/' + countryId, { force: true });
        // Aplicar efecto snap-in al slot ya pegado
        requestAnimationFrame(() => {
          const slotEl = document.querySelector(
            `[data-country-id="${countryId}"][data-slot-index="${slotIndex}"]`
          );
          const img = slotEl?.querySelector('.slot-sticker');
          if (img) {
            img.classList.add('st-placed-img');
            img.addEventListener('animationend', () => img.classList.remove('st-placed-img'), { once: true });
          }
        });
      }
    });
  }, 280);
}

// ─── Pantalla: recibir transferencia masiva vía QR ───────────────────────────
function buildReceiveTransferView(overlay, transferId, onClose) {
  const es         = getLang() === 'es';
  const entityMap  = {};
  getEntities().forEach(c => { entityMap[c.id] = c; });

  overlay.innerHTML = `
    <div class="sc-result-wrap">
      <button class="sc-close" aria-label="Cerrar">✕</button>
      <div class="sc-result-badge sc-result-badge--yes" id="sc-tr-badge">
        🎁 ${es ? 'Cargando regalo…' : 'Loading gift…'}
      </div>
      <div class="sc-transfer-loader" id="sc-tr-loader">
        <div class="srm-spinner"></div>
      </div>
      <div class="sc-transfer-body" id="sc-tr-body" style="display:none"></div>
    </div>
  `;

  overlay.querySelector('.sc-close').addEventListener('click', onClose);

  transferService.status(transferId)
    .then(res => {
      const loader = overlay.querySelector('#sc-tr-loader');
      const badge  = overlay.querySelector('#sc-tr-badge');
      const body   = overlay.querySelector('#sc-tr-body');
      loader.style.display = 'none';

      if (res.error || !res.stickers?.length) {
        badge.className = 'sc-result-badge sc-result-badge--no';
        badge.textContent = `❌ ${es ? 'Código no válido o ya expirado' : 'Invalid or expired code'}`;
        return;
      }
      if (res.status === 'accepted') {
        badge.className = 'sc-result-badge sc-result-badge--no';
        badge.textContent = `✅ ${es ? 'Este regalo ya fue reclamado' : 'This gift was already claimed'}`;
        return;
      }

      const stickers = res.stickers;
      const n = stickers.length;
      badge.textContent = `🎁 ${es ? `¡${n} cromo${n !== 1 ? 's' : ''} para ti!` : `${n} sticker${n !== 1 ? 's' : ''} for you!`}`;

      const thumbsHtml = stickers.map(({ countryId, slotIndex }) => {
        const country = entityMap[countryId];
        const slot    = country?.slots?.find(s => s.number === slotIndex);
        return slot?.stickerUrl
          ? `<img src="${slot.stickerUrl}" class="sc-transfer-thumb" alt="${country?.code} ${slotIndex}">`
          : `<div class="sc-transfer-placeholder">${countryId}<br>${slotIndex}</div>`;
      }).join('');

      body.innerHTML = `
        <div class="sc-transfer-thumbs">${thumbsHtml}</div>
        <button class="sc-give-btn" id="sc-tr-accept">
          ✅ ${es ? 'Aceptar y pegar en álbum' : 'Accept & add to album'}
        </button>
      `;
      body.style.display = 'flex';

      body.querySelector('#sc-tr-accept').addEventListener('click', async () => {
        const btn = body.querySelector('#sc-tr-accept');
        btn.disabled    = true;
        btn.textContent = es ? 'Guardando…' : 'Saving…';
        try {
          const r = await transferService.accept(transferId);
          if (r.error) throw new Error(r.error);

          collectionStore.savePendingPack(stickers);
          onClose();
          window._skipNextCurtain = true;
          router.navigate('/');
          setTimeout(() => refreshStickerTray(), 80);
        } catch {
          btn.disabled    = false;
          btn.textContent = `❌ ${es ? 'Error. Reintentar' : 'Error. Retry'}`;
        }
      });
    })
    .catch(() => {
      const loader = overlay.querySelector('#sc-tr-loader');
      loader.innerHTML = `<span style="color:#f87171;font-size:13px">❌ ${es ? 'Error de conexión' : 'Connection error'}</span>`;
    });
}

// ─── Entrada pública ─────────────────────────────────────────────────────────
export function openStickerScanner(initialData = null) {
  const es = getLang() === 'es';

  const overlay = document.createElement('div');
  overlay.className = 'sc-overlay';
  overlay.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  overlay.addEventListener('touchend',   e => e.stopPropagation(), { passive: true });
  overlay.addEventListener('touchmove',  e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
  overlay.addEventListener('pointerdown', e => e.stopPropagation());

  function close() {
    stopCamera();
    overlay.classList.remove('sc-active');
    setTimeout(() => overlay.remove(), 300);
  }

  function handleDetected(tradeData) {
    if (tradeData.action === 'need') {
      // Usuario B: comprueba si tiene ese cromo repetido
      const hasDupe = collectionStore.getDuplicateCount(tradeData.countryId, tradeData.slotIndex) > 0;
      if (hasDupe) {
        buildHasDupeView(overlay, tradeData,
          /* onGive  */ () => buildGiveQrView(overlay, tradeData, () => { close(); router.navigate('/'); }),
          /* onBack  */ () => { buildScannerView(overlay, handleDetected); overlay.querySelector('.sc-close')?.addEventListener('click', close); }
        );
      } else {
        buildNoDupeView(overlay, tradeData,
          /* onBack  */ () => { buildScannerView(overlay, handleDetected); overlay.querySelector('.sc-close')?.addEventListener('click', close); }
        );
      }
    } else if (tradeData.action === 'give') {
      // Usuario A: recibe el cromo (individual, con reveal holográfico)
      buildReceiveView(overlay, tradeData, close);
    } else if (tradeData.action === 'transfer') {
      // Transferencia masiva: recibir sin reveal, añadir a pendientes
      buildReceiveTransferView(overlay, tradeData.transferId, close);
    }
    // Añadir cierre en todas las vistas resultado
    overlay.querySelector('.sc-close')?.addEventListener('click', close);
  }

  if (initialData) {
    // Entrada directa desde URL (ScanPage)
    handleDetected(initialData);
  } else {
    buildScannerView(overlay, handleDetected);
    overlay.querySelector('.sc-close')?.addEventListener('click', close);
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('sc-active')));

  return { close };
}
