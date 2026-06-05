import { t } from '../i18n.js';
import { CLIENT, clientLogoHtml } from '../config/client.js';

let splashEl = null;
let splashBuiltActive = null;

function ensure() {
  // Reconstruir si CLIENT.active cambió (empresa cargó después del primer render)
  if (splashEl && splashBuiltActive === CLIENT.active) return splashEl;
  if (splashEl) splashEl.remove();

  const clientBlock = CLIENT.active ? `
    <div class="loading-client-section">
      <div class="loading-client-label">Presentado por</div>
      <div class="loading-client-brand" ${CLIENT.splash?.padding ? `style="padding:${CLIENT.splash.padding}"` : ''}>
        ${clientLogoHtml({ imgClass: 'loading-client-img', textClass: 'loading-client-text', heightPx: CLIENT.splash?.logoHeight })}
      </div>
      ${CLIENT.tagline ? `<div class="loading-client-tagline">${CLIENT.tagline}</div>` : ''}
    </div>` : '';

  const el = document.createElement('div');
  el.className = 'loading-splash';
  el.innerHTML = `
    <div class="loading-splash-bg"></div>
    <div class="loading-splash-content">
      <div class="loading-splash-badge" aria-hidden="true">🏆</div>
      ${clientBlock}
      <div class="loading-splash-title">${CLIENT.active ? 'ÁLBUM DE FIGURITAS EMPRESARIAL' : t('unofficial_title')}</div>
      <div class="loading-splash-sub">${CLIENT.active ? 'Creado por zempercodes.com' : t('unofficial_sub')}</div>
      ${!CLIENT.active ? `
      <div class="loading-splash-links">
        <a class="loading-splash-link" href="https://instagram.com/puntozap" target="_blank" rel="noopener noreferrer">
          <span class="loading-splash-link-label">Instagram</span>
          <span class="loading-splash-link-handle">@puntozap</span>
        </a>
        <a class="loading-splash-link" href="https://www.linkedin.com/in/puntozap" target="_blank" rel="noopener noreferrer">
          <span class="loading-splash-link-label">LinkedIn</span>
          <span class="loading-splash-link-handle">/in/puntozap</span>
        </a>
      </div>` : ''}
    </div>
  `;

  document.body.appendChild(el);
  splashEl = el;
  splashBuiltActive = CLIENT.active;
  return el;
}

export function showLoadingSplash() {
  const el = ensure();
  el.classList.add('loading-splash-active');
}

export function hideLoadingSplash() {
  if (!splashEl) return;
  splashEl.classList.remove('loading-splash-active');
}
