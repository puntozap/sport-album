/**
 * Carga y exposición de datos de partidos del Mundial 2026.
 * Lee world_cup_2026_matches.json y provee helpers de filtrado.
 */

import matchesJson from './world_cup_2026_matches.json';
import { getTeamId } from './teamNameMap.js';

const ALL_MATCHES = matchesJson.matches || [];

// Enriquecer cada partido con teamIds para consistencia con el álbum
const enrichedMatches = ALL_MATCHES.map(m => ({
  ...m,
  homeId: getTeamId(m.home) || null,
  awayId: getTeamId(m.away) || null
}));

// Solo partidos de fase de grupos (los que tienen group definido)
const GROUP_MATCHES = enrichedMatches.filter(m => m.stage === 'group');

/**
 * Todos los partidos (incluye eliminatorias si existen).
 */
export function getAllMatches() {
  return enrichedMatches;
}

/**
 * Solo partidos de fase de grupos.
 */
export function getGroupMatches() {
  return GROUP_MATCHES;
}

/**
 * Partidos filtrados por grupo (A-L).
 * @param {string} group - ej: 'A', 'B'
 */
export function getMatchesByGroup(group) {
  return GROUP_MATCHES.filter(m => m.group === group.toUpperCase());
}

/**
 * Partidos agrupados por fecha.
 * Retorna: Map<string, Match[]> donde la key es la fecha (YYYY-MM-DD).
 */
export function getMatchesByDate() {
  const map = new Map();
  GROUP_MATCHES.forEach(m => {
    const date = m.date;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(m);
  });
  // Ordenar fechas cronológicamente
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/**
 * Lista única de grupos presentes en los partidos.
 */
export function getGroups() {
  const groups = new Set(GROUP_MATCHES.map(m => m.group));
  return [...groups].sort();
}

/**
 * Lista única de equipos que participan en fase de grupos.
 */
export function getTeamsInGroups() {
  const teams = new Set();
  GROUP_MATCHES.forEach(m => {
    teams.add(m.home);
    teams.add(m.away);
  });
  return [...teams].sort();
}

/**
 * Obtener un partido por su ID.
 */
export function getMatchById(id) {
  return enrichedMatches.find(m => m.id === id) || null;
}

/**
 * Partidos en los que participa un equipo específico.
 * Compara por nombre Y por ID para tolerar variantes (ej: "South Korea" vs "Korea Republic").
 * @param {string} teamName - nombre del equipo en el álbum
 */
export function getMatchesByTeam(teamName) {
  const teamId = getTeamId(teamName) || teamName.toLowerCase().replace(/[^a-z]/g, '');
  return GROUP_MATCHES.filter(m =>
    m.home === teamName || m.away === teamName ||
    m.homeId === teamId  || m.awayId === teamId
  );
}
