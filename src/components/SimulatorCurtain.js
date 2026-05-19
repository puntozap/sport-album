/**
 * Cortina "Simulador" antes de ir al bracket.
 * Reutiliza el CSS base de .country-curtain, pero con contenido genérico.
 */

import { t } from '../i18n.js';

const SHOW_DURATION = 750; // ms mostrando el contenido antes de desvanecer

export function showSimulatorCurtain(onComplete) {
  const curtain = document.createElement('div');
  curtain.className = 'country-curtain simulator-curtain';

  curtain.innerHTML = `
    <div class="curtain-bg"></div>
    <div class="curtain-content">
      <div class="curtain-sim-badge">
        <span class="curtain-sim-icon">🏆</span>
      </div>
      <div class="curtain-text">
        <span class="curtain-we">${t('simulator')}</span>
        <span class="curtain-name">${t('knockout_stage')}</span>
      </div>
      <div class="curtain-sim-trophy" aria-hidden="true">🏆</div>
    </div>
  `;

  document.body.appendChild(curtain);

  // Forzar reflow
  curtain.offsetHeight;

  requestAnimationFrame(() => {
    curtain.classList.add('curtain-in');
  });

  setTimeout(() => {
    curtain.classList.remove('curtain-in');
    curtain.classList.add('curtain-out');

    setTimeout(() => {
      curtain.remove();
      onComplete?.();
    }, 500);
  }, SHOW_DURATION);
}
