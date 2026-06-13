import { collectionStore } from '../data/collectionStore.js';
import { countries } from '../data/countries.js';
import { getLang } from '../i18n.js';
import { buildThemeFromAlbumColors, applyTheme } from '../data/themes.js';
import { AlbumPage } from './AlbumPage.js';
import { AlbumBookBackground } from './AlbumBookBackground.js';
import { PageHeader } from './PageHeader.js';
import { SlotGrid } from './SlotGrid.js';
import { GroupBox } from './GroupBox.js';
import { SlotDecorBackground } from './SlotDecorBackground.js';

// Page dimensions matching og-image format: 1200×630px
// In mm at 96dpi: 1200px = 317.5mm, 630px = 166.7mm
const PDF_W = 1200;
const PDF_H = 630;
const PDF_MM_W = 317.5;
const PDF_MM_H = 166.7;
// px → mm scale (same for X and Y since both axes are square-pixel equivalent)
const PDF_S = PDF_MM_W / PDF_W; // 0.2646 mm/px

// ── About page action buttons ─────────────────────────────────────────────────
const ABOUT_BTNS = [
  { icon:'🌐', label:'Album',    url:'https://album.figurita.lat',                                                                   c1:'#6633cc', c2:'#00a9bd' },
  { icon:'💬', label:'WhatsApp', url:'https://wa.me/584247647893?text=Hola%2C+vi+tu+%C3%A1lbum+del+Mundial+2026+%F0%9F%8F%86',      c1:'#25d366', c2:'#128c7e' },
  { icon:'📧', label:'Email',    url:'mailto:joseivanzapatar@gmail.com',                                                            c1:'#c8102e', c2:'#6633cc' },
  { icon:'💼', label:'LinkedIn', url:'https://linkedin.com/in/puntozap/',                                                           c1:'#0077b5', c2:'#004182' },
];
const ABOUT_BTN_W = 120, ABOUT_BTN_H = 40, ABOUT_BTN_GAP = 14;
const ABOUT_BTN_TOTAL_W = ABOUT_BTNS.length * ABOUT_BTN_W + (ABOUT_BTNS.length - 1) * ABOUT_BTN_GAP;
const ABOUT_BTN_LX = 44, ABOUT_BTN_LW = Math.round(PDF_W * 0.55); // 660
const ABOUT_BTN_START_X = Math.round(ABOUT_BTN_LX + (ABOUT_BTN_LW - 20 - ABOUT_BTN_TOTAL_W) / 2); // 103
const ABOUT_BTN_Y = 450;

// ── CTA page QR config ────────────────────────────────────────────────────────
const CTA_QR_SIZE = 240;
const CTA_QR_X = 752;
const CTA_QR_Y = Math.round((PDF_H - CTA_QR_SIZE) / 2) - 20; // 175

// ── CDN loaders ───────────────────────────────────────────────────────────────

async function loadScript(url) {
  if (document.querySelector(`script[src="${url}"]`)) {
    await new Promise(r => setTimeout(r, 80));
    return;
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function getJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  return window.jspdf.jsPDF;
}

async function getHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  return window.html2canvas;
}

async function makeQRDataUrl(url, size) {
  if (!window.QRCode) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');
  }
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;visibility:hidden;top:0;left:0';
  document.body.appendChild(wrap);
  return new Promise(resolve => {
    new window.QRCode(wrap, {
      text: url, width: size, height: size,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel?.M ?? 1
    });
    setTimeout(() => {
      const canvas = wrap.querySelector('canvas');
      resolve(canvas ? canvas.toDataURL('image/png') : null);
      wrap.remove();
    }, 200);
  });
}

// ── Wait for all images in a container to load ───────────────────────────────

function waitForImages(container) {
  const imgs = [...container.querySelectorAll('img')];
  if (!imgs.length) return Promise.resolve();
  return Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(res => {
      img.addEventListener('load',  res, { once: true });
      img.addEventListener('error', res, { once: true });
    });
  }));
}

// ── Blurred sticker mosaic background ────────────────────────────────────────

async function buildBlurBg(country) {
  const c = document.createElement('canvas');
  c.width = PDF_W; c.height = PDF_H;
  const ctx = c.getContext('2d');

  // Base: solid dark color using country primary
  const col1 = country.colors?.primary   || '#0d1a2e';
  const col2 = country.colors?.secondary || '#1a0d2e';
  ctx.fillStyle = col1;
  ctx.fillRect(0, 0, PDF_W, PDF_H);

  // Sticker URLs — every defined slot (not just collected)
  const urls = country.slots.map(s => s.stickerUrl).filter(Boolean).slice(0, 16);

  if (urls.length) {
    const loadImg = url => new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => res(img);
      img.onerror = () => res(null);
      img.src = url;
    });
    const imgs = (await Promise.all(urls.map(loadImg))).filter(Boolean);

    if (imgs.length) {
      // Draw stickers tiled — blur via ctx.filter
      const TW = 130, TH = 175;
      const cols = Math.ceil(PDF_W / TW) + 3;
      const rows = Math.ceil(PDF_H / TH) + 3;

      ctx.save();
      ctx.filter = 'blur(10px)';
      ctx.globalAlpha = 0.75;
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const img = imgs[(r * cols + col) % imgs.length];
          // Stagger rows for visual interest
          const x = col * TW - TW * 0.8 + (r % 2) * (TW * 0.55);
          const y = r * TH - TH * 0.5;
          ctx.save();
          ctx.translate(x + TW / 2, y + TH / 2);
          ctx.rotate(((r + col) % 7 - 3) * 0.06);
          ctx.drawImage(img, -TW / 2, -TH / 2, TW, TH);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  // Gradient overlay: country color (semi-transparent) → dark center
  const radial = ctx.createRadialGradient(PDF_W / 2, PDF_H / 2, 0, PDF_W / 2, PDF_H / 2, PDF_W * 0.65);
  radial.addColorStop(0,   'rgba(0,0,0,0.28)');
  radial.addColorStop(0.7, 'rgba(0,0,0,0.10)');
  radial.addColorStop(1,   'rgba(0,0,0,0.55)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, PDF_W, PDF_H);

  // Subtle country-color tint (use canvas globalAlpha to avoid hex-concat issues)
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = col2;
  ctx.fillRect(0, 0, PDF_W, PDF_H);
  ctx.restore();

  return c.toDataURL('image/jpeg', 0.90);
}

// Album natural aspect ratio: 1629 × 907.
// Fit inside PDF at 600px tall → width = 600 * (1629/907) ≈ 1079px
// Centered → left margin ≈ 60px, top/bottom ≈ 15px — blurred bg is visible as frame.
const ALBUM_RENDER_H = 600;
const ALBUM_RENDER_W = Math.round(ALBUM_RENDER_H * (1629 / 907)); // ≈ 1079

// CSS injected into the cloned doc to fix rendering issues
const PDF_CLONE_STYLE = `
  /* Kill 3D flip — html2canvas can't render preserve-3d / backface-visibility */
  .slot-flip-back        { display: none !important; }
  .slot-flip-inner       { transform-style: flat !important; transform: none !important; transition: none !important; }
  .slot-flip-wrapper     { perspective: none !important; }
  .slot-flip-front       { backface-visibility: visible !important; position: absolute !important; inset: 0 !important; }

  /* Remove all UI chrome */
  .country-nav, .fa-panel, .sticker-tray,
  .cp-mobile-btn-row, .cp-mobile-pack-btn,
  .cp-mobile-scan-btn, .cp-mobile-music-btn,
  .fa-toggle-btn, .fa-overlay, #pdf-progress-overlay { display: none !important; }

  /* Center album-shell with explicit pixels — html2canvas does NOT support transform:translate */
  .album-shell {
    position: absolute !important;
    top: ${Math.round((PDF_H - ALBUM_RENDER_H) / 2)}px !important;
    left: ${Math.round((PDF_W - ALBUM_RENDER_W) / 2)}px !important;
    transform: none !important;
    width: ${ALBUM_RENDER_W}px !important;
    height: ${ALBUM_RENDER_H}px !important;
    min-width: unset !important; max-width: unset !important;
    background: transparent !important;
    box-shadow: 0 8px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25) !important;
    border-radius: 4px !important;
  }
  /* Album page fills the shell exactly */
  .album-page {
    width: ${ALBUM_RENDER_W}px !important;
    height: ${ALBUM_RENDER_H}px !important;
    aspect-ratio: unset !important;
  }

  /* Freeze animations */
  *, *::before, *::after { animation: none !important; transition: none !important; }
`;

// ── Render a single country page in an off-screen container ──────────────────

async function renderCountryPage(country, html2canvas) {
  const theme = buildThemeFromAlbumColors(country.colors);

  // Pre-generate the blurred sticker mosaic background
  const bgUrl = await buildBlurBg(country);

  // Wrap: hidden at (0,0) in the viewport — onclone will make it visible.
  // We do NOT use left:-9999px because html2canvas would then capture x=0 of the
  // main document instead of the wrap. visibility:hidden keeps it out of sight
  // while still triggering layout / image loads.
  const wrap = document.createElement('div');
  wrap.id = 'pdf-render-wrap';
  wrap.style.cssText = [
    'position:fixed',
    'top:0', 'left:0',
    `width:${PDF_W}px`, `height:${PDF_H}px`,
    'overflow:hidden',
    'visibility:hidden',
    'z-index:-9999',
    'pointer-events:none',
  ].join(';');

  applyTheme(wrap, theme);

  // ── Page content (CountryPage minus nav / actions) ─────────────────────────
  const frag = document.createDocumentFragment();
  frag.appendChild(AlbumBookBackground());
  frag.appendChild(PageHeader({ countryName: country.name, federation: country.federation }));

  const decorLeft = document.createElement('div');
  decorLeft.className = 'slot-decor-left';
  decorLeft.appendChild(SlotDecorBackground({ color: 'var(--decoration-color, #f5a3b7)' }));
  frag.appendChild(decorLeft);

  const visibleSlots = country.slots.map(slot => ({
    ...slot,
    stickerUrl: collectionStore.has(country.id, slot.number) ? slot.stickerUrl : null,
  }));
  frag.appendChild(SlotGrid({
    countryCode: country.code, countryId: country.id,
    slots: visibleSlots, countryName: country.name,
    flag: country.federation?.flag || null,
    onStickerClick: () => {}, onMissingClick: () => {},
  }));

  frag.appendChild(GroupBox({ group: country.group }));

  wrap.appendChild(AlbumPage({ backgroundUrl: null, children: frag }));
  document.body.appendChild(wrap);

  await waitForImages(wrap);
  await new Promise(r => setTimeout(r, 300));

  let dataUrl = null;
  try {
    const canvas = await html2canvas(wrap, {
      useCORS:         true,
      allowTaint:      false,
      scale:           1,
      width:           PDF_W,
      height:          PDF_H,
      windowWidth:     PDF_W,
      windowHeight:    PDF_H,
      logging:         false,
      backgroundColor: null,

      onclone: (clonedDoc, clonedWrap) => {
        // 1. Remove every other body child so no main-app elements bleed in
        [...clonedDoc.body.children].forEach(ch => { if (ch !== clonedWrap) ch.remove(); });

        // 2. Make wrap visible and set blurred mosaic background
        clonedWrap.style.cssText = [
          'position:fixed', 'top:0', 'left:0',
          `width:${PDF_W}px`, `height:${PDF_H}px`,
          'overflow:hidden', 'visibility:visible', 'z-index:1',
          `background-image:url("${bgUrl}")`,
          'background-size:cover', 'background-position:center',
        ].join(';');
        // Re-apply theme variables (cssText wipe cleared them)
        applyTheme(clonedWrap, theme);

        // 3. Fix CSS: center album-shell, kill 3D transforms, hide UI chrome
        const s = clonedDoc.createElement('style');
        s.textContent = PDF_CLONE_STYLE;
        clonedDoc.head.appendChild(s);

        // 4. Rebuild album-book-bg from scratch using exact preview(3).html structure.
        //    html2canvas does not reliably resolve CSS vars in SVG fill attributes,
        //    nor does it apply stylesheet-only transforms to SVG elements.
        //    Strategy: replace innerHTML with hardcoded colors + pre-mirrored SVG paths.
        const bookBg = clonedDoc.querySelector('.album-book-bg');
        if (bookBg) {
          // Pixel values for ALBUM_RENDER_W × ALBUM_RENDER_H (1079 × 600)
          const hdrH    = Math.round(ALBUM_RENDER_H * 0.14);               // 84px  header height
          const gapL    = Math.round(ALBUM_RENDER_W * 0.05);               // 54px  left gap
          const stripW  = Math.round(ALBUM_RENDER_W * 0.08);               // 86px  green strip
          const overlap = Math.round(ALBUM_RENDER_W * 0.02);               // 22px  red overlap
          const redL    = Math.round(ALBUM_RENDER_W * 0.24);               // 259px red left
          const rightR  = stripW - overlap;                                 // 64px  right-side gap

          // Right dark-green path is the vertical-flip of the original.
          // Original: M 0 0 C 52 0, 94 42, 100 100 L 0 100 Z
          // After rotate(180°) scaleX(-1) → (x,y)→(x,100-y):
          //   M 0 100 C 52 100, 94 58, 100 0 L 0 0 Z
          const bgH = theme.bookDarkGreen;
          const bgR = theme.bookRed;
          const bgP = theme.bookPink;
          const bgG = theme.bookLightGreen;

          const bgCSS = clonedDoc.createElement('style');
          bgCSS.textContent = `
            .pdfbg-pl,.pdfbg-pr{position:absolute;top:0;bottom:0;width:50%;background:#fff;z-index:1}
            .pdfbg-pl{left:0}.pdfbg-pr{right:0}
            .pdfbg-pink{position:absolute;top:${hdrH}px;right:0;bottom:0;width:50%;background:${bgP};z-index:2}
            .pdfbg-dgl{position:absolute;top:${hdrH}px;left:${gapL}px;right:50%;bottom:0;z-index:3;overflow:hidden}
            .pdfbg-dgr{position:absolute;top:${hdrH}px;left:50%;right:${rightR}px;bottom:0;z-index:3;overflow:hidden}
            .pdfbg-dgl svg,.pdfbg-dgr svg{display:block;width:100%;height:100%}
            .pdfbg-gs{position:absolute;top:0;right:0;width:${stripW}px;height:${hdrH}px;background:${bgG};z-index:5}
            .pdfbg-rh{position:absolute;top:0;left:${redL}px;right:${rightR}px;height:${hdrH}px;z-index:10;overflow:visible}
            .pdfbg-rh svg{display:block;width:100%;height:100%}
            .pdfbg-sp{position:absolute;top:0;left:calc(50% - 1px);width:2px;height:100%;background:rgba(0,0,0,.08);z-index:20}
          `;
          clonedDoc.head.appendChild(bgCSS);

          bookBg.innerHTML = `
            <div class="pdfbg-pl"></div>
            <div class="pdfbg-pr"></div>
            <div class="pdfbg-pink"></div>
            <div class="pdfbg-dgl">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 0 100 C 6 42, 48 0, 100 0 L 100 100 Z" fill="${bgH}"/>
              </svg>
            </div>
            <div class="pdfbg-dgr">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 0 100 C 52 100, 94 58, 100 0 L 0 0 Z" fill="${bgH}"/>
              </svg>
            </div>
            <div class="pdfbg-gs"></div>
            <div class="pdfbg-rh">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 0 0 H 97 Q 99 35,100 100 H 34 C 10 100,0 58,0 0 Z" fill="${bgR}"/>
              </svg>
            </div>
            <div class="pdfbg-sp"></div>
          `;
        }
      },
    });
    dataUrl = canvas.toDataURL('image/jpeg', 0.93);
  } finally {
    wrap.remove();
  }
  return dataUrl;
}

// ── Load OG image as base64 ───────────────────────────────────────────────────

async function loadOgImage(path) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 1200;
      c.height = img.naturalHeight || 630;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(null);
    img.src = path + '?_t=' + Date.now();
  });
}

// ── Canvas helpers for text-only pages ───────────────────────────────────────

function mk() {
  const c = document.createElement('canvas');
  c.width = PDF_W; c.height = PDF_H;
  return c;
}

function rr(ctx, x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function darkBg(ctx) {
  const g = ctx.createLinearGradient(0,0,PDF_W,PDF_H);
  g.addColorStop(0,'#060b14'); g.addColorStop(.5,'#0d1425'); g.addColorStop(1,'#0a0618');
  ctx.fillStyle = g; ctx.fillRect(0,0,PDF_W,PDF_H);
}

function stripes(ctx) {
  const cols = ['#f5a3b7','#c8102e','#f07800','#6633cc','#00843d','#00a9bd','#d4af37','#ec4899'];
  const sw = PDF_W / cols.length;
  cols.forEach((c,i) => { ctx.fillStyle=c; ctx.fillRect(i*sw,0,sw,16); });
  [...cols].reverse().forEach((c,i) => { ctx.fillStyle=c; ctx.fillRect(i*sw,PDF_H-16,sw,16); });
}

// ── Dedication page ───────────────────────────────────────────────────────────

async function drawDedication() {
  const c = mk(); const ctx = c.getContext('2d');
  darkBg(ctx); stripes(ctx);

  ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
  for(let x=0;x<PDF_W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,PDF_H);ctx.stroke();}
  for(let y=0;y<PDF_H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(PDF_W,y);ctx.stroke();}

  const glow=ctx.createRadialGradient(PDF_W/2,PDF_H/2,0,PDF_W/2,PDF_H/2,400);
  glow.addColorStop(0,'rgba(102,51,204,.18)'); glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow; ctx.fillRect(0,0,PDF_W,PDF_H);

  ctx.textAlign='center';
  ctx.fillStyle='rgba(212,175,55,0.7)'; ctx.font='bold 13px Arial,sans-serif';
  ctx.fillText('✦ DEDICATORIA ✦', PDF_W/2, 88);
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(PDF_W/2-200,98,400,1);

  const lines=[
    {t:'A cada persona que alguna vez buscó una figurita y no la encontró.',f:'18px Arial',c:'rgba(255,255,255,.78)'},
    {t:'A cada padre que no pudo comprarle el álbum a su hijo.',f:'18px Arial',c:'rgba(255,255,255,.78)'},
    {t:'A cada abuelo que recortó un cromo de un periódico porque era lo que había.',f:'18px Arial',c:'rgba(255,255,255,.72)'},
    {sp:14},
    {t:'—',f:'20px Arial',c:'rgba(212,175,55,.4)'},
    {sp:14},
    {t:'La tecnología más poderosa no es la que hace las cosas más rápido.',f:'italic 19px Georgia,serif',c:'rgba(255,255,255,.82)'},
    {t:'Es la que acerca a las personas.',f:'italic 19px Georgia,serif',c:'#d4af37'},
    {sp:14},
    {t:'Este álbum fue escrito en código,',f:'18px Arial',c:'rgba(255,255,255,.7)'},
    {t:'pero construido con algo más difícil de compilar:',f:'18px Arial',c:'rgba(255,255,255,.7)'},
    {t:'el deseo de que nadie se quede afuera.',f:'bold 20px Arial',c:'#ffffff'},
    {sp:14},
    {t:'En un mundo donde los algoritmos nos separan,',f:'18px Arial',c:'rgba(255,255,255,.65)'},
    {t:'elegí escribir uno que nos une.',f:'bold 20px Arial',c:'#00a9bd'},
  ];
  let ty=134;
  for(const l of lines){
    if(l.sp){ty+=l.sp;continue;}
    ctx.fillStyle=l.c; ctx.font=l.f; ctx.fillText(l.t,PDF_W/2,ty); ty+=28;
  }
  ty+=12;
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(PDF_W/2-120,ty,240,1); ty+=22;
  ctx.fillStyle='rgba(212,175,55,.9)'; ctx.font='italic bold 22px Georgia,serif';
  ctx.fillText('— Jose Ivan Zapata',PDF_W/2,ty); ty+=28;
  ctx.fillStyle='rgba(255,255,255,.35)'; ctx.font='13px monospace';
  ctx.fillText('git commit -m "built with love for everyone" 🌍',PDF_W/2,ty);

  ctx.textAlign='left'; ctx.fillStyle='rgba(0,169,189,.2)'; ctx.font='11px monospace';
  ['if (canAfford === false) {','  album.open(); // still free','}'].forEach((l,i)=>ctx.fillText(l,40,PDF_H-60+i*16));
  ctx.textAlign='right';
  ['const love = Infinity;','const price = 0;','export { love, price };'].forEach((l,i)=>ctx.fillText(l,PDF_W-40,PDF_H-60+i*16));

  return c.toDataURL('image/jpeg',.93);
}

// ── About page ────────────────────────────────────────────────────────────────

async function drawAbout() {
  const c = mk(); const ctx = c.getContext('2d');
  darkBg(ctx); stripes(ctx);

  const bg = ctx.createLinearGradient(0,0,0,PDF_H);
  bg.addColorStop(0,'#6633cc'); bg.addColorStop(.5,'#c8102e'); bg.addColorStop(1,'#00a9bd');
  ctx.fillStyle=bg; ctx.fillRect(0,16,6,PDF_H-32);

  const lx=44, lw=PDF_W*0.55;
  ctx.fillStyle='#d4af37'; ctx.font='bold 12px Arial'; ctx.textAlign='left';
  ctx.fillText('¿QUIÉN CONSTRUYÓ ESTO?',lx,62);
  ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(lx,70,lw-20,1.5);
  ctx.fillStyle='#ffffff'; ctx.font='bold 38px Arial'; ctx.fillText('Jose Ivan Zapata',lx,118);
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='16px Arial';
  ctx.fillText('Desarrollador de Software · Venezuela 🇻🇪',lx,144);

  const story=[
    {t:'Empecé este proyecto sin un objetivo de negocios.',c:'rgba(255,255,255,.82)'},
    {t:'Tenía una imagen en la mente: familias sin álbum.',c:'rgba(255,255,255,.82)'},
    {sp:10},
    {t:'Creo que la tecnología tiene el poder de cambiar vidas,',c:'rgba(255,255,255,.75)'},
    {t:'no solo las de quienes pueden pagarla.',c:'rgba(255,255,255,.75)'},
    {sp:10},
    {t:'576 CROMOS · 48 SELECCIONES · 100% GRATIS',c:'#d4af37',b:true},
    {sp:10},
    {t:'Hecho con Inteligencia Artificial, diseño moderno y',c:'rgba(255,255,255,.7)'},
    {t:'muchas noches de código. Para que la emoción del',c:'rgba(255,255,255,.7)'},
    {t:'Mundial llegue a todas las familias del mundo.',c:'rgba(255,255,255,.7)'},
    {sp:10},
    {t:'Porque ese momento de buscar el último cromo... ❤️',c:'rgba(255,255,255,.65)'},
  ];
  let ty=174;
  story.forEach(l=>{
    if(l.sp){ty+=l.sp;return;}
    ctx.fillStyle=l.c; ctx.font=l.b?'bold 16px Arial':'16px Arial';
    ctx.fillText(l.t,lx,ty); ty+=23;
  });

  const rx=PDF_W*0.6, ry=44, rw=PDF_W*0.37;
  rr(ctx,rx,ry,rw,PDF_H-70,16); ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fill();
  rr(ctx,rx,ry,rw,PDF_H-70,16); ctx.strokeStyle='rgba(212,175,55,.2)'; ctx.lineWidth=1.5; ctx.stroke();

  const cx2=rx+rw/2;
  ctx.textAlign='center'; ctx.font='44px serif'; ctx.fillText('💻',cx2,ry+68);
  ctx.fillStyle='#d4af37'; ctx.font='bold 14px Arial';
  ctx.fillText('¿TIENES UNA IDEA DE SOFTWARE?',cx2,ry+104);
  ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(rx+20,ry+114,rw-40,1);

  let cty=ry+146;
  [['Construyo apps, plataformas y sistemas',false,'rgba(255,255,255,.65)'],
   ['a medida — con IA, diseño y propósito.',false,'rgba(255,255,255,.65)'],
   ['',null],
   ['Si puedes imaginarlo,',true,'#ffffff'],
   ['yo puedo programarlo.',true,'#d4af37'],
  ].forEach(([text,bold,color])=>{
    if(!text){cty+=10;return;}
    ctx.fillStyle=color; ctx.font=bold?'bold 18px Arial':'15px Arial';
    ctx.fillText(text,cx2,cty); cty+=24;
  });

  cty+=14;
  [['📧','joseivanzapatar@gmail.com'],
   ['💬','+58 424 764 7893'],
   ['💼','linkedin.com/in/puntozap/'],
   ['📱','@figurita.lat (Instagram)'],
  ].forEach(([icon,text])=>{
    rr(ctx,rx+16,cty-18,rw-32,32,7); ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fill();
    ctx.textAlign='left'; ctx.font='14px serif'; ctx.fillStyle='rgba(255,255,255,.9)';
    ctx.fillText(icon,rx+26,cty+1);
    ctx.font='13px monospace'; ctx.fillStyle='rgba(255,255,255,.8)';
    ctx.fillText(text,rx+52,cty+1); cty+=38;
  });

  const gb=ctx.createLinearGradient(rx+20,0,rx+rw-20,0);
  gb.addColorStop(0,'#6633cc'); gb.addColorStop(1,'#00a9bd');
  rr(ctx,rx+20,PDF_H-104,rw-40,42,10); ctx.fillStyle=gb; ctx.fill();
  ctx.textAlign='center'; ctx.fillStyle='#ffffff'; ctx.font='bold 15px Arial';
  ctx.fillText('¡Escríbeme y hagamos algo increíble!',cx2,PDF_H-104+27);

  return c.toDataURL('image/jpeg',.93);
}

// ── CTA page with QR ─────────────────────────────────────────────────────────

async function drawCTA(qrDataUrl) {
  const c = mk(); const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, PDF_W, PDF_H);

  // Diagonal subtle stripes
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
  for (let i = -PDF_H; i < PDF_W + PDF_H; i += 28) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + PDF_H, PDF_H); ctx.stroke();
  }

  // Radial glow behind QR
  const glow = ctx.createRadialGradient(870, PDF_H/2, 0, 870, PDF_H/2, 340);
  glow.addColorStop(0, 'rgba(102,51,204,0.38)');
  glow.addColorStop(0.5, 'rgba(0,169,189,0.14)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, PDF_W, PDF_H);

  // Left accent strip
  const strip = ctx.createLinearGradient(0, 0, 0, PDF_H);
  strip.addColorStop(0, '#6633cc'); strip.addColorStop(0.5, '#c8102e'); strip.addColorStop(1, '#d4af37');
  ctx.fillStyle = strip; ctx.fillRect(0, 0, 5, PDF_H);

  // Scattered stars
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  [[72,78],[148,195],[318,44],[418,372],[248,498],[488,142],[178,415],[38,530],[560,85],[30,300]].forEach(([x,y]) => {
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
  });

  // ── LEFT COLUMN ───────────────────────────────────────────────────────────
  const lx = 60;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#d4af37'; ctx.font = 'bold 13px Arial';
  ctx.fillText('🌍  MUNDIAL 2026  ·  FIGURITA.LAT', lx, 68);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(lx, 78, 520, 1.5);

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 68px Arial';
  ctx.fillText('¡TU ÁLBUM', lx, 160);
  const hg = ctx.createLinearGradient(lx, 0, lx + 420, 0);
  hg.addColorStop(0, '#d4af37'); hg.addColorStop(1, '#f5d76e');
  ctx.fillStyle = hg; ctx.font = 'bold 68px Arial';
  ctx.fillText('TE ESPERA!', lx, 232);

  const sg = ctx.createLinearGradient(lx, 0, lx + 300, 0);
  sg.addColorStop(0, '#6633cc'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.fillRect(lx, 250, 300, 3);

  const bullets = [
    ['🏆', '576 figuritas · 48 selecciones'],
    ['✨', 'Colecciona. Intercambia. Completa.'],
    ['🎮', 'Juega gratis desde tu celular'],
    ['❤️', 'Para toda la familia · 100% gratis'],
    ['🌟', 'La emoción del Mundial en tu pantalla'],
  ];
  let by = 290;
  bullets.forEach(([icon, text]) => {
    ctx.font = '18px serif'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(icon, lx, by);
    ctx.font = '16px Arial'; ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fillText(text, lx + 34, by);
    by += 34;
  });

  ctx.fillStyle = 'rgba(212,175,55,.5)'; ctx.font = 'italic 13px Georgia,serif';
  ctx.fillText('«Porque esa emoción del último cromo...  ❤️»', lx, PDF_H - 46);

  // ── RIGHT COLUMN: QR ──────────────────────────────────────────────────────
  const qrBorderPad = 12;
  const qrBorderGrad = ctx.createLinearGradient(
    CTA_QR_X - qrBorderPad, CTA_QR_Y - qrBorderPad,
    CTA_QR_X + CTA_QR_SIZE + qrBorderPad, CTA_QR_Y + CTA_QR_SIZE + qrBorderPad
  );
  qrBorderGrad.addColorStop(0, '#d4af37');
  qrBorderGrad.addColorStop(0.5, '#6633cc');
  qrBorderGrad.addColorStop(1, '#00a9bd');
  rr(ctx, CTA_QR_X - qrBorderPad, CTA_QR_Y - qrBorderPad, CTA_QR_SIZE + qrBorderPad*2, CTA_QR_SIZE + qrBorderPad*2, 10);
  ctx.fillStyle = qrBorderGrad; ctx.fill();

  rr(ctx, CTA_QR_X - 5, CTA_QR_Y - 5, CTA_QR_SIZE + 10, CTA_QR_SIZE + 10, 5);
  ctx.fillStyle = '#ffffff'; ctx.fill();

  if (qrDataUrl) {
    const qrImg = await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img); img.onerror = rej;
      img.src = qrDataUrl;
    });
    ctx.drawImage(qrImg, CTA_QR_X, CTA_QR_Y, CTA_QR_SIZE, CTA_QR_SIZE);
  } else {
    ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.font = 'bold 13px Arial';
    ctx.fillText('album.figurita.lat', CTA_QR_X + CTA_QR_SIZE/2, CTA_QR_Y + CTA_QR_SIZE/2);
  }

  const cx = CTA_QR_X + CTA_QR_SIZE / 2;
  ctx.textAlign = 'center';
  const dg = ctx.createLinearGradient(CTA_QR_X, 0, CTA_QR_X + CTA_QR_SIZE, 0);
  dg.addColorStop(0, '#d4af37'); dg.addColorStop(1, '#f5d76e');
  ctx.fillStyle = dg; ctx.font = 'bold 22px Arial';
  ctx.fillText('album.figurita.lat', cx, CTA_QR_Y + CTA_QR_SIZE + 44);

  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '13px Arial';
  ctx.fillText('📱 Escanea con tu cámara para jugar gratis', cx, CTA_QR_Y + CTA_QR_SIZE + 66);

  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.font = '11px monospace';
  ctx.fillText('Abre la cámara  ·  Apunta al código  ·  ¡Disfruta!', cx, CTA_QR_Y + CTA_QR_SIZE + 86);

  return c.toDataURL('image/jpeg', .93);
}

// ── Progress overlay ──────────────────────────────────────────────────────────

function showProgress(msg, pct, sub) {
  let el = document.getElementById('pdf-progress-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pdf-progress-overlay';
    el.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(6,11,20,0.97);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:16px;font-family:Arial,sans-serif;color:#fff;
    `;
    el.innerHTML = `
      <div style="font-size:52px">📄</div>
      <div id="pdf-prog-text" style="font-size:18px;font-weight:bold;color:#d4af37"></div>
      <div style="width:320px;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">
        <div id="pdf-prog-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#6633cc,#00a9bd);border-radius:4px;transition:width .3s ease"></div>
      </div>
      <div id="pdf-prog-sub" style="font-size:13px;color:rgba(255,255,255,0.4)"></div>
    `;
    document.body.appendChild(el);
  }
  document.getElementById('pdf-prog-text').textContent = msg;
  if (pct !== undefined) document.getElementById('pdf-prog-bar').style.width = `${pct}%`;
  if (sub !== undefined) document.getElementById('pdf-prog-sub').textContent = sub;
}

function hideProgress() {
  document.getElementById('pdf-progress-overlay')?.remove();
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function downloadAlbumPdf() {
  showProgress('Cargando librerías…', 2, '');
  try {
    const [JsPDF, html2canvas] = await Promise.all([getJsPDF(), getHtml2Canvas()]);

    // Custom page size matching og-image proportions (1200×630px)
    const pdf = new JsPDF({ orientation: 'landscape', unit: 'mm', format: [PDF_MM_H, PDF_MM_W] });

    // Page 1 — Portada (og-image-1.jpg)
    showProgress('Portada…', 4, 'og-image-1.jpg');
    const cover = await loadOgImage('/assets/og-image-1.jpg');
    if (cover) pdf.addImage(cover, 'JPEG', 0, 0, PDF_MM_W, PDF_MM_H);

    // Page 2 — Celebración (og-image-7.jpg)
    showProgress('Página de celebración…', 7, 'og-image-7.jpg');
    const og7 = await loadOgImage('/assets/og-image-7.jpg');
    if (og7) { pdf.addPage(); pdf.addImage(og7, 'JPEG', 0, 0, PDF_MM_W, PDF_MM_H); }

    // Page 3 — Dedicatoria
    showProgress('Escribiendo dedicatoria…', 10, '');
    const dedication = await drawDedication();
    pdf.addPage();
    pdf.addImage(dedication, 'JPEG', 0, 0, PDF_MM_W, PDF_MM_H);

    // Page 4 — CTA con QR
    showProgress('Generando código QR…', 11, '');
    const qrDataUrl = await makeQRDataUrl('https://album.figurita.lat', CTA_QR_SIZE);
    const cta = await drawCTA(qrDataUrl);
    pdf.addPage();
    pdf.addImage(cta, 'JPEG', 0, 0, PDF_MM_W, PDF_MM_H);
    pdf.link(CTA_QR_X * PDF_S, CTA_QR_Y * PDF_S, CTA_QR_SIZE * PDF_S, CTA_QR_SIZE * PDF_S, { url: 'https://album.figurita.lat' });

    // Pages 5…52 — Country pages (rendered via actual app components)
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      const pct = 12 + Math.round(((i + 1) / countries.length) * 82);
      showProgress(
        `${country.name}`,
        pct,
        `${i + 1} de ${countries.length} selecciones`
      );
      // Yield to browser between pages
      await new Promise(r => setTimeout(r, 10));

      const pageData = await renderCountryPage(country, html2canvas);
      if (pageData) {
        pdf.addPage();
        pdf.addImage(pageData, 'JPEG', 0, 0, PDF_MM_W, PDF_MM_H);
      }
    }

    // Last page — Sobre el autor
    showProgress('Sobre el autor…', 98, '');
    const about = await drawAbout();
    pdf.addPage();
    pdf.addImage(about, 'JPEG', 0, 0, PDF_MM_W, PDF_MM_H);

    showProgress('¡Listo! Descargando…', 100, '');
    const date = new Date().toISOString().slice(0, 10);
    pdf.save(`album-mundial-2026-${date}.pdf`);

  } catch (err) {
    console.error('[PDF]', err);
    alert('❌ Error al generar el PDF. Intenta de nuevo.\n\n' + (err?.message || String(err)));
  } finally {
    setTimeout(hideProgress, 1200);
  }
}
