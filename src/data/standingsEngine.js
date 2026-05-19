/**
 * Motor de cálculo de tablas de posiciones.
 * Recibe partidos de un grupo + resultados guardados,
 * retorna equipos ordenados por posición FIFA.
 */
import { getFifaRank } from './fifaRanking.js';

/**
 * @typedef {Object} TeamStanding
 * @property {string} name
 * @property {number} pts  - puntos
 * @property {number} pj   - partidos jugados
 * @property {number} pg   - partidos ganados
 * @property {number} pe   - partidos empatados
 * @property {number} pp   - partidos perdidos
 * @property {number} gf   - goles a favor
 * @property {number} gc   - goles en contra
 * @property {number} dg   - diferencia de gol
 */

/**
 * Calcula la tabla de posiciones de un grupo.
 * @param {Array} groupMatches - Partidos del grupo (del JSON enriquecido)
 * @param {Object} results - { matchId: { homeGoals, awayGoals } }
 * @returns {TeamStanding[]}
 */
export function calculateStandings(groupMatches, results) {
  const table = new Map(); // name -> TeamStanding

  // Inicializar todos los equipos del grupo
  groupMatches.forEach(m => {
    if (!table.has(m.home)) {
      table.set(m.home, createEmpty(m.home));
    }
    if (!table.has(m.away)) {
      table.set(m.away, createEmpty(m.away));
    }
  });

  // Procesar partidos con resultados
  groupMatches.forEach(m => {
    const result = results[String(m.id)];
    if (!result) return;

    const home = table.get(m.home);
    const away = table.get(m.away);
    const hg = result.homeGoals;
    const ag = result.awayGoals;

    home.pj += 1;
    away.pj += 1;
    home.gf += hg;
    home.gc += ag;
    away.gf += ag;
    away.gc += hg;

    if (hg > ag) {
      home.pts += 3;
      home.pg += 1;
      away.pp += 1;
    } else if (hg < ag) {
      away.pts += 3;
      away.pg += 1;
      home.pp += 1;
    } else {
      home.pts += 1;
      away.pts += 1;
      home.pe += 1;
      away.pe += 1;
    }
  });

  // Calcular DG
  const standings = Array.from(table.values()).map(t => ({
    ...t,
    dg: t.gf - t.gc
  }));

  // Ordenar: pts → dg → gf → ranking FIFA (menor = mejor)
  standings.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg  !== a.dg)  return b.dg  - a.dg;
    if (b.gf  !== a.gf)  return b.gf  - a.gf;
    return getFifaRank(a.name) - getFifaRank(b.name);
  });

  return standings;
}

function createEmpty(name) {
  return { name, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0 };
}

/**
 * Calcula standings de todos los grupos de una sola vez.
 * @param {Array} allGroupMatches - Todos los partidos de fase de grupos
 * @param {Object} results
 * @returns {Map<string, TeamStanding[]>} group -> standings
 */
export function calculateAllStandings(allGroupMatches, results) {
  const byGroup = new Map();
  allGroupMatches.forEach(m => {
    const g = m.group;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(m);
  });

  const standingsMap = new Map();
  byGroup.forEach((matches, group) => {
    standingsMap.set(group, calculateStandings(matches, results));
  });

  return standingsMap;
}
