/**
 * Dynamic SEO — updates <title>, meta description, og:*, canonical, and JSON-LD
 * per route without a full page reload.
 */

const BASE_URL  = 'https://albumfifa2026.chanzia.com';
const BASE_DESC = 'Álbum virtual de cromos del FIFA World Cup 2026. Colecciona figuritas de las 48 selecciones participantes, intercambia cromos repetidos y sigue los resultados en tiempo real.';

const COUNTRY_NAMES = {
  mexico:               'México',
  southafrica:          'Sudáfrica',
  korearepublic:        'Corea del Sur',
  czechia:              'Chequia',
  canada:               'Canadá',
  bosniaandherzegovina: 'Bosnia y Herzegovina',
  qatar:                'Qatar',
  switzerland:          'Suiza',
  brazil:               'Brasil',
  morocco:              'Marruecos',
  haiti:                'Haití',
  scotland:             'Escocia',
  unitedstates:         'Estados Unidos',
  paraguay:             'Paraguay',
  australia:            'Australia',
  turkiye:              'Turquía',
  germany:              'Alemania',
  curacao:              'Curazao',
  cotedivoire:          'Costa de Marfil',
  ecuador:              'Ecuador',
  netherlands:          'Países Bajos',
  japan:                'Japón',
  sweden:               'Suecia',
  tunisia:              'Túnez',
  belgium:              'Bélgica',
  egypt:                'Egipto',
  iran:                 'Irán',
  newzealand:           'Nueva Zelanda',
  spain:                'España',
  capeverde:            'Cabo Verde',
  saudiarabia:          'Arabia Saudita',
  uruguay:              'Uruguay',
  france:               'Francia',
  senegal:              'Senegal',
  iraq:                 'Iraq',
  norway:               'Noruega',
  argentina:            'Argentina',
  algeria:              'Argelia',
  austria:              'Austria',
  jordan:               'Jordania',
  portugal:             'Portugal',
  drcongo:              'República D. del Congo',
  uzbekistan:           'Uzbekistán',
  colombia:             'Colombia',
  england:              'Inglaterra',
  croatia:              'Croacia',
  ghana:                'Ghana',
  panama:               'Panamá',
};

function setMeta(selector, attr, content) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  el.setAttribute(attr, content);
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function setJsonLdDynamic(data) {
  let el = document.getElementById('seo-jsonld-dynamic');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'seo-jsonld-dynamic';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function updateSEO(route) {
  const path = (route || '/').replace(/^\//, '');

  let title, description, canonical, jsonld;

  if (!path || path === '') {
    title       = 'Álbum FIFA World Cup 2026 | Colecciona cromos del Mundial';
    description = BASE_DESC;
    canonical   = `${BASE_URL}/`;
    jsonld      = null;
  } else if (path === 'simulation') {
    title       = 'Fixture y Simulador del Mundial 2026 | Álbum FIFA World Cup';
    description = 'Sigue el fixture completo del FIFA World Cup 2026, simula resultados y mira cómo avanzan las selecciones por la fase de grupos hasta la gran final.';
    canonical   = `${BASE_URL}/simulation`;
    jsonld = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: canonical,
    };
  } else if (path === 'trade') {
    title       = 'Intercambio de Cromos del Mundial 2026 | Álbum FIFA World Cup';
    description = 'Intercambia tus cromos repetidos del FIFA World Cup 2026 con otros fans. Selecciona los que ofreces y los que buscas y completa el trueque.';
    canonical   = `${BASE_URL}/trade`;
    jsonld = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: canonical,
    };
  } else if (COUNTRY_NAMES[path]) {
    const name  = COUNTRY_NAMES[path];
    title       = `${name} - Cromos del Mundial 2026 | Álbum FIFA World Cup`;
    description = `Colecciona los cromos de ${name} en el álbum del FIFA World Cup 2026. Pega las figuritas de los jugadores, conoce el plantel y sigue los resultados del grupo.`;
    canonical   = `${BASE_URL}/${path}`;
    jsonld = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: canonical,
      about: {
        '@type': 'SportsTeam',
        name,
        sport: 'Soccer',
      },
    };
  } else {
    return;
  }

  document.title = title;
  setMeta('meta[name="description"]',    'content', description);
  setMeta('meta[property="og:title"]',   'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]',     'content', canonical);
  setMeta('meta[name="twitter:title"]',  'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setCanonical(canonical);
  if (jsonld) setJsonLdDynamic(jsonld);
}
