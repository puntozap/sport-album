import { t } from '../i18n.js';

export function GroupBox({ group, onFixtureClick, onSimulatorClick }) {
  const el = document.createElement('aside');
  el.className = 'group-box';

  const flagsHtml = group.countries.map(c => `
    <div class="flag-card">
      <span class="flag-card-code">${c.code}</span>
      <img class="flag-card-img" src="https://flagcdn.com/w80/${c.flag}.png" alt="${c.name}">
    </div>
  `).join('');

  // Fondo con la forma del slot inferior (el 6) estirada al tamaño del GroupBox
  const BOTTOM_PATH = 'M24 142 H132 C154 142 166 156 166 173 H126 C151 176 166 192 166 214 C166 229 156 237 135 237 H24 C10 237 0 224 0 207 V170 C0 154 10 142 24 142 Z';

  const groupLetter = group.name.replace(/GROUP\s+/i, '').trim();
  const groupLabel  = `${t('curtain_group_label')} ${groupLetter}`;

  el.innerHTML = `
    <svg class="group-box-shape" viewBox="0 142 176 95" preserveAspectRatio="none" aria-hidden="true">
      <path d="${BOTTOM_PATH}" fill="var(--group-bg, #73b165)" />
    </svg>
    <div class="group-box-inner">
      <div class="group-header-row">
        <div class="group-title">${groupLabel}</div>
        <button class="group-fixture-btn" title="${t('matches_of', { team: '' }).trim()}">
          ⚽
        </button>
        <button class="group-simulator-btn" title="${t('simulator')}">
          <span>🧮</span>
          <span>${t('simulator').toUpperCase()}</span>
        </button>
      </div>
      <div class="flags-grid">
        ${flagsHtml}
      </div>
    </div>
  `;

  // Botón de partidos (modal)
  const fixtureBtn = el.querySelector('.group-fixture-btn');
  if (onFixtureClick) {
    fixtureBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onFixtureClick();
    });
  }

  // Botón simulador (cortina/panel)
  const simulatorBtn = el.querySelector('.group-simulator-btn');
  if (onSimulatorClick) {
    simulatorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSimulatorClick();
    });
  } else {
    simulatorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  return el;
}
