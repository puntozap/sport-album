const APP_URL  = 'https://sportalbum.chanzia.com';
const IOS_KEY  = 'pwa_gate_ios_installed';

// Returns true if the gate is shown (app should not init)
export async function initAppGate() {
  // Already inside the installed app → record iOS flag and skip
  const inStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (inStandalone) {
    if (window.navigator.standalone === true) {
      localStorage.setItem(IOS_KEY, '1');
    }
    return false;
  }

  // iOS: check if user previously opened from home screen
  if (localStorage.getItem(IOS_KEY) === '1') {
    showGate();
    return true;
  }

  // Chrome / Android: check via API
  if (!('getInstalledRelatedApps' in navigator)) return false;

  let installed = false;
  try {
    const apps = await navigator.getInstalledRelatedApps();
    installed = apps.length > 0;
  } catch { /* ignore */ }

  if (installed) {
    showGate();
    return true;
  }

  return false;
}

function isEmpresaUrl() {
  const RESERVED = ['simulation', '404', 'api', 'assets', 'empresas', 'fifa'];
  const seg = window.location.pathname.split('/').filter(Boolean)[0];
  return !!seg && !RESERVED.includes(seg) && seg.length > 3;
}

function showGate() {
  const es = localStorage.getItem('lang') !== 'en';
  const empresa = isEmpresaUrl();

  const gate = document.createElement('div');
  gate.id = 'pwa-gate';
  gate.innerHTML = `
    <div class="pwa-gate-inner">
      <div class="pwa-gate-ball">${empresa ? '🎴' : '⚽'}</div>
      <div class="pwa-gate-trophy">🏆</div>
      <div class="pwa-gate-title">${empresa ? 'LIBRITO DE FIGURITAS' : 'ÁLBUM DE FIGURITAS'}</div>
      <div class="pwa-gate-subtitle">${empresa ? (es ? 'ÁLBUM EMPRESARIAL' : 'COMPANY ALBUM') : (es ? 'SIN ÁNIMO DE LUCRO' : 'NON-PROFIT · FAN MADE')}</div>
      <div class="pwa-gate-divider"></div>
      <div class="pwa-gate-msg">
        ${es
          ? 'Tienes la app instalada en tu dispositivo.'
          : 'You have the app installed on your device.'}
      </div>
      <button class="pwa-gate-btn" id="pwa-gate-open">
        <span class="pwa-gate-btn-icon">📲</span>
        <span>${es ? 'Abrir la app' : 'Open the app'}</span>
      </button>
      <div class="pwa-gate-hint">
        ${es
          ? '¿No la encuentras? Búscala en tu pantalla de inicio.'
          : "Can't find it? Look for it on your home screen."}
      </div>
    </div>
  `;

  document.body.appendChild(gate);
  requestAnimationFrame(() => gate.classList.add('pwa-gate--visible'));

  document.getElementById('pwa-gate-open').addEventListener('click', () => {
    window.location.href = APP_URL;
  });
}
