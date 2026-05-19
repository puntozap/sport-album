// Nombres de federaciones formateados por país
// Usa <br> para saltos de línea

const federationMap = {
  'Mexico': 'Federación<br>Mexicana de Fútbol<br>Asociación, A.C.',
  'Canada': 'Canadian<br>Soccer Association',
  'United States': 'U.S. Soccer<br>Federation',
  'Brazil': 'Confederação<br>Brasileira de Futebol',
  'Argentina': 'Asociación del<br>Fútbol Argentino',
  'Germany': 'Deutscher<br>Fußball-Bund',
  'France': 'Fédération<br>Française de Football',
  'England': 'The Football<br>Association',
  'Spain': 'Real Federación<br>Española de Fútbol',
  'Portugal': 'Federação<br>Portuguesa de Futebol',
  'Netherlands': 'Koninklijke<br>Nederlandse Voetbalbond',
  'Belgium': 'Union Royale<br>Belge des Sociétés de Football',
  'Italy': 'Federazione<br>Italiana Giuoco Calcio',
};

export function getFederationName(countryName) {
  return federationMap[countryName] || countryName;
}
