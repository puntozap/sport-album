import '../styles/sticker-trade.css';
import { needStickerUrl } from '../data/TradeEncoder.js';
import { getLang } from '../i18n.js';
import { openStickerScanner } from './StickerScanner.js';
import { REMOTE } from '../config/remote.js';

async function sendWhatsApp(number, message, urlMedia) {
  const clean = number.replace(/\D/g, '');
  const body  = { message, number: clean };
  if (urlMedia) body.urlMedia = urlMedia;
  const res = await fetch(REMOTE.whatsappApiUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error('WhatsApp API error');
}

export function showStickerRequestModal({ countryId, slotIndex, name, code, type, country }) {
  const es = getLang() === 'es';
  const url = needStickerUrl(countryId, slotIndex);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(url)}`;

  const slot = country?.slots?.find(s => s.number === slotIndex);
  const playerName = slot?.name || name || '';
  const displayName = playerName.replace(/\n/g, ' ');
  const isGold = type === 'gold' || slot?.type === 'gold';
  const flagCode = country?.federation?.flag || null;

  const overlay = document.createElement('div');
  overlay.className = 'srm-overlay';

  overlay.innerHTML = `
    <div class="srm-card">
      <button class="srm-close" aria-label="${es ? 'Cerrar' : 'Close'}">✕</button>

      <div class="srm-badge ${isGold ? 'srm-badge--gold' : ''}">
        ${es ? 'Me falta este cromo' : 'I need this sticker'}
      </div>

      <div class="srm-sticker-row">
        ${flagCode ? `<img class="srm-flag" src="https://flagcdn.com/w40/${flagCode}.png" alt="">` : ''}
        <div class="srm-sticker-info">
          <span class="srm-code ${isGold ? 'srm-code--gold' : ''}">${code} ${slotIndex}</span>
          <span class="srm-name">${displayName}</span>
        </div>
      </div>

      <div class="srm-qr-wrap">
        <div class="srm-qr-loader">
          <div class="srm-spinner"></div>
        </div>
        <img class="srm-qr-img" src="${qrSrc}" alt="QR" style="display:none">
      </div>

      <p class="srm-instructions">
        📱 ${es
          ? 'Muéstrale este QR a alguien que tenga la app'
          : 'Show this QR to someone who has the app'}
      </p>

      <div class="srm-how-wrap">
        <div class="srm-how-title">
          ${es ? '¿Cómo escanea la otra persona?' : 'How does the other person scan?'}
        </div>
        <ol class="srm-how-steps">
          <li>${es
            ? 'Abre la misma web del álbum en su móvil'
            : 'Open the same album web on their phone'}
          </li>
          <li>${es
            ? 'Toca el botón de menú <strong>☰</strong> abajo a la derecha'
            : 'Tap the menu button <strong>☰</strong> bottom right'}
          </li>
          <li>${es
            ? 'Selecciona <strong>📷 Escanear QR</strong>'
            : 'Select <strong>📷 Scan QR</strong>'}
          </li>
          <li>${es
            ? 'Apunta la cámara a este QR'
            : 'Point the camera at this QR'}
          </li>
        </ol>
      </div>

      <button class="srm-share-btn" id="srm-share-btn">
        <span>📤</span>
        <span>${es ? 'Compartir enlace directo' : 'Share direct link'}</span>
      </button>

      <button class="srm-scan-btn">
        <span>📷</span>
        <span>${es ? 'Escanear su respuesta' : 'Scan their reply'}</span>
      </button>
    </div>
  `;

  const qrImg = overlay.querySelector('.srm-qr-img');
  const loader = overlay.querySelector('.srm-qr-loader');
  qrImg.onload = () => {
    loader.style.display = 'none';
    qrImg.style.display = 'block';
  };
  qrImg.onerror = () => {
    loader.innerHTML = `<span style="font-size:12px;opacity:.6">${es ? 'Error al cargar QR' : 'QR load error'}</span>`;
  };

  function close() {
    overlay.classList.remove('srm-active');
    setTimeout(() => overlay.remove(), 280);
  }

  overlay.querySelector('.srm-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });

  overlay.querySelector('#srm-share-btn').addEventListener('click', async () => {
    const shareMsg   = es ? `🎴 ¿Tienes este cromo repetido? Dámelo aquí:\n${url}` : `🎴 Got this sticker as duplicate? Give it here:\n${url}`;
    const labelEl    = overlay.querySelector('#srm-share-btn span:last-child');
    const rawImg     = slot?.stickerUrl || null;
    const absoluteImgUrl = rawImg
      ? (rawImg.startsWith('http') ? rawImg : window.location.origin + rawImg)
      : null;

    // ── Versión 1: API WhatsApp (Chanzia/n8n) — envía URL de imagen al servidor ──
    if (REMOTE.whatsappApiUrl) {
      const number = window.prompt(es ? 'Número WhatsApp (con código de país, sin +):' : 'WhatsApp number (with country code, no +):');
      if (!number) return;
      labelEl.textContent = es ? 'Enviando…' : 'Sending…';
      try {
        await sendWhatsApp(number, shareMsg, absoluteImgUrl);
        labelEl.textContent = es ? '✓ ¡Enviado!' : '✓ Sent!';
      } catch {
        labelEl.textContent = es ? '❌ Error al enviar' : '❌ Error';
      }
      setTimeout(() => { labelEl.textContent = es ? 'Compartir enlace directo' : 'Share direct link'; }, 2500);
      return;
    }

    // ── Versión 2: Web Share API — adjunta imagen como archivo (funciona en móvil) ──
    if (navigator.share) {
      if (absoluteImgUrl && navigator.canShare) {
        try {
          const res  = await fetch(absoluteImgUrl);
          const blob = await res.blob();
          const file = new File([blob], `cromo-${code}-${slotIndex}.png`, { type: blob.type || 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: `${displayName} – ${code} ${slotIndex}`, text: shareMsg, files: [file] });
            return;
          }
        } catch {}
      }
      try { await navigator.share({ title: es ? '🎴 Necesito este cromo' : '🎴 Need this sticker', text: shareMsg }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareMsg);
        labelEl.textContent = es ? '✓ ¡Enlace copiado!' : '✓ Link copied!';
        setTimeout(() => { labelEl.textContent = es ? 'Compartir enlace directo' : 'Share direct link'; }, 2200);
      } catch {
        window.prompt(es ? 'Copia este enlace:' : 'Copy this link:', url);
      }
    }
  });

  overlay.querySelector('.srm-scan-btn').addEventListener('click', () => {
    close();
    setTimeout(() => openStickerScanner(), 300);
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('srm-active')));
  return overlay;
}
