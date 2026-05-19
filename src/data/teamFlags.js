/**
 * Lista de todas las banderas de los 48 equipos del Mundial 2026.
 * Usa las mismas URLs que el resto de la app (flagcdn.com).
 */

import teamsData from './teamsData.json';

export const ALL_TEAM_FLAGS = teamsData.teams.map(team => ({
  name: team.name,
  flag: team.flag,
  code: team.code,
  group: team.groupName
}));

/**
 * Obtiene URLs de banderas para usar en el fondo animado.
 * @param {number} count - cuántas banderas devolver
 * @returns {Array<{url: string, name: string}>}
 */
export function getRandomFlags(count = 20) {
  const shuffled = [...ALL_TEAM_FLAGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(t => ({
    url: `https://flagcdn.com/w80/${t.flag}.png`,
    name: t.name
  }));
}
