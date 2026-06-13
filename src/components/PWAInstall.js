import { getLang } from '../i18n.js';

let deferredPrompt = null;
let bannerEl = null;

// Capturar el evento antes de que el navegador lo consuma
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

// Si el usuario ya instaló la app, ocultar el banner
window.addEventListener('appinstalled', () => {
  hideBanner();
  deferredPrompt = null;
  sessionStorage.setItem('pwa-installed', '1');
});

function hideBanner() {
  if (!bannerEl) return;
  bannerEl.classList.remove('pwa-banner--visible');
  setTimeout(() => { bannerEl?.remove(); bannerEl = null; }, 350);
}

function showInstallBanner() {
  // No mostrar si ya fue descartado esta sesión o ya está instalado
  if (sessionStorage.getItem('pwa-dismissed')) return;
  if (sessionStorage.getItem('pwa-installed')) return;
  if (bannerEl) return;
  // No mostrar en rutas de acceso directo por URL
  const _directPath = window.location.hash + window.location.pathname;
  if (_directPath.includes('gift-creator') || _directPath.includes('/receive/')) return;

  const es = getLang() === 'es';

  bannerEl = document.createElement('div');
  bannerEl.className = 'pwa-banner';
  bannerEl.innerHTML = `
    <div class="pwa-banner__icon">🏆</div>
    <div class="pwa-banner__text">
      <strong>${es ? 'Instalar álbum' : 'Install album'}</strong>
      <span>${es ? 'Funciona sin internet' : 'Works offline'}</span>
    </div>
    <button class="pwa-banner__btn">${es ? '📲 Instalar' : '📲 Install'}</button>
    <button class="pwa-banner__close" aria-label="Cerrar">✕</button>
  `;

  bannerEl.querySelector('.pwa-banner__btn').addEventListener('click', () => triggerInstall());
  bannerEl.querySelector('.pwa-banner__close').addEventListener('click', () => {
    hideBanner();
    sessionStorage.setItem('pwa-dismissed', '1');
  });

  document.body.appendChild(bannerEl);
  // Animar entrada
  requestAnimationFrame(() => requestAnimationFrame(() => bannerEl?.classList.add('pwa-banner--visible')));
}

export async function triggerInstall() {
  if (!deferredPrompt) return false;
  hideBanner();
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (outcome === 'accepted') sessionStorage.setItem('pwa-installed', '1');
  return outcome === 'accepted';
}

export function canInstall() {
  return !!deferredPrompt;
}

export function initPWAInstall() {
  // Si beforeinstallprompt ya disparó antes de que montáramos el listener,
  // no hay nada que hacer — el evento no se puede reproducir.
  // Esta función existe para forzar la inicialización desde main.js.
}
