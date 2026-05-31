import { AlbumPage } from './AlbumPage.js';
import { initBracketPan } from '../utils/bracketPan.js';
import { CLIENT } from '../config/client.js';
import { getGroupMatches } from '../data/matchesData.js';
import { resultsStore } from '../data/resultsStore.js';
import { koResultsStore } from '../data/koResultsStore.js';
import { serverResultsStore, mergeResults } from '../data/serverResultsStore.js';
import { calculateAllStandings } from '../data/standingsEngine.js';
import { calculateKnockoutTeams, generateBracket, applyKnockoutResults } from '../data/bracketEngine.js';
import { getTeamId } from '../data/teamNameMap.js';
import { router } from '../router.js';
import { t } from '../i18n.js';

const FLAG_CODES = {
  mexico:'mx', southafrica:'za', korearepublic:'kr', czechia:'cz',
  canada:'ca', bosniaandherzegovina:'ba', qatar:'qa', switzerland:'ch',
  brazil:'br', morocco:'ma', haiti:'ht', scotland:'gb-sct',
  unitedstates:'us', paraguay:'py', australia:'au', turkiye:'tr',
  germany:'de', curacao:'cw', cotedivoire:'ci', ecuador:'ec',
  netherlands:'nl', japan:'jp', sweden:'se', tunisia:'tn',
  belgium:'be', egypt:'eg', iran:'ir', newzealand:'nz',
  spain:'es', capeverde:'cv', saudiarabia:'sa', uruguay:'uy',
  france:'fr', senegal:'sn', iraq:'iq', norway:'no',
  argentina:'ar', algeria:'dz', austria:'at', jordan:'jo',
  portugal:'pt', drcongo:'cd', uzbekistan:'uz', colombia:'co',
  england:'gb-eng', croatia:'hr', ghana:'gh', panama:'pa'
};

function getFlagUrl(name) {
  if (!name) return null;
  const id = getTeamId(name);
  const code = id && FLAG_CODES[id];
  return code ? `https://flagcdn.com/w40/${code}.png` : null;
}

function simGoals() {
  const r = Math.random() * 100;
  if (r < 22) return 0; if (r < 55) return 1; if (r < 78) return 2;
  if (r < 91) return 3; if (r < 97) return 4; return 5;
}

// ── Fondo estadio ─────────────────────────────────────────────
function buildBackground() {
  const bg = document.createElement('div');
  bg.className = 'bp-bg';
  bg.innerHTML = `
    <div class="bp-bg-top"></div>
    <div class="bp-bg-body"></div>
    <svg class="bp-bg-deco" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <!-- Copa enorme difuminada de fondo -->
      <text x="400" y="340" text-anchor="middle" font-size="320" opacity="0.04"
            fill="#D4AF37" font-family="serif">🏆</text>
      <!-- Líneas de campo de fútbol decorativas -->
      <ellipse cx="400" cy="420" rx="320" ry="120" fill="none" stroke="rgba(212,175,55,0.06)" stroke-width="1.5"/>
      <ellipse cx="400" cy="420" rx="180" ry="68"  fill="none" stroke="rgba(212,175,55,0.05)" stroke-width="1"/>
      <ellipse cx="400" cy="420" rx="60"  ry="24"  fill="none" stroke="rgba(212,175,55,0.04)" stroke-width="1"/>
      <line x1="80"  y1="60"  x2="80"  y2="500" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>
      <line x1="720" y1="60"  x2="720" y2="500" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>
      <line x1="400" y1="60"  x2="400" y2="500" stroke="rgba(255,255,255,0.02)"  stroke-width="1"/>
      <!-- Puntos de estrellas sutiles -->
      <circle cx="150" cy="120" r="1.5" fill="rgba(212,175,55,0.3)"/>
      <circle cx="650" cy="90"  r="1"   fill="rgba(212,175,55,0.25)"/>
      <circle cx="700" cy="200" r="1.5" fill="rgba(212,175,55,0.2)"/>
      <circle cx="100" cy="300" r="1"   fill="rgba(212,175,55,0.2)"/>
      <circle cx="750" cy="350" r="1.5" fill="rgba(212,175,55,0.15)"/>
    </svg>
    <!-- Línea dorada superior -->
    <div class="bp-bg-gold-line"></div>
  `;

  if (CLIENT.active && CLIENT.logoUrl) {
    const logoEl = document.createElement('div');
    logoEl.className = 'bp-bg-client-logo';
    logoEl.innerHTML = `<img src="${CLIENT.logoUrl}" alt="${CLIENT.name}">`;
    bg.appendChild(logoEl);
  }

  return bg;
}

// ── Slots ─────────────────────────────────────────────────────
function slotHtml(slot) {
  if (!slot) return `<div class="bp-slot bp-slot-empty">?</div>`;
  if (slot.isKnown && slot.name) {
    const flag = getFlagUrl(slot.name);
    const code = slot.name.substring(0, 3).toUpperCase();
    const cid  = getTeamId(slot.name) || slot.name.toLowerCase().replace(/[^a-z]/g, '');
    return `
      <div class="bp-slot bp-slot-team" data-id="${cid}" title="${slot.name}">
        ${flag ? `<img class="bp-flag" data-country-id="${cid}" src="${flag}" alt="">` : `<div class="bp-flag bp-flag-empty"></div>`}
        <span class="bp-code">${code}</span>
      </div>`;
  }
  return `
    <div class="bp-slot bp-slot-tbd">
      <div class="bp-flag bp-flag-tbd"></div>
      <span class="bp-code bp-code-tbd">${slot.label || '?'}</span>
    </div>`;
}

function buildMatchEl(match) {
  const el = document.createElement('div');
  el.className = 'bp-match';
  if (match.result) el.classList.add('bp-match-scored');
  el.dataset.matchId = String(match.matchId);
  if (match.home?.name) el.dataset.home = match.home.name;
  if (match.away?.name) el.dataset.away = match.away.name;
  const r = match.result;
  let scoreHtml = '';
  if (r) {
    const pen = r.homeGoals === r.awayGoals;
    scoreHtml = `<span class="bp-score">${r.homeGoals}-${r.awayGoals}${pen ? '<small>P</small>' : ''}</span>`;
  } else if (match.home?.isKnown && match.away?.isKnown) {
    scoreHtml = `<span class="bp-add">+</span>`;
  }
  el.innerHTML = `
    <div class="bp-match-header">
      <span class="bp-mid">M${match.matchId}</span>${scoreHtml}
    </div>
    ${slotHtml(match.home)}
    ${slotHtml(match.away)}
  `;
  return el;
}

function buildCol(matches, side) {
  const col = document.createElement('div');
  col.className = `bp-col bp-col-${side}`;
  const pairs = document.createElement('div');
  pairs.className = 'bp-pairs';
  for (let i = 0; i < matches.length; i += 2) {
    const m1 = matches[i], m2 = matches[i + 1];
    const pair = document.createElement('div');
    pair.className = 'bp-pair' + (m2 ? '' : ' bp-pair-single');
    pair.appendChild(buildMatchEl(m1));
    if (m2) pair.appendChild(buildMatchEl(m2));
    pairs.appendChild(pair);
  }
  col.appendChild(pairs);
  return col;
}

function buildCenterCol(finalMatch, champion) {
  const col = document.createElement('div');
  col.className = 'bp-col bp-col-center';
  const champEl = document.createElement('div');
  champEl.className = 'bp-champion' + (champion ? ' bp-champion-revealed' : '');
  if (champion?.name) {
    const flag = getFlagUrl(champion.name);
    champEl.innerHTML = `
      <div class="bp-champ-trophy">🏆</div>
      <div class="bp-champ-title">${t('champion_2026')}</div>
      <div class="bp-champ-winner">
        ${flag ? `<img class="bp-champ-flag" src="${flag}" alt="">` : ''}
        <span class="bp-champ-name">${champion.name.toUpperCase()}</span>
      </div>`;
  } else {
    champEl.innerHTML = `
      <div class="bp-champ-trophy">🏆</div>
      <div class="bp-champ-title">${t('champion_2026')}</div>
      <div class="bp-champ-tbd">${t('tbd_label')}</div>`;
  }
  const pairWrap = document.createElement('div');
  pairWrap.className = 'bp-pairs';
  const pair = document.createElement('div');
  pair.className = 'bp-pair bp-pair-single';
  pair.appendChild(buildMatchEl(finalMatch));
  pairWrap.appendChild(pair);
  col.appendChild(champEl);
  col.appendChild(pairWrap);
  return col;
}

function qualTeamHtml(team, pos, cls, qualified) {
  if (!team || team.pj === 0)
    return `<div class="bp-qt ${cls}"><span class="bp-qt-pos">${pos}</span><span class="bp-qt-name empty">—</span></div>`;
  const flag = getFlagUrl(team.name);
  const cid = getTeamId(team.name) || team.name.toLowerCase().replace(/[^a-z]/g, '');
  const check = qualified === true ? '<span class="bp-qt-check">✓</span>'
    : qualified === false ? '<span class="bp-qt-x">✗</span>' : '';
  return `
    <div class="bp-qt ${cls}">
      <span class="bp-qt-pos">${pos}</span>
      ${flag ? `<img class="bp-qt-flag" data-country-id="${cid}" src="${flag}" alt="">` : ''}
      <span class="bp-qt-name">${team.name}</span>
      <span class="bp-qt-pts">${team.pts}p</span>${check}
    </div>`;
}

export function BracketPage({ previousCountryId }) {
  const fragment = document.createDocumentFragment();

  // Fondo personalizado
  fragment.appendChild(buildBackground());

  // Header fijo arriba
  const header = document.createElement('div');
  header.className = 'bp-header';
  header.innerHTML = `
    <div class="bp-title"><span class="bp-title-icon">🏆</span><span class="bp-title-text"> SIMULATION</span></div>
    <div class="bp-header-actions">
      <button class="bp-sim-btn">⚡ ${t('simulate').toUpperCase()}</button>
      <button class="bp-reset-btn">🗑 ${t('reset').toUpperCase()}</button>
      <button class="bp-back-btn">← ${t('back').toUpperCase()}</button>
    </div>
  `;
  fragment.appendChild(header);

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'bp-wrapper';
  fragment.appendChild(wrapper);

  // contentEl — render() limpia este div, no el wrapper
  const contentEl = document.createElement('div');
  contentEl.className = 'bp-content';
  wrapper.appendChild(contentEl);

  // Efecto "pop" al tocar un clasificado (móvil) sin depender de :hover
  if (!wrapper.__qtPopAttached) {
    wrapper.__qtPopAttached = true;
    wrapper.addEventListener('pointerdown', (e) => {
      const card = e.target.closest?.('.bp-qual-card');
      if (card) {
        card.classList.add('bp-qual-pop');
        clearTimeout(card.__qualPopTimer);
        card.__qualPopTimer = setTimeout(() => card.classList.remove('bp-qual-pop'), 520);
        return;
      }

      const qt = e.target.closest?.('.bp-qt');
      if (!qt) return;
      qt.classList.add('bp-qt-pop');
      clearTimeout(qt.__qtPopTimer);
      qt.__qtPopTimer = setTimeout(() => qt.classList.remove('bp-qt-pop'), 450);
    }, { passive: true });
  }

  // ── Simulación ──────────────────────────────────────────────
  const simBtn   = header.querySelector('.bp-sim-btn');
  const resetBtn = header.querySelector('.bp-reset-btn');
  const backBtn  = header.querySelector('.bp-back-btn');

  function openEditModal({ matchId, homeTeam, awayTeam }) {
    const existing = koResultsStore.get(matchId);
    const hg0 = existing?.homeGoals ?? '';
    const ag0 = existing?.awayGoals ?? '';
    const pen0 = existing?.penWinner ?? '';

    const homeFlag = getFlagUrl(homeTeam);
    const awayFlag = getFlagUrl(awayTeam);
    const homeFlagHtml = homeFlag ? `<img class="bp-edit-flag" src="${homeFlag}" alt="">` : '';
    const awayFlagHtml = awayFlag ? `<img class="bp-edit-flag" src="${awayFlag}" alt="">` : '';

    const modal = document.createElement('div');
    modal.className = 'bp-edit';
    modal.innerHTML = `
      <div class="bp-edit-backdrop"></div>
      <div class="bp-edit-card" role="dialog" aria-modal="true">
        <div class="bp-edit-title">${t('edit_result')} · M${matchId}</div>

        <div class="bp-edit-teams">
          <div class="bp-edit-team-block">
            ${homeFlagHtml}
            <span class="bp-edit-team-name">${homeTeam}</span>
          </div>
          <span class="bp-edit-vs">vs</span>
          <div class="bp-edit-team-block">
            ${awayFlagHtml}
            <span class="bp-edit-team-name">${awayTeam}</span>
          </div>
        </div>

        <div class="bp-edit-grid">
          <label class="bp-edit-field">
            <div class="bp-edit-field-team">${homeFlagHtml}<span>${homeTeam}</span></div>
            <input class="bp-edit-input bp-edit-home" type="number" min="0" max="20" inputmode="numeric" value="${hg0}">
          </label>
          <label class="bp-edit-field">
            <div class="bp-edit-field-team">${awayFlagHtml}<span>${awayTeam}</span></div>
            <input class="bp-edit-input bp-edit-away" type="number" min="0" max="20" inputmode="numeric" value="${ag0}">
          </label>
        </div>

        <div class="bp-edit-pen">
          <div class="bp-edit-pen-title">${t('penalty_who_won')}</div>
          <label class="bp-edit-radio">
            <input type="radio" name="bp-pen" value="home" ${pen0 === 'home' ? 'checked' : ''}>
            ${homeFlagHtml}
            <span>${homeTeam}</span>
          </label>
          <label class="bp-edit-radio">
            <input type="radio" name="bp-pen" value="away" ${pen0 === 'away' ? 'checked' : ''}>
            ${awayFlagHtml}
            <span>${awayTeam}</span>
          </label>
        </div>

        <div class="bp-edit-actions">
          <button class="bp-edit-clear" type="button">${t('clear_result')}</button>
          <div class="bp-edit-actions-right">
            <button class="bp-edit-cancel" type="button">${t('cancel')}</button>
            <button class="bp-edit-save" type="button">${t('save')}</button>
          </div>
        </div>
      </div>
    `;

    const homeEl = modal.querySelector('.bp-edit-home');
    const awayEl = modal.querySelector('.bp-edit-away');
    const penWrap = modal.querySelector('.bp-edit-pen');

    function syncPenVisibility() {
      const hg = Number(homeEl.value);
      const ag = Number(awayEl.value);
      const show = homeEl.value !== '' && awayEl.value !== '' && Number.isFinite(hg) && Number.isFinite(ag) && hg === ag;
      penWrap.style.display = show ? 'block' : 'none';
      if (!show) {
        modal.querySelectorAll('input[name=\"bp-pen\"]').forEach(r => { r.checked = false; });
      }
    }

    function close() {
      modal.classList.remove('bp-edit-active');
      setTimeout(() => modal.remove(), 200);
    }

    modal.querySelector('.bp-edit-cancel').addEventListener('click', close);
    modal.querySelector('.bp-edit-backdrop').addEventListener('click', close);
    modal.querySelector('.bp-edit-clear').addEventListener('click', () => {
      koResultsStore.remove(matchId);
      close();
      render();
    });

    modal.querySelector('.bp-edit-save').addEventListener('click', () => {
      const hg = homeEl.value === '' ? null : Number(homeEl.value);
      const ag = awayEl.value === '' ? null : Number(awayEl.value);
      if (!Number.isFinite(hg) || !Number.isFinite(ag)) return;

      let penWinner = null;
      if (hg === ag) {
        penWinner = modal.querySelector('input[name=\"bp-pen\"]:checked')?.value || null;
        if (!penWinner) return;
      }

      koResultsStore.save(matchId, homeTeam, awayTeam, hg, ag, penWinner);
      close();
      render();
    });

    homeEl.addEventListener('input', syncPenVisibility);
    awayEl.addEventListener('input', syncPenVisibility);

    document.body.appendChild(modal);
    modal.offsetHeight;
    modal.classList.add('bp-edit-active');
    syncPenVisibility();
    homeEl.focus();

    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') modal.querySelector('.bp-edit-save')?.click();
    }
    document.addEventListener('keydown', onKey, { once: true });
  }

  function simulateFull() {
    simBtn.disabled = true;
    simBtn.textContent = '⏳…';

    const allGroupMatches = getGroupMatches();
    const existing = resultsStore.getAll();
    allGroupMatches.forEach(m => {
      if (!existing[String(m.id)]) resultsStore.save(m.id, simGoals(), simGoals());
    });

    const results      = mergeResults(serverResultsStore.getAll(), resultsStore.getAll());
    const allStandings = calculateAllStandings(allGroupMatches, results);
    const knockout     = calculateKnockoutTeams(allStandings);
    const rounds       = generateBracket(knockout);

    // Simulate ONLY missing knockout results, keeping manual edits.
    for (let ri = 0; ri < rounds.length; ri++) {
      applyKnockoutResults(rounds, koResultsStore.getAll());
      const round = rounds[ri];
      round.matches.forEach(match => {
        const home = match.home, away = match.away;
        if (!home?.name || !away?.name) return;
        if (koResultsStore.get(match.matchId)) return;

        const hg = simGoals(), ag = simGoals();
        let pen = null;
        if (hg === ag) pen = Math.random() < 0.5 ? 'home' : 'away';
        koResultsStore.save(match.matchId, home.name, away.name, hg, ag, pen);
      });
    }

    simBtn.disabled = false;
    simBtn.textContent = `⚡ ${t('simulate').toUpperCase()}`;
    render();
  }

  function openResetConfirm() {
    const modal = document.createElement('div');
    modal.className = 'bp-confirm-overlay';
    modal.innerHTML = `
      <div class="bp-confirm-box">
        <div class="bp-confirm-ball">⚽</div>
        <div class="bp-confirm-title">${t('delete_all_title')}</div>
        <div class="bp-confirm-text">${t('delete_all_text')}</div>
        <div class="bp-confirm-actions">
          <button class="bp-confirm-yes">${t('delete_all')}</button>
          <button class="bp-confirm-no">${t('cancel').toUpperCase()}</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('bp-confirm-active'));

    modal.querySelector('.bp-confirm-yes').addEventListener('click', () => {
      resultsStore.clear();
      koResultsStore.clear();
      modal.remove();
      render();
    });
    modal.querySelector('.bp-confirm-no').addEventListener('click', () => {
      modal.classList.remove('bp-confirm-active');
      setTimeout(() => modal.remove(), 280);
    });
  }

  simBtn.addEventListener('click', simulateFull);
  resetBtn.addEventListener('click', openResetConfirm);

  // Header oculta al bajar, reaparece al subir
  let bpLastScroll = 0;
  wrapper.addEventListener('scroll', () => {
    const st = wrapper.scrollTop;
    if (st <= 0) {
      header.classList.remove('bp-header-hidden');
      wrapper.classList.remove('bp-header-hidden');
    } else if (st > bpLastScroll + 8) {
      header.classList.add('bp-header-hidden');
      wrapper.classList.add('bp-header-hidden');
    } else if (bpLastScroll > st + 4) {
      header.classList.remove('bp-header-hidden');
      wrapper.classList.remove('bp-header-hidden');
    }
    bpLastScroll = st;
  }, { passive: true });

  // ── Render ──────────────────────────────────────────────────
  function render() {
    contentEl.innerHTML = '';

    const allMatches   = getGroupMatches();
    const results      = mergeResults(serverResultsStore.getAll(), resultsStore.getAll());
    const allStandings = calculateAllStandings(allMatches, results);
    const knockout     = calculateKnockoutTeams(allStandings);
    const rounds       = generateBracket(knockout);
    applyKnockoutResults(rounds, koResultsStore.getAll());

    const [r32, r16, qf, sf, finalRound] = rounds;
    const finalMatch = finalRound.matches[0];
    let champion = null;
    if (finalMatch?.result) {
      const r = finalMatch.result;
      const name = r.homeGoals > r.awayGoals ? r.homeTeam
        : r.awayGoals > r.homeGoals ? r.awayTeam
        : (r.penWinner === 'home' ? r.homeTeam : r.awayTeam);
      if (name) champion = { name, isKnown: true };
    }

    // ── Clasificados ──
    const qualSec = document.createElement('div');
    qualSec.className = 'bp-qualifiers';
    const qualTitle = document.createElement('div');
    qualTitle.className = 'bp-section-title';
    qualTitle.textContent = t('qualified_32');
    qualSec.appendChild(qualTitle);
    const grid = document.createElement('div');
    grid.className = 'bp-qual-grid';
    const groups = [...new Set([
      ...knockout.groupWinners.map(w => w.group),
      ...knockout.groupRunnersUp.map(r => r.group)
    ])].sort();
    groups.forEach(group => {
      const winner = knockout.groupWinners.find(w => w.group === group);
      const runner = knockout.groupRunnersUp.find(r => r.group === group);
      const third  = knockout.allThirds.find(t => t.group === group);
      const card = document.createElement('div');
      card.className = 'bp-qual-card';
      card.innerHTML = `
        <div class="bp-qual-group">${t('grp_label')} ${group}</div>
        ${qualTeamHtml(winner?.team, '1°', 'winner')}
        ${qualTeamHtml(runner?.team, '2°', 'runner')}
        ${qualTeamHtml(third?.team,  '3°', third?.qualified ? 'third-ok' : 'third-out', third?.qualified)}
      `;
      grid.appendChild(card);
    });
    qualSec.appendChild(grid);
    contentEl.appendChild(qualSec);

    // ── Bracket ──
    const treeTitle = document.createElement('div');
    treeTitle.className = 'bp-section-title bp-tree-title';
    treeTitle.textContent = t('knockout_title');
    contentEl.appendChild(treeTitle);

    const labelsRow = document.createElement('div');
    labelsRow.className = 'bp-round-labels';
    ['R32','R16', t('round_qf'), t('round_sf'),'FINAL', t('round_sf'), t('round_qf'),'R16','R32'].forEach(n => {
      const s = document.createElement('span');
      s.className = 'bp-round-label';
      s.textContent = n;
      labelsRow.appendChild(s);
    });
    contentEl.appendChild(labelsRow);

    const tree = document.createElement('div');
    tree.className = 'bp-tree';
    tree.appendChild(buildCol(r32.matches.slice(0,8),  'left'));
    tree.appendChild(buildCol(r16.matches.slice(0,4),  'left'));
    tree.appendChild(buildCol(qf.matches.slice(0,2),   'left'));
    tree.appendChild(buildCol([sf.matches[0]],          'left'));
    tree.appendChild(buildCenterCol(finalMatch, champion));
    tree.appendChild(buildCol([sf.matches[1]],          'right'));
    tree.appendChild(buildCol(qf.matches.slice(2,4),    'right'));
    tree.appendChild(buildCol(r16.matches.slice(4,8),   'right'));
    tree.appendChild(buildCol(r32.matches.slice(8,16),  'right'));
    contentEl.appendChild(tree);

    // Click actions: editar resultado / navegar por bandera
    tree.addEventListener('click', (e) => {
      const flagEl = e.target.closest?.('[data-country-id]');
      if (flagEl?.dataset?.countryId) {
        router.navigate('/' + flagEl.dataset.countryId);
        return;
      }

      const matchEl = e.target.closest?.('.bp-match[data-match-id][data-home][data-away]');
      if (!matchEl) return;

      e.stopPropagation();
      openEditModal({
        matchId: matchEl.dataset.matchId,
        homeTeam: matchEl.dataset.home,
        awayTeam: matchEl.dataset.away
      });
    });
  }

  render();

  // Re-render en vivo cuando llegan resultados oficiales (Excel → n8n → PHP)
  const unsubUser   = resultsStore.subscribe(() => render());
  const unsubServer = serverResultsStore.subscribe(() => render());
  const unsubKO     = koResultsStore.subscribe(() => render());

  // ── Overlay "gira el dispositivo" — en body para evitar stacking context ──
  const rotateOverlay = document.createElement('div');
  rotateOverlay.className = 'bp-rotate-overlay';
  rotateOverlay.innerHTML = `
    <div class="bp-rotate-icon">📱</div>
    <div class="bp-rotate-title">${t('rotate_title')}</div>
    <div class="bp-rotate-sub">${t('rotate_sub')}</div>
    <button class="bp-rotate-btn">${t('rotate_btn')}</button>
  `;
  document.body.appendChild(rotateOverlay);

  let panController = null;
  let forcedLandscape = false;

  function applyForcedLandscape() {
    forcedLandscape = true;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Rotar album-page y su shell directamente con medidas exactas
    // rotate(90deg) translate(0, -W) mapea el elemento W×H al espacio portrait
    const albumPage  = wrapper.parentElement;
    const albumShell = albumPage?.parentElement;
    if (albumShell) {
      albumShell.style.cssText = `position:fixed;top:0;left:0;width:${H}px;height:${W}px;overflow:hidden;min-width:unset;transform:none;`;
    }
    if (albumPage) {
      albumPage.style.cssText = `position:fixed;top:0;left:0;width:${H}px;height:${W}px;aspect-ratio:unset;transform-origin:top left;transform:rotate(90deg) translate(0px,${-W}px);overflow:hidden;`;
    }
    rotateOverlay.classList.remove('bp-rotate-visible');
    if (!panController) panController = initBracketPan(wrapper, contentEl, header);
  }

  rotateOverlay.querySelector('.bp-rotate-btn').addEventListener('click', async () => {
    // 1. Intentar fullscreen + lock nativo
    try {
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      await screen.orientation.lock('landscape');
      return; // el resize/orientationchange ocultará el overlay
    } catch (_) {}
    // 2. Fallback: rotación JS sobre album-page
    applyForcedLandscape();
  });

  function isPortrait() {
    return window.innerWidth <= 1100 && window.innerWidth < window.innerHeight;
  }

  function checkOrientation() {
    if (forcedLandscape) return;
    if (isPortrait()) {
      rotateOverlay.classList.add('bp-rotate-visible');
      if (panController) { panController.destroy(); panController = null; }
    } else {
      rotateOverlay.classList.remove('bp-rotate-visible');
      if (!panController && window.innerWidth <= 1100) {
        panController = initBracketPan(wrapper, contentEl, header);
      }
    }
  }

  checkOrientation();
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);

  function goBack() {
    window.removeEventListener('resize', checkOrientation);
    window.removeEventListener('orientationchange', checkOrientation);
    if (panController) { panController.destroy(); panController = null; }
    try { unsubUser(); } catch {}
    try { unsubServer(); } catch {}
    try { unsubKO(); } catch {}
    screen.orientation?.unlock?.();
    // Limpiar estilos inline si se usó rotación forzada
    if (forcedLandscape) {
      const albumPage  = wrapper.parentElement;
      const albumShell = albumPage?.parentElement;
      if (albumPage)  albumPage.style.cssText  = '';
      if (albumShell) albumShell.style.cssText = '';
    }
    rotateOverlay.remove();
    router.navigate(previousCountryId ? `/${previousCountryId}` : '/mexico');
  }

  header.querySelector('.bp-back-btn').addEventListener('click', goBack);

  return AlbumPage({ backgroundUrl: null, children: fragment, showClientBadge: false });
}
