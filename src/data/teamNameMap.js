/**
 * Mapeo de nombres de equipos desde world_cup_2026_matches.json
 * hacia los IDs internos del álbum (teamsData.json).
 */

export const teamNameToId = {
  'Mexico': 'mexico',
  'South Africa': 'southafrica',
  'South Korea': 'korearepublic',
  'Korea Republic': 'korearepublic',
  'Czechia': 'czechia',
  'Canada': 'canada',
  'Bosnia and Herzegovina': 'bosniaandherzegovina',
  'Qatar': 'qatar',
  'Switzerland': 'switzerland',
  'Brazil': 'brazil',
  'Morocco': 'morocco',
  'Haiti': 'haiti',
  'Scotland': 'scotland',
  'USA': 'unitedstates',
  'United States': 'unitedstates',
  'Paraguay': 'paraguay',
  'Australia': 'australia',
  'Türkiye': 'turkiye',
  'Turkiye': 'turkiye',
  'Germany': 'germany',
  'Curaçao': 'curacao',
  'Curacao': 'curacao',
  'Ivory Coast': 'cotedivoire',
  "Cote d'Ivoire": 'cotedivoire',
  'Ecuador': 'ecuador',
  'Netherlands': 'netherlands',
  'Japan': 'japan',
  'Sweden': 'sweden',
  'Tunisia': 'tunisia',
  'Belgium': 'belgium',
  'Egypt': 'egypt',
  'Iran': 'iran',
  'New Zealand': 'newzealand',
  'Spain': 'spain',
  'Cape Verde': 'capeverde',
  'Saudi Arabia': 'saudiarabia',
  'Uruguay': 'uruguay',
  'France': 'france',
  'Senegal': 'senegal',
  'Iraq': 'iraq',
  'Norway': 'norway',
  'Argentina': 'argentina',
  'Algeria': 'algeria',
  'Austria': 'austria',
  'Jordan': 'jordan',
  'Portugal': 'portugal',
  'Congo DR': 'drcongo',
  'DR Congo': 'drcongo',
  'Uzbekistan': 'uzbekistan',
  'Colombia': 'colombia',
  'England': 'england',
  'Croatia': 'croatia',
  'Ghana': 'ghana',
  'Panama': 'panama'
};

/**
 * Obtiene el ID interno de un equipo dado su nombre del JSON de partidos.
 * @param {string} name
 * @returns {string|null}
 */
export function getTeamId(name) {
  return teamNameToId[name] || null;
}

/**
 * Genera un slug simple a partir de un nombre (fallback).
 */
export function slugify(name) {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}
