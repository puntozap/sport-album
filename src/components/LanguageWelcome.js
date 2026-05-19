import { setLang } from '../i18n.js';
import { CLIENT, clientLogoHtml } from '../config/client.js';

export function showLanguageWelcome(onDone) {

  const footerContent = CLIENT.active
    ? `<div class="lw-footer-sponsor">
        <span class="lw-footer-label">Presentado por</span>
        ${clientLogoHtml({ imgClass: 'lw-footer-logo-img', textClass: 'lw-footer-logo-text', heightPx: CLIENT.modal?.logoHeight || 28 })}
       </div>`
    : `PANINI ALBUM`;

  const overlay = document.createElement('div');
  overlay.className = 'lw-overlay';
  overlay.innerHTML = `
    <div class="lw-stars" aria-hidden="true">
      <span class="lw-star lw-star-1">★</span>
      <span class="lw-star lw-star-2">★</span>
      <span class="lw-star lw-star-3">★</span>
      <span class="lw-star lw-star-4">★</span>
      <span class="lw-star lw-star-5">★</span>
    </div>

    <div class="lw-content">
      <div class="lw-step lw-step-trophy">🏆</div>

      <div class="lw-step lw-step-event">
        <span class="lw-event-line lw-event-top">FIFA WORLD CUP</span>
        <span class="lw-event-year">2026</span>
      </div>

      <div class="lw-step lw-step-prompt">
        <span class="lw-prompt-en">Choose your language</span>
        <span class="lw-prompt-dot">·</span>
        <span class="lw-prompt-es">Elige tu idioma</span>
      </div>

      <div class="lw-step lw-step-options">
        <button class="lw-btn" data-lang="en">
          <img class="lw-btn-flag" src="https://flagcdn.com/w80/us.png" alt="English flag">
          <span class="lw-btn-name">English</span>
          <span class="lw-btn-sub">English</span>
        </button>
        <button class="lw-btn" data-lang="es">
          <img class="lw-btn-flag" src="https://flagcdn.com/w80/es.png" alt="Bandera español">
          <span class="lw-btn-name">Español</span>
          <span class="lw-btn-sub">Spanish</span>
        </button>
      </div>
    </div>

    <div class="lw-footer" aria-hidden="true">${footerContent}</div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('lw-visible'));
  });

  overlay.querySelectorAll('.lw-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      btn.classList.add('lw-btn-selected');

      setTimeout(() => {
        overlay.classList.add('lw-exit');
        setTimeout(() => {
          setLang(lang);
          overlay.remove();
          onDone();
        }, 500);
      }, 300);
    });
  });
}
