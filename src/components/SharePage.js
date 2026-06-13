import '../styles/share-page.css';
import { router, getCompanySlug } from '../router.js';
import { isEmpresaMode, getEmpresaEntities } from '../data/albumContext.js';
import { getLang } from '../i18n.js';
import { CLIENT } from '../config/client.js';
import { getSocialLinks } from '../utils/socialShare.js';

const BASE_URL = window.location.origin;

function getBaseUrl() {
  if (CLIENT.shareUrl) return CLIENT.shareUrl.replace(/\/share\/?$/, '');
  return BASE_URL;
}

// ── Generador de imagen historia para Instagram (1080×1920) ──────────────────

async function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function generateStoryImage(url, qrSrc, es) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Fondo degradado oscuro ───────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0,   '#060b14');
  bgGrad.addColorStop(0.4, '#0d1425');
  bgGrad.addColorStop(1,   '#0a0618');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Halos de color
  const halo = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  halo(W * .2,  H * .18, 600, 'rgba(102,51,204,.25)');
  halo(W * .85, H * .75, 550, 'rgba(200,16,46,.20)');
  halo(W * .5,  H * .5,  700, 'rgba(0,169,189,.12)');

  // ── Franja superior de colores ───────────────────────────────────────
  const stripeColors = ['#f5a3b7','#c8102e','#f07800','#6633cc','#00843d','#00a9bd'];
  const sw = W / stripeColors.length;
  stripeColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * sw, 0, sw, 22);
  });

  // ── Puntos decorativos flotantes ─────────────────────────────────────
  const dotColors = ['#f5a3b7','#f07800','#6633cc','#00843d','#00a9bd','#d4af37'];
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * W,
      Math.random() * H,
      3 + Math.random() * 10,
      0, Math.PI * 2
    );
    ctx.fillStyle = dotColors[i % dotColors.length] + '55';
    ctx.fill();
  }

  // ── Trofeo (emoji grande) ────────────────────────────────────────────
  ctx.font = '180px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆', W / 2, 320);

  // ── Título ───────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const titleGrad = ctx.createLinearGradient(0, 0, W, 0);
  titleGrad.addColorStop(0,    '#f5a3b7');
  titleGrad.addColorStop(0.35, '#f07800');
  titleGrad.addColorStop(0.65, '#d4af37');
  titleGrad.addColorStop(1,    '#00a9bd');
  ctx.fillStyle = titleGrad;
  ctx.font = 'bold 110px Impact, Arial Black, sans-serif';

  const line1 = es ? '¡COMPARTE' : 'SHARE WITH';
  const line2 = es ? 'CON TUS AMIGOS!' : 'YOUR FRIENDS!';
  ctx.fillText(line1, W / 2, 560);
  ctx.fillText(line2, W / 2, 680);

  // ── Subtítulo ─────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.font = '44px Arial, sans-serif';
  ctx.fillText(
    es ? 'ÁLBUM DE FIGURITAS · SIN ÁNIMO DE LUCRO' : 'STICKER ALBUM · NON-PROFIT',
    W / 2, 760
  );

  // ── Tarjeta QR ────────────────────────────────────────────────────────
  const qrImg = await loadImg(qrSrc);
  const cardW = 680, cardH = 680;
  const cardX = (W - cardW) / 2;
  const cardY = 820;
  const r = 48;

  // Sombra
  ctx.shadowColor = 'rgba(99,102,241,.5)';
  ctx.shadowBlur  = 60;

  // Fondo blanco tarjeta
  ctx.beginPath();
  ctx.moveTo(cardX + r, cardY);
  ctx.lineTo(cardX + cardW - r, cardY);
  ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + r, r);
  ctx.lineTo(cardX + cardW, cardY + cardH - r);
  ctx.arcTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH, r);
  ctx.lineTo(cardX + r, cardY + cardH);
  ctx.arcTo(cardX, cardY + cardH, cardX, cardY + cardH - r, r);
  ctx.lineTo(cardX, cardY + r);
  ctx.arcTo(cardX, cardY, cardX + r, cardY, r);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.shadowBlur = 0;

  // QR dentro de la tarjeta (con padding)
  const pad = 40;
  ctx.drawImage(qrImg, cardX + pad, cardY + pad, cardW - pad * 2, cardH - pad * 2);

  // Borde dorado
  ctx.strokeStyle = 'rgba(212,175,55,.6)';
  ctx.lineWidth   = 6;
  ctx.stroke();

  // ── URL ───────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '42px monospace';
  ctx.fillText(url, W / 2, cardY + cardH + 80);

  // ── Instrucción ───────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.font = '38px Arial, sans-serif';
  ctx.fillText(
    es ? '📸 Escanea con la cámara de tu teléfono' : '📸 Scan with your phone camera',
    W / 2, cardY + cardH + 150
  );

  // ── Franja inferior de colores ────────────────────────────────────────
  [...stripeColors].reverse().forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * sw, H - 22, sw, 22);
  });

  // ── Descargar ─────────────────────────────────────────────────────────
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href     = dataUrl;
  a.download = 'album-historia-instagram.png';
  a.click();
}

// ── Confetti dots ─────────────────────────────────────────────────────────────

const DOTS = [
  '#f5a3b7','#c8102e','#f07800','#6633cc','#00843d','#00a9bd','#d4af37','#ec4899'
];

function getShareUrl() {
  const base = getBaseUrl();
  const slug = getCompanySlug();
  if (isEmpresaMode()) {
    // Instalación dedicada (sin slug en URL): apuntar a la raíz
    if (!slug) return base;
    const entities = getEmpresaEntities();
    const first = entities[0];
    return first ? `${base}/${slug}/${first.id}` : `${base}/${slug}`;
  }
  return base;
}

function buildConfetti(container) {
  for (let i = 0; i < 28; i++) {
    const dot = document.createElement('div');
    dot.className = 'share-dot';
    const size = 6 + Math.random() * 10;
    dot.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${DOTS[Math.floor(Math.random() * DOTS.length)]};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation-duration: ${4 + Math.random() * 6}s;
      animation-delay: ${-Math.random() * 8}s;
    `;
    container.appendChild(dot);
  }
}

export function SharePage() {
  const es  = getLang() === 'es';
  const url = getShareUrl();
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&color=111111&bgcolor=ffffff&qzone=2&data=${encodeURIComponent(url)}`;

  const waText = encodeURIComponent(
    es
      ? `⚽ ¡La fiebre del Mundial 2026 llegó y este álbum es GRATIS! 🏆\n\nColecciona los 576 cromos de las 48 selecciones sin gastar nada. Lo hicimos con Inteligencia Artificial para que la emoción del Mundial llegue a todas las familias.\n\nPorque ese momento de buscar cromos con tus hijos, tu hermano o tu mejor amigo… ese momento no tiene precio. 🎴❤️\n\nÚnete y empieza a coleccionar: ${url}`
      : `⚽ World Cup 2026 fever is here — and this album is FREE! 🏆\n\nCollect all 576 stickers from 48 teams without spending a thing. Built with AI so every family can feel the World Cup magic.\n\nBecause that moment of searching for stickers with your kids, your sibling or your best friend… that moment is priceless. 🎴❤️\n\nJoin and start collecting: ${url}`
  );
  const waLink = `https://wa.me/?text=${waText}`;

  const page = document.createElement('div');
  page.className = 'share-page';
  page.id = 'share-page';

  page.innerHTML = `
    <div class="share-page-stripes"></div>
    <div class="share-page-stripes-bottom"></div>
    <div class="share-confetti" id="share-confetti"></div>

    <button class="share-back-btn">← ${es ? 'Volver' : 'Back'}</button>

    <div class="share-page-inner">
      <div class="share-trophy">🏆</div>

      <div class="share-title">${es ? '¡Comparte con\ntus amigos!' : 'Share with\nyour friends!'}</div>
      <div class="share-subtitle">${es ? 'Álbum de figuritas · Sin ánimo de lucro' : 'Sticker album · Non-profit'}</div>

      <div class="share-qr-card">
        <img class="share-qr-img" src="${qrSrc}" alt="QR Code" crossorigin="anonymous">
      </div>

      <div class="share-url-box">
        <span class="share-url-text">${url}</span>
      </div>

      <div class="share-btns">
        <a class="share-btn share-btn--whatsapp" href="${waLink}" target="_blank" rel="noopener noreferrer">
          <span>💬</span>
          <span>${es ? 'WhatsApp' : 'WhatsApp'}</span>
        </a>

        <a class="share-btn share-btn--facebook" id="share-fb-btn" href="#" target="_blank" rel="noopener noreferrer">
          <span>👥</span>
          <span>Facebook</span>
        </a>

        <a class="share-btn share-btn--linkedin" id="share-li-btn" href="#" target="_blank" rel="noopener noreferrer">
          <span>💼</span>
          <span>LinkedIn</span>
        </a>

        <a class="share-btn share-btn--twitter" id="share-tw-btn" href="#" target="_blank" rel="noopener noreferrer">
          <span>🐦</span>
          <span>Twitter / X</span>
        </a>

        <button class="share-btn share-btn--copy" id="share-copy-btn">
          <span>📋</span>
          <span>${es ? 'Copiar enlace' : 'Copy link'}</span>
        </button>

        <button class="share-btn share-btn--download" id="share-dl-btn">
          <span>📸</span>
          <span>${es ? 'Descargar historia Instagram' : 'Download Instagram Story'}</span>
        </button>

        <a class="share-btn share-btn--kit" href="/marketing-kit.html" target="_blank" rel="noopener noreferrer">
          <span>🎨</span>
          <span>${es ? 'Crear imagen de marketing' : 'Create marketing image'}</span>
        </a>
      </div>

      <div class="share-tagline">
        ${es ? 'Escanea el código con la cámara de tu teléfono' : 'Scan the code with your phone camera'}
      </div>
    </div>
  `;

  // Confetti
  buildConfetti(page.querySelector('#share-confetti'));

  // Volver
  page.querySelector('.share-back-btn').addEventListener('click', () => {
    page.remove();
    router.navigate('/');
  });

  // Links sociales
  const socialLinks = getSocialLinks();
  page.querySelector('#share-fb-btn').href = socialLinks.facebook;
  page.querySelector('#share-li-btn').href = socialLinks.linkedin;
  page.querySelector('#share-tw-btn').href = socialLinks.twitter;

  // Copiar enlace
  const copyBtn = page.querySelector('#share-copy-btn');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    copyBtn.classList.add('copied');
    const span = copyBtn.querySelectorAll('span')[1];
    const orig = span.textContent;
    span.textContent = es ? '✓ Copiado' : '✓ Copied';
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      span.textContent = orig;
    }, 2200);
  });

  // Descargar historia para Instagram
  const dlBtn = page.querySelector('#share-dl-btn');
  dlBtn.addEventListener('click', async () => {
    const span = dlBtn.querySelectorAll('span')[1];
    const orig = span.textContent;
    span.textContent = es ? 'Generando...' : 'Generating...';
    dlBtn.disabled = true;
    try {
      await generateStoryImage(url, qrSrc, es);
    } catch (e) {
      window.open(qrSrc, '_blank');
    } finally {
      span.textContent = orig;
      dlBtn.disabled = false;
    }
  });

  // Web Share API (nativo del móvil, como cualquier app)
  if (navigator.share) {
    const nativeBtn = document.createElement('button');
    nativeBtn.className = 'share-btn share-btn--copy';
    nativeBtn.style.background = 'linear-gradient(135deg,#6633cc,#00a9bd)';
    nativeBtn.style.color = '#fff';
    nativeBtn.style.boxShadow = '0 6px 24px rgba(102,51,204,.35)';
    nativeBtn.innerHTML = `<span>📤</span><span>${es ? 'Compartir...' : 'Share...'}</span>`;
    nativeBtn.addEventListener('click', () => {
      navigator.share({
        title: es ? '¡Álbum de Figuritas 2026!' : 'Sticker Album 2026!',
        text:  es ? '⚽ ¡La fiebre del Mundial 2026 llegó y este álbum es GRATIS! Colecciona 576 cromos de 48 selecciones, hecho con IA para que la emoción llegue a todas las familias. 🏆🎴' : '⚽ World Cup 2026 fever is here — FREE sticker album! Collect 576 stickers from 48 teams, built with AI for every family. 🏆🎴',
        url,
      }).catch(() => {});
    });
    page.querySelector('.share-btns').insertBefore(nativeBtn, page.querySelector('.share-btns').firstChild);
  }

  return page;
}
