/**
 * Panel de fixture para UN equipo específico.
 * Muestra solo los partidos del equipo que se está navegando + tabla del grupo.
 * Fondo: banderines ondeando con las 4 banderas del grupo.
 */

import { getMatchesByGroup, getMatchesByTeam } from '../data/matchesData.js';
import { resultsStore } from '../data/resultsStore.js';
import { serverResultsStore, mergeResults } from '../data/serverResultsStore.js';
import { calculateStandings } from '../data/standingsEngine.js';
import { MatchCard } from './MatchCard.js';
import { StandingsTable } from './StandingsTable.js';
import { t } from '../i18n.js';

// Cuadrícula densa: 10 columnas × 8 filas = ~80 banderines
function buildPositions() {
  const cols  = [0, 11, 22, 33, 44, 55, 66, 77, 88, 97];
  const rows  = [0, 13, 26, 38, 50, 62, 74, 86];
  const tilts = [-9, 6, -5, 8, -4, 7, -7, 5, -6, 9, -3, 4];
  const pos   = [];
  rows.forEach((top, ri) => {
    const offset = (ri % 2) * 5.5; // filas alternadas desplazadas
    cols.forEach((left, ci) => {
      pos.push({
        left: `${left + offset}%`,
        top:  `${top}%`,
        tilt: tilts[(ri * 10 + ci) % tilts.length]
      });
    });
  });
  return pos;
}
const BANNER_POSITIONS = buildPositions();
const WAVE_VARIANTS = ['wc-banner-wave-soft', 'wc-banner-wave-med', 'wc-banner-wave-hard'];

function createGroupBanners(groupCountries) {
  const container = document.createElement('div');
  container.className = 'wc-bg-container';
  if (!groupCountries || groupCountries.length === 0) return container;

  BANNER_POSITIONS.forEach((pos, i) => {
    const country  = groupCountries[i % groupCountries.length];
    const delay    = ((i * 0.29) % 2.8).toFixed(2);
    const duration = (1.4 + (i % 5) * 0.28).toFixed(2);
    const waveName = WAVE_VARIANTS[Math.floor(Math.random() * WAVE_VARIANTS.length)];

    const banner = document.createElement('div');
    banner.className = 'wc-banner';
    banner.style.cssText = `left:${pos.left};top:${pos.top};transform:rotate(${pos.tilt}deg);`;

    banner.innerHTML = `
      <div class="wc-banner-pole"></div>
      <div class="wc-banner-flag" style="animation-name:${waveName};animation-delay:${delay}s;animation-duration:${duration}s;">
        <img src="https://flagcdn.com/w160/${country.flag}.png" alt="${country.name}" loading="lazy">
      </div>
    `;

    container.appendChild(banner);
  });

  return container;
}

export function GroupFixturePanel({ groupName, teamName, groupCountries = [] }) {
  let unsubscribe = null;
  const groupLetter = groupName.replace(/GROUP\s+/i, '').trim();

  const overlay = document.createElement('div');
  overlay.className = 'fixture-overlay';

  overlay.innerHTML = `
    <div class="fixture-backdrop"></div>
    <div class="fixture-panel fixture-panel-group">
      <div class="fixture-header">
        <span class="fixture-title">⚽ ${teamName.toUpperCase()}</span>
        <button class="fixture-close">✕</button>
      </div>
      <div class="fixture-content"></div>
    </div>
  `;

  const contentEl = overlay.querySelector('.fixture-content');
  const closeBtn = overlay.querySelector('.fixture-close');
  const backdrop = overlay.querySelector('.fixture-backdrop');

  // Fondo con banderines de las 4 banderas del grupo
  const bannersBg = createGroupBanners(groupCountries);
  overlay.insertBefore(bannersBg, backdrop.nextSibling);

  function render() {
    contentEl.innerHTML = '';

    const allGroupMatches = getMatchesByGroup(groupLetter);
    const results = mergeResults(serverResultsStore.getAll(), resultsStore.getAll());
    const standings = calculateStandings(allGroupMatches, results);

    // 1. Tabla de posiciones del grupo (arriba, destacada)
    contentEl.appendChild(StandingsTable({ standings, groupName: groupLetter }));

    // 2. Separador
    const divider = document.createElement('div');
    divider.className = 'fixture-divider';
    divider.textContent = t('matches_of', { team: teamName.toUpperCase() });
    contentEl.appendChild(divider);

    // 3. Solo los partidos del equipo actual
    const teamMatches = getMatchesByTeam(teamName);
    const groupTeamMatches = teamMatches.filter(m => m.group === groupLetter);

    const sortedMatches = [...groupTeamMatches].sort((a, b) => {
      const da = new Date(a.date + 'T' + a.timeET);
      const db = new Date(b.date + 'T' + b.timeET);
      return da - db;
    });

    if (sortedMatches.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'fixture-empty-msg';
      emptyMsg.textContent = t('no_matches_team');
      contentEl.appendChild(emptyMsg);
    } else {
      sortedMatches.forEach(match => {
        contentEl.appendChild(MatchCard({
          match,
          onSave: () => render()
        }));
      });
    }
  }

  function onNavigation() {
    close();
  }

  function open() {
    document.body.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('fixture-active');
    render();
    const unsubUser   = resultsStore.subscribe(() => render());
    const unsubServer = serverResultsStore.subscribe(() => render());
    unsubscribe = () => { unsubUser(); unsubServer(); };
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

  // Bloquear que PageSwipe intercepte los touches del modal
  // stopPropagation impide que el touchmove del document llame preventDefault()
  overlay.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  }, { passive: true });

  overlay.addEventListener('touchmove', (e) => {
    e.stopPropagation(); // permite scroll nativo del modal
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    e.stopPropagation();
  }, { passive: true });

  // Cerrar con swipe vertical hacia abajo en el header
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

  return { open, close, onKeydown };
}
