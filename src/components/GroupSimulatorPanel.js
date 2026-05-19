/**
 * Panel "Simulador" por grupo.
 * Muestra tabla del grupo + calendario completo del grupo (con edición de resultados).
 */

import { getMatchesByGroup } from '../data/matchesData.js';
import { resultsStore } from '../data/resultsStore.js';
import { calculateStandings } from '../data/standingsEngine.js';
import { MatchCard } from './MatchCard.js';
import { StandingsTable } from './StandingsTable.js';
import { t } from '../i18n.js';

export function GroupSimulatorPanel({ groupName, groupCountries = [] }) {
  let unsubscribe = null;
  const groupLetter = groupName.replace(/GROUP\s+/i, '').trim();

  const overlay = document.createElement('div');
  overlay.className = 'fixture-overlay';

  const groupLabel = groupLetter ? `${t('group').toUpperCase()} ${groupLetter}` : t('group').toUpperCase();

  overlay.innerHTML = `
    <div class="fixture-backdrop"></div>
    <div class="fixture-panel fixture-panel-group">
      <div class="fixture-header">
        <span class="fixture-title">🧮 ${t('simulator')} · ${groupLabel}</span>
        <button class="fixture-close">✕</button>
      </div>
      <div class="fixture-content"></div>
    </div>
  `;

  const contentEl = overlay.querySelector('.fixture-content');
  const closeBtn = overlay.querySelector('.fixture-close');
  const backdrop = overlay.querySelector('.fixture-backdrop');

  function render() {
    contentEl.innerHTML = '';

    const allGroupMatches = getMatchesByGroup(groupLetter);
    const results = resultsStore.getAll();
    const standings = calculateStandings(allGroupMatches, results);

    contentEl.appendChild(StandingsTable({ standings, groupName: groupLetter }));

    const divider = document.createElement('div');
    divider.className = 'fixture-divider';
    divider.textContent = t('calendar_group', { group: groupLabel });
    contentEl.appendChild(divider);

    const sortedMatches = [...allGroupMatches].sort((a, b) => {
      const da = new Date(a.date + 'T' + a.timeET);
      const db = new Date(b.date + 'T' + b.timeET);
      return da - db;
    });

    if (sortedMatches.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'fixture-empty-msg';
      emptyMsg.textContent = t('no_matches_group');
      contentEl.appendChild(emptyMsg);
      return;
    }

    sortedMatches.forEach(match => {
      contentEl.appendChild(MatchCard({
        match,
        onSave: () => render()
      }));
    });
  }

  function onNavigation() {
    close();
  }

  function open() {
    document.body.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('fixture-active');
    render();
    unsubscribe = resultsStore.subscribe(() => render());
    window.addEventListener('routechange', onNavigation, { once: true });
  }

  function close() {
    window.removeEventListener('routechange', onNavigation);
    overlay.classList.remove('fixture-active');
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 350);
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  overlay.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  }, { passive: true });

  overlay.addEventListener('touchmove', (e) => {
    e.stopPropagation();
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    e.stopPropagation();
  }, { passive: true });

  let touchStartY = 0;
  let touchStartX = 0;
  const header = overlay.querySelector('.fixture-header');
  header.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  header.addEventListener('touchend', (e) => {
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 2 && dy > 0) {
      close();
    }
  }, { passive: true });

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  return { open, close, onKeydown, groupCountries };
}
