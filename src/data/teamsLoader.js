/**
 * Carga los datos de equipos desde teamsData.json.
 * Este JSON contiene: equipos, colores, jugadores por slot, grupos.
 */
import teamsData from './teamsData.json';

export function getAllTeams() {
  return teamsData.teams || [];
}

export function getTeamByCode(code) {
  return teamsData.teams.find(t => t.code === code) || null;
}

export function getTeamsByGroup() {
  const groups = {};
  for (const team of teamsData.teams) {
    if (!groups[team.groupName]) groups[team.groupName] = [];
    groups[team.groupName].push(team);
  }
  return groups;
}

export function getPlayerName(teamCode, slotIndex) {
  const team = getTeamByCode(teamCode);
  if (!team || !team.players) return null;
  const player = team.players.find(p => p.slot === slotIndex);
  return player ? player.name : null;
}
