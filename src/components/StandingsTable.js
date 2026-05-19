/**
 * Tabla de posiciones renderizada.
 */

import { getTeamId } from '../data/teamNameMap.js';
import { t } from '../i18n.js';

const flagCodeMap = {
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
  const code = id ? flagCodeMap[id] : null;
  return code ? `https://flagcdn.com/w40/${code}.png` : '';
}

export function StandingsTable({ standings, groupName }) {
  const el = document.createElement('div');
  el.className = 'standings-section';

  const title = document.createElement('div');
  title.className = 'standings-group-title';
  title.textContent = t('standings_group', { group: groupName });
  el.appendChild(title);

  const table = document.createElement('table');
  table.className = 'standings-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>${t('th_team')}</th>
        <th>${t('th_pj')}</th>
        <th>${t('th_pg')}</th>
        <th>${t('th_pe')}</th>
        <th>${t('th_pp')}</th>
        <th>${t('th_gf')}</th>
        <th>${t('th_gc')}</th>
        <th>${t('th_dg')}</th>
        <th>${t('th_pts')}</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  standings.forEach((team, idx) => {
    const row = document.createElement('tr');
    const flagUrl = getFlagUrl(team.name);
    const isTop = idx < 2; // Los 2 primeros clasifican

    row.innerHTML = `
      <td>
        <span class="standings-pos ${isTop ? 'top' : ''}">${idx + 1}</span>
        <div class="standings-flag">
          ${flagUrl ? `<img src="${flagUrl}" alt="${team.name}" loading="lazy">` : ''}
        </div>
        <span class="standings-team-name">${team.name}</span>
      </td>
      <td>${team.pj}</td>
      <td>${team.pg}</td>
      <td>${team.pe}</td>
      <td>${team.pp}</td>
      <td>${team.gf}</td>
      <td>${team.gc}</td>
      <td>${team.dg > 0 ? '+' + team.dg : team.dg}</td>
      <td class="standings-pts">${team.pts}</td>
    `;
    tbody.appendChild(row);
  });

  el.appendChild(table);
  return el;
}
