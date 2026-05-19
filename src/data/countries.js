import { getAllTeams } from './teamsLoader.js';
import { getFederationName } from './federationNames.js';
import { getStickerUrl } from './stickerLoader.js';

// Posiciones estandar de slots (mismo layout para todos los paises)
// Ajustadas al mockup del album Panini
const slotPositions = [
  // Lado izquierdo - fila superior (3 slots)
  { left: '5.5%',  top: '38.0%' },
  { left: '20.0%', top: '38.0%' },
  { left: '35.0%', top: '38.0%' },
  // Lado izquierdo - fila inferior (2 slots) — botón arriba-derecha
  { left: '5.5%',  top: '72.0%', btnCorner: 'top-right' },
  { left: '20.0%', top: '72.0%', btnCorner: 'top-right' },
  // Lado derecho - fila superior (3 slots)
  { left: '57.0%', top: '7.0%' },
  { left: '71.0%', top: '7.0%' },
  { left: '85.0%', top: '7.0%' },
  // Lado derecho - fila media (3 slots)
  { left: '57.0%', top: '38.0%' },
  { left: '71.0%', top: '38.0%' },
  { left: '85.0%', top: '38.0%' },
  // Lado derecho - fila inferior (1 slot) — botón arriba-izquierda
  { left: '85.0%', top: '72.0%', btnCorner: 'top-left' }
];

function buildSlots(code, players, countryId) {
  const playerMap = new Map();
  if (players) {
    players.forEach(p => playerMap.set(p.slot, p));
  }

  return slotPositions.map((pos, idx) => {
    const player = playerMap.get(idx);
    const isSpecial = idx === 0;
    const playerName = player && player.name ? player.name : (isSpecial ? '\u00A0' : `${code}\n${idx}`);

    return {
      number: idx,
      name: playerName,
      originalName: playerName,
      type: isSpecial ? 'gold' : 'normal',
      pos,
      btnCorner: pos.btnCorner || 'bottom-left',
      stickerUrl: getStickerUrl(countryId, idx)
    };
  });
}

function buildCountry(team) {
  const id = team.name.toLowerCase().replace(/[^a-z]/g, '');
  
  // Obtener los otros 3 equipos del grupo
  const groupTeams = Object.values(team.groupTeams || {});
  
  return {
    id,
    code: team.code,
    name: team.name,
    pageIndex: team.pageIndex,
    theme: id,
    colors: team.colors,
    layout: 'standard',
    slots: buildSlots(team.code, team.players, id),
    federation: {
      name: getFederationName(team.name),
      flag: team.flag
    },
    group: {
      name: team.groupName,
      countries: team.groupCountries || []
    }
  };
}

// Generar todos los paises a partir de worldCupTeams
const teams = getAllTeams();

// Enriquecer con datos de grupo
const groupMap = {};
teams.forEach(t => {
  if (!groupMap[t.groupName]) groupMap[t.groupName] = [];
  groupMap[t.groupName].push(t);
});

teams.forEach(t => {
  t.groupTeams = groupMap[t.groupName];
  t.groupCountries = groupMap[t.groupName].map(g => ({
    code: g.code,
    flag: g.flag,
    name: g.name
  }));
});

export const countries = teams.map(buildCountry);

export function getCountryById(id) {
  return countries.find(c => c.id === id);
}

/**
 * Aplica el mapa de URLs recibido de n8n sobre los slots ya construidos.
 * Se llama una vez que fetchStickerMap() resuelve con datos de Google Drive.
 * Las páginas de país renderizadas DESPUÉS de esta llamada usarán las URLs de Drive.
 */
/**
 * Aplica overrides de nombres de jugadores desde players-override.json.
 * { "MEX": { "1": "Nuevo nombre", "5": "Otro" }, ... }
 */
export function patchPlayerNames(overrides) {
  if (!overrides || typeof overrides !== 'object') return;
  countries.forEach(country => {
    const teamOverrides = overrides[country.code] || {};
    country.slots.forEach(slot => {
      const override = teamOverrides[String(slot.number)];
      // Partir siempre del nombre original para que los resets funcionen
      slot.name = override || slot.originalName;
    });
  });
}

export function patchStickerUrls(urlMap) {
  if (!urlMap || typeof urlMap !== 'object') return;
  countries.forEach(country => {
    const urls = urlMap[country.id];
    if (!Array.isArray(urls)) return;
    country.slots.forEach((slot, idx) => {
      slot.stickerUrl = urls[idx] ?? null;
    });
  });
}
