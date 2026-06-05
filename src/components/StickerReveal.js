/**
 * Efecto "Boleto Dorado" al tocar un cromo.
 * Muestra el cromo grande con animaciones mágicas doradas.
 */

import { CLIENT, clientLogoHtml, stampStyle } from '../config/client.js';
import { isEmpresaMode } from '../data/albumContext.js';

const PARTICLE_COUNT = 60;
const REVEAL_DURATION = 800;

export function initStickerReveal() {
  let currentOverlay = null;
  
  function createParticles(container, color) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = document.createElement('div');
      p.className = 'sticker-particle';
      const startX = 50 + (Math.random() - 0.5) * 60;
      const startY = 50 + (Math.random() - 0.5) * 60;
      p.style.left = `${startX}%`;
      p.style.top = `${startY}%`;
      p.style.animationDelay = `${Math.random() * 2}s`;
      p.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      p.style.background = color || '#f1d66a';
      // Tamaños variados para más dinamismo
      const size = 2 + Math.random() * 4;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      // Dirección aleatoria usando una animación CSS inline única
      const tx = (Math.random() - 0.5) * 300;
      const ty = -100 - Math.random() * 300;
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);
      container.appendChild(p);
    }
  }
  
  function createShineLines(container) {
    for (let i = 0; i < 8; i++) {
      const line = document.createElement('div');
      line.className = 'sticker-shine-line';
      line.style.transform = `rotate(${i * 45}deg)`;
      line.style.animationDelay = `${i * 0.1}s`;
      container.appendChild(line);
    }
  }
  
  // actions: [{ label, style, onClick(close) }]
  function show({ stickerUrl, countryName, countryCode, flag, playerName, slotNumber, isGold, actions }) {
    if (currentOverlay) close();

    const overlay = document.createElement('div');
    overlay.className = 'sticker-reveal-overlay';

    const accentColor = isGold ? '#f1d66a' : '#c0c0c0';
    const glowColor = isGold ? 'rgba(241, 214, 106, 0.4)' : 'rgba(192, 192, 192, 0.3)';

    overlay.innerHTML = `
      <div class="sticker-reveal-backdrop"></div>
      <div class="sticker-reveal-content">
        <div class="sticker-reveal-glow" style="background: radial-gradient(circle, ${glowColor} 0%, transparent 70%)"></div>
        <div class="sticker-reveal-particles"></div>
        <div class="sticker-reveal-shine"></div>

        <div class="sticker-reveal-header">
          <div class="sticker-reveal-flag">
            ${isEmpresaMode() && CLIENT.logoUrl
              ? `<img src="${CLIENT.logoUrl}" alt="${countryName}" style="object-fit:contain;background:transparent">`
              : `<img src="https://flagcdn.com/w160/${flag}.png" alt="${countryName}">`
            }
          </div>
          <div class="sticker-reveal-country">
            <span class="sticker-reveal-we" style="color: ${accentColor}">${isEmpresaMode() ? 'EQUIPO' : 'WE ARE'}</span>
            <span class="sticker-reveal-name">${countryName.toUpperCase()}</span>
          </div>
          <div class="sticker-reveal-code">${countryCode}</div>
        </div>

        <div class="sticker-reveal-card-container">
          <div class="sticker-reveal-card" style="box-shadow: 0 0 60px ${glowColor}, 0 20px 40px rgba(0,0,0,0.4)">
            <div class="sticker-reveal-card-inner">
              <img src="${stickerUrl}" alt="${playerName || countryName}">
              <div class="sticker-reveal-card-shine"></div>
            </div>
            ${CLIENT.active ? `
            <div class="sticker-client-stamp" style="${stampStyle()}">
              ${clientLogoHtml({ imgClass: 'sticker-client-stamp-img', textClass: 'sticker-client-stamp-name', heightPx: CLIENT.stamp?.logoHeight })}
            </div>` : ''}
          </div>
        </div>

        <div class="sticker-reveal-player">
          <span class="sticker-reveal-number" style="color: ${accentColor}">#${slotNumber}</span>
          <span class="sticker-reveal-player-name">${playerName || ''}</span>
        </div>

        <div class="sticker-reveal-special ${isGold ? 'gold' : ''}">
          ${isGold ? '✦ CROMO ESPECIAL ✦' : '✦ CROMO COLECCIONABLE ✦'}
        </div>

        ${actions?.length ? '<div class="sticker-reveal-actions"></div>' : ''}

        <button class="sticker-reveal-close">✕</button>
      </div>
    `;

    // Botones de acción opcionales
    if (actions?.length) {
      const actionsEl = overlay.querySelector('.sticker-reveal-actions');
      actions.forEach(({ label, style, onClick }) => {
        const btn = document.createElement('button');
        btn.className = 'sticker-reveal-action-btn';
        if (style) btn.setAttribute('data-style', style);
        btn.textContent = label;
        btn.addEventListener('click', () => onClick(close));
        actionsEl.appendChild(btn);
      });
    }

    // Crear partículas y líneas de brillo
    createParticles(overlay.querySelector('.sticker-reveal-particles'), accentColor);
    createShineLines(overlay.querySelector('.sticker-reveal-shine'));

    // Cerrar al hacer click en backdrop o botón
    overlay.querySelector('.sticker-reveal-backdrop').addEventListener('click', close);
    overlay.querySelector('.sticker-reveal-close').addEventListener('click', close);

    document.body.appendChild(overlay);
    currentOverlay = overlay;

    // Forzar reflow para animación
    overlay.offsetHeight;
    overlay.classList.add('sticker-reveal-active');

    // ── Efecto tilt 3D ──────────────────────────────────────────────
    const card = overlay.querySelector('.sticker-reveal-card');
    const shine = overlay.querySelector('.sticker-reveal-card-shine');
    let tiltRAF = null;

    function applyTilt(clientX, clientY) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Normalizar posición: -1 (borde izquierdo/top) a +1 (borde derecho/bottom)
      const dx = (clientX / vw - 0.5) * 2;
      const dy = (clientY / vh - 0.5) * 2;

      const rotateY =  dx * 22;   // inclinación horizontal
      const rotateX = -dy * 15;   // inclinación vertical (invertida)

      card.style.transform =
        `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

      // Brillo holográfico que sigue el mouse
      if (shine) {
        const sx = ((dx + 1) / 2 * 100).toFixed(1);
        const sy = ((dy + 1) / 2 * 100).toFixed(1);
        shine.style.background =
          `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 40%, transparent 65%)`;
        shine.style.backgroundSize = '';
        shine.style.animation = 'none';
      }
    }

    function onMouseMove(e) {
      cancelAnimationFrame(tiltRAF);
      tiltRAF = requestAnimationFrame(() => applyTilt(e.clientX, e.clientY));
    }

    function onMouseLeave() {
      cancelAnimationFrame(tiltRAF);
      // Volver al centro suavemente
      card.style.transition = 'transform 0.5s ease-out';
      card.style.transform = 'rotateX(0deg) rotateY(0deg)';
      if (shine) {
        shine.style.background = '';
        shine.style.animation = '';
      }
    }

    function onTouchMove(e) {
      // Bloquear pan del álbum mientras el modal está abierto
      e.stopPropagation();
      const t = e.touches[0];
      if (!t) return;
      cancelAnimationFrame(tiltRAF);
      tiltRAF = requestAnimationFrame(() => applyTilt(t.clientX, t.clientY));
    }

    // Bloquear eventos táctiles para que no lleguen al PageSwipe
    overlay.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    overlay.addEventListener('touchend',   e => e.stopPropagation(), { passive: true });
    overlay.addEventListener('touchmove',  onTouchMove, { passive: true });

    // Activar tilt después de que termina la animación de entrada
    card.addEventListener('animationend', () => {
      // Fijar el transform actual e ignorar la animación fill-mode
      card.style.transform = 'rotateX(0deg) rotateY(0deg)';
      card.style.animation = 'none';
      card.style.transition = 'transform 0.12s ease-out';

      overlay.addEventListener('mousemove', onMouseMove);
      overlay.addEventListener('mouseleave', onMouseLeave);
    }, { once: true });
  }
  
  function close() {
    if (!currentOverlay) return;
    currentOverlay.classList.remove('sticker-reveal-active');
    currentOverlay.classList.add('sticker-reveal-closing');
    setTimeout(() => {
      currentOverlay?.remove();
      currentOverlay = null;
    }, 400);
  }
  
  return { show, close };
}
