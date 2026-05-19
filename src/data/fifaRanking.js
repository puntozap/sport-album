/**
 * Ranking FIFA de los 48 equipos del Mundial 2026.
 * Fuente: ranking FIFA mayo 2025.
 * Menor número = mejor ranking (1 es el mejor).
 */
export const FIFA_RANKING = {
  'Argentina':            1,
  'Spain':                2,
  'France':               3,
  'England':              4,
  'Brazil':               5,
  'Portugal':             6,
  'Netherlands':          7,
  'Belgium':              8,
  'Germany':              9,
  'Colombia':            10,
  'Uruguay':             11,
  'Morocco':             13,
  'Japan':               15,
  'United States':       16,
  'Mexico':              17,
  'Switzerland':         19,
  'Croatia':             20,
  'Senegal':             21,
  'Iran':                22,
  'Austria':             23,
  'Korea Republic':      24,
  'Canada':              25,
  'Ecuador':             26,
  'Sweden':              27,
  'Norway':              28,
  'Australia':           29,
  'Turkiye':             30,
  'Tunisia':             32,
  'Paraguay':            34,
  'Egypt':               35,
  'Scotland':            39,
  'Uzbekistan':          57,
  'Algeria':             42,
  'Saudi Arabia':        56,
  'South Africa':        60,
  'DR Congo':            62,
  'Iraq':                63,
  'Czechia':             37,
  'Panama':              72,
  'Cote d\'Ivoire':      48,
  'Ghana':               66,
  'Jamaica':             56,
  'Cape Verde':          81,
  'Jordan':              88,
  'Bosnia and Herzegovina': 65,
  'Qatar':               37,
  'Haiti':              103,
  'New Zealand':         95,
  'Curacao':            132,
};

/**
 * Devuelve el ranking FIFA de un equipo por nombre.
 * Si no se encuentra, retorna 999 (peor posible).
 */
export function getFifaRank(teamName) {
  return FIFA_RANKING[teamName] ?? 999;
}
