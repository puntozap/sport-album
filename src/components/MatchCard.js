/**
 * Tarjeta individual de partido.
 * Incluye inputs de goles, botón borrar, y simulador tipo tragamonedas.
 */

import { resultsStore } from '../data/resultsStore.js';
import { serverResultsStore } from '../data/serverResultsStore.js';
import { getTeamId } from '../data/teamNameMap.js';
import { t, getLang } from '../i18n.js';

const FLAG_CODES = {
  mexico: 'mx', southafrica: 'za', korearepublic: 'kr', czechia: 'cz',
  canada: 'ca', bosniaandherzegovina: 'ba', qatar: 'qa', switzerland: 'ch',
  brazil: 'br', morocco: 'ma', haiti: 'ht', scotland: 'gb-sct',
  unitedstates: 'us', paraguay: 'py', australia: 'au', turkiye: 'tr',
  germany: 'de', curacao: 'cw', cotedivoire: 'ci', ecuador: 'ec',
  netherlands: 'nl', japan: 'jp', sweden: 'se', tunisia: 'tn',
  belgium: 'be', egypt: 'eg', iran: 'ir', newzealand: 'nz',
  spain: 'es', capeverde: 'cv', saudiarabia: 'sa', uruguay: 'uy',
  france: 'fr', senegal: 'sn', iraq: 'iq', norway: 'no',
  argentina: 'ar', algeria: 'dz', austria: 'at', jordan: 'jo',
  portugal: 'pt', drcongo: 'cd', uzbekistan: 'uz', colombia: 'co',
  england: 'gb-eng', croatia: 'hr', ghana: 'gh', panama: 'pa'
};

function getFlagUrl(teamName) {
  const id = getTeamId(teamName);
  const code = id && FLAG_CODES[id];
  return code ? `https://flagcdn.com/w80/${code}.png` : '';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const locale = getLang() === 'es' ? 'es-ES' : 'en-US';
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

// Distribución realista de goles en un partido de fútbol
function weightedGoals() {
  const r = Math.random() * 100;
  if (r < 22) return 0;
  if (r < 55) return 1;
  if (r < 78) return 2;
  if (r < 91) return 3;
  if (r < 97) return 4;
  return 5;
}

function flashInput(input) {
  input.classList.remove('spinning');
  input.classList.add('reveal-flash');
  setTimeout(() => input.classList.remove('reveal-flash'), 600);
}

function runSimulator(homeInput, awayInput, card, simBtn, onDone) {
  const homeGoals = weightedGoals();
  const awayGoals = weightedGoals();

  simBtn.disabled = true;
  card.classList.add('simulating');
  homeInput.classList.add('spinning');
  awayInput.classList.add('spinning');
  homeInput.value = '';
  awayInput.value = '';

  // Fases: [duración ms, intervalo entre cambios ms]
  // Fase 1: giro rápido (ambos)
  // Fase 2: desaceleración (ambos)
  // Fase 3: local se detiene, visitante sigue lento
  // Fase 4: visitante muy lento (tensión máxima)
  const PHASES = [
    { ms: 1100, interval: 55,  homeSpins: true,  awaySpins: true  },
    { ms:  900, interval: 130, homeSpins: true,  awaySpins: true  },
    { ms:  800, interval: 260, homeSpins: false, awaySpins: true  }, // local se detiene a la mitad
    { ms:  900, interval: 420, homeSpins: false, awaySpins: true  }, // tensión visitante
  ];

  let phaseIdx = 0;
  let homeRevealed = false;

  function nextPhase() {
    if (phaseIdx >= PHASES.length) {
      // Revelar visitante → fin
      flashInput(awayInput);
      awayInput.value = awayGoals;
      card.classList.remove('simulating');
      simBtn.disabled = false;
      if (onDone) onDone();
      return;
    }

    const phase = PHASES[phaseIdx];
    const phaseStart = Date.now();

    // En la fase 3 el local se revela a la mitad
    if (phaseIdx === 2 && !homeRevealed) {
      setTimeout(() => {
        flashInput(homeInput);
        homeInput.value = homeGoals;
        homeRevealed = true;
      }, phase.ms * 0.45);
    }

    function tick() {
      if (Date.now() - phaseStart >= phase.ms) {
        phaseIdx++;
        nextPhase();
        return;
      }
      if (phase.homeSpins) homeInput.value = Math.floor(Math.random() * 6);
      if (phase.awaySpins) awayInput.value = Math.floor(Math.random() * 6);
      setTimeout(tick, phase.interval);
    }

    tick();
  }

  nextPhase();
}

// Retorna true si el partido todavía es editable (dentro de 24h de que terminó)
function isMatchEditable(match) {
  const [h, m] = (match.timeET || '00:00').split(':').map(Number);
  // ET = UTC-5 (aprox; no ajustamos DST para mantenerlo simple)
  const matchUtc = new Date(`${match.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00-05:00`);
  const lockTime = new Date(matchUtc.getTime() + 24 * 60 * 60 * 1000);
  return Date.now() < lockTime.getTime();
}

function isMatchInFuture(match) {
  const [h, m] = (match.timeET || '00:00').split(':').map(Number);
  // ET = UTC-5 (aprox; no ajustamos DST para mantenerlo simple)
  const matchUtc = new Date(`${match.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00-05:00`);
  return Date.now() < matchUtc.getTime();
}

export function MatchCard({ match, onSave }) {
  const el = document.createElement('div');
  el.className = 'match-card';

  const serverResult = serverResultsStore.get(match.id);
  const userResult   = resultsStore.get(match.id);
  const editable     = isMatchEditable(match); // editable dentro de 24h aunque haya oficial
  const canResetOfficial = !!serverResult && isMatchInFuture(match);

  // Si hay oficial y el usuario no ha editado, pre-rellenar con el oficial
  // Si el usuario ya editó, mostrar su valor en las casillas
  const displayHome = userResult ? userResult.homeGoals : (serverResult ? serverResult.homeGoals : '');
  const displayAway = userResult ? userResult.awayGoals : (serverResult ? serverResult.awayGoals : '');
  const isSaved = !!userResult;

  if (isSaved || serverResult) el.classList.add('match-card-saved');
  if (!editable) el.classList.add('match-card-locked');

  const homeFlag = getFlagUrl(match.home);
  const awayFlag = getFlagUrl(match.away);

  // Etiqueta de resultado del usuario entre paréntesis (solo cuando hay oficial Y simulación diferente)
  const showUserSim = serverResult && userResult;
  const userSimLabel = showUserSim
    ? `<span class="match-card-user-sim">(${t('your_sim')}: ${userResult.homeGoals}-${userResult.awayGoals})</span>`
    : '';

  const officialBadge = serverResult
    ? `<span class="match-card-official-badge">🏆 ${t('official')}</span>`
    : '';

  const officialResetBtn = canResetOfficial
    ? `<button class="match-card-reset-official" title="${t('reset')}">🗑️</button>`
    : '';

  el.innerHTML = `
    <div class="match-card-meta">
      <span class="match-card-time">${formatDate(match.date)} · ${match.timeET} ET</span>
      <span class="match-card-stadium">${match.stadium}</span>
    </div>
    <div class="match-card-teams">
      <div class="match-card-team">
        <span class="match-card-team-name">${match.home}</span>
        <div class="match-card-flag">
          ${homeFlag ? `<img src="${homeFlag}" alt="${match.home}" loading="lazy">` : ''}
        </div>
      </div>
      <div class="match-card-score">
        <input type="number" class="match-card-input" min="0" max="99"
          value="${displayHome}"
          placeholder="-" data-side="home"
          ${!editable ? 'readonly' : ''}>
        <span class="match-card-separator">-</span>
        <input type="number" class="match-card-input" min="0" max="99"
          value="${displayAway}"
          placeholder="-" data-side="away"
          ${!editable ? 'readonly' : ''}>
      </div>
      <div class="match-card-team away">
        <div class="match-card-flag">
          ${awayFlag ? `<img src="${awayFlag}" alt="${match.away}" loading="lazy">` : ''}
        </div>
        <span class="match-card-team-name">${match.away}</span>
      </div>
    </div>
    ${officialBadge || userSimLabel || officialResetBtn ? `<div class="match-card-official-row">${officialBadge}${userSimLabel}${officialResetBtn}</div>` : ''}
    <div class="match-card-actions">
      <button class="match-card-simulate" title="${t('simulate_result_title')}" ${!editable ? 'disabled' : ''}>🎰 ${t('simulate_result')}</button>
      <button class="match-card-save">${t('save')}</button>
      <button class="match-card-delete ${isSaved && editable ? 'visible' : ''}" title="${t('reset')}">🗑️</button>
    </div>
    ${isSaved && !serverResult ? `<div class="match-card-saved-label">${t('saved_check')}</div>` : ''}
  `;

  const homeInput = el.querySelector('[data-side="home"]');
  const awayInput = el.querySelector('[data-side="away"]');
  const saveBtn   = el.querySelector('.match-card-save');
  const deleteBtn = el.querySelector('.match-card-delete');
  const simBtn    = el.querySelector('.match-card-simulate');
  const resetOfficialBtn = el.querySelector('.match-card-reset-official');

  if (!editable) {
    saveBtn.style.display  = 'none';
    simBtn.style.display   = serverResult ? 'none' : simBtn.style.display;
  }

  if (resetOfficialBtn) {
    resetOfficialBtn.addEventListener('click', async () => {
      try {
        const body = new URLSearchParams({ action: 'reset-match', match_id: String(match.id) });
        const r = await fetch('/api/manage-matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Upload-Token': 'xK9#mP2$qR7nL4vT8wY1',
          },
          body,
        });
        if (!r.ok) return;
        const all = serverResultsStore.getAll();
        delete all[String(match.id)];
        serverResultsStore.setAll(all);
      } catch {}
    });
  }

  function checkDirty() {
    if (!editable) return;
    const hv = homeInput.value;
    const av = awayInput.value;

    // Mostrar botón borrar si hay algo que limpiar (guardado o valores en inputs)
    const saved = resultsStore.get(match.id);
    const hasAnyValue = hv !== '' || av !== '';
    deleteBtn.classList.toggle('visible', !!saved || hasAnyValue);

    if (hv === '' || av === '') { saveBtn.classList.remove('visible'); return; }
    const isDirty = !saved || saved.homeGoals !== Number(hv) || saved.awayGoals !== Number(av);
    saveBtn.classList.toggle('visible', isDirty);
  }

  if (editable) {
    homeInput.addEventListener('input', checkDirty);
    awayInput.addEventListener('input', checkDirty);
    // Estado inicial de botones según valores existentes
    checkDirty();

    saveBtn.addEventListener('click', () => {
      const h = Number(homeInput.value);
      const a = Number(awayInput.value);
      if (homeInput.value === '' || awayInput.value === '' || isNaN(h) || isNaN(a)) return;
      resultsStore.save(match.id, h, a);
      el.classList.add('match-card-saved');
      saveBtn.classList.remove('visible');
      deleteBtn.classList.add('visible');
      let label = el.querySelector('.match-card-saved-label');
      if (!label) {
        label = document.createElement('div');
        label.className = 'match-card-saved-label';
        label.textContent = t('saved_check');
        el.appendChild(label);
      }
      if (onSave) onSave();
    });

    deleteBtn.addEventListener('click', () => {
      resultsStore.remove(match.id);
      homeInput.value = '';
      awayInput.value = '';
      el.classList.remove('match-card-saved');
      deleteBtn.classList.remove('visible');
      saveBtn.classList.remove('visible');
      const label = el.querySelector('.match-card-saved-label');
      if (label) label.remove();
      if (onSave) onSave();
    });

    simBtn.addEventListener('click', () => {
      runSimulator(homeInput, awayInput, el, simBtn, () => checkDirty());
    });
  }

  return el;
}
