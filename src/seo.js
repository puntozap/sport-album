/**
 * Dynamic SEO — updates <title>, meta description, og:*, canonical, hreflang and JSON-LD
 * per route and language without a full page reload.
 */

import { getLang } from './i18n.js';

const BASE_URL = 'https://sportalbum.chanzia.com';

const COUNTRY_NAMES = {
  es: {
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
  },
  en: {
    mexico:               'Mexico',
    southafrica:          'South Africa',
    korearepublic:        'South Korea',
    czechia:              'Czechia',
    canada:               'Canada',
    bosniaandherzegovina: 'Bosnia and Herzegovina',
    qatar:                'Qatar',
    switzerland:          'Switzerland',
    brazil:               'Brazil',
    morocco:              'Morocco',
    haiti:                'Haiti',
    scotland:             'Scotland',
    unitedstates:         'United States',
    paraguay:             'Paraguay',
    australia:            'Australia',
    turkiye:              'Türkiye',
    germany:              'Germany',
    curacao:              'Curaçao',
    cotedivoire:          "Côte d'Ivoire",
    ecuador:              'Ecuador',
    netherlands:          'Netherlands',
    japan:                'Japan',
    sweden:               'Sweden',
    tunisia:              'Tunisia',
    belgium:              'Belgium',
    egypt:                'Egypt',
    iran:                 'Iran',
    newzealand:           'New Zealand',
    spain:                'Spain',
    capeverde:            'Cape Verde',
    saudiarabia:          'Saudi Arabia',
    uruguay:              'Uruguay',
    france:               'France',
    senegal:              'Senegal',
    iraq:                 'Iraq',
    norway:               'Norway',
    argentina:            'Argentina',
    algeria:              'Algeria',
    austria:              'Austria',
    jordan:               'Jordan',
    portugal:             'Portugal',
    drcongo:              'DR Congo',
    uzbekistan:           'Uzbekistan',
    colombia:             'Colombia',
    england:              'England',
    croatia:              'Croatia',
    ghana:                'Ghana',
    panama:               'Panama',
  },
};

const COPY = {
  es: {
    home_title:    'Álbum de Figuritas 2026 | Colecciona cromos del Mundial',
    home_desc:     'Álbum virtual de figuritas del Mundial 2026. Colecciona cromos de las 48 selecciones participantes, intercambia repetidos y sigue los resultados en tiempo real.',
    sim_title:     'Fixture y Simulador del Mundial 2026 | Álbum de Figuritas',
    sim_desc:      'Sigue el fixture completo del Mundial 2026, simula resultados y mira cómo avanzan las selecciones por la fase de grupos hasta la gran final.',
    trade_title:   'Intercambio de Cromos del Mundial 2026 | Álbum de Figuritas',
    trade_desc:    'Intercambia tus cromos repetidos del Mundial 2026 con otros fans. Selecciona los que ofreces y los que buscas y completa el trueque.',
    country_title: (name) => `${name} - Cromos del Mundial 2026 | Álbum de Figuritas`,
    country_desc:  (name) => `Colecciona los cromos de ${name} en el álbum de figuritas del Mundial 2026. Pega las figuritas de los jugadores, conoce el plantel y sigue los resultados del grupo.`,
  },
  en: {
    home_title:    '2026 Sticker Album | Collect World Cup Cards',
    home_desc:     'Virtual sticker album for the 2026 World Cup. Collect cards from all 48 teams, trade duplicates and follow the results in real time.',
    sim_title:     '2026 World Cup Fixture & Simulator | Sticker Album',
    sim_desc:      'Follow the full 2026 World Cup fixture, simulate results and track how teams advance from the group stage to the final.',
    trade_title:   '2026 World Cup Sticker Trade | Sticker Album',
    trade_desc:    'Trade your duplicate stickers from the 2026 World Cup with other fans. Select what you offer and what you need to complete the swap.',
    country_title: (name) => `${name} - 2026 World Cup Stickers | Sticker Album`,
    country_desc:  (name) => `Collect ${name} stickers in the 2026 World Cup sticker album. Stick your player cards, explore the squad and follow group results.`,
  },
};

// ── DOM helpers ───────────────────────────────────────────────────────────────

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

function setHreflang(path) {
  ['es', 'en', 'x-default'].forEach(lang => {
    const id = `hreflang-${lang}`;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('link');
      el.id = id;
      el.setAttribute('rel', 'alternate');
      el.setAttribute('hreflang', lang);
      document.head.appendChild(el);
    }
    el.setAttribute('href', `${BASE_URL}/${path}`);
  });
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

// ── Main export ───────────────────────────────────────────────────────────────

export function updateSEO(route) {
  const path  = (route || '/').replace(/^\//, '');
  const lang  = getLang() || 'es';
  const copy  = COPY[lang] || COPY.es;
  const names = COUNTRY_NAMES[lang] || COUNTRY_NAMES.es;

  let title, description, canonical, jsonld;

  if (!path || path === '') {
    title       = copy.home_title;
    description = copy.home_desc;
    canonical   = `${BASE_URL}/`;
    jsonld      = null;

  } else if (path === 'simulation') {
    title       = copy.sim_title;
    description = copy.sim_desc;
    canonical   = `${BASE_URL}/simulation`;
    jsonld = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical };

  } else if (path === 'trade') {
    title       = copy.trade_title;
    description = copy.trade_desc;
    canonical   = `${BASE_URL}/trade`;
    jsonld = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical };

  } else if (names[path]) {
    const name  = names[path];
    title       = copy.country_title(name);
    description = copy.country_desc(name);
    canonical   = `${BASE_URL}/${path}`;
    jsonld = {
      '@context': 'https://schema.org',
      '@type':    'CollectionPage',
      name, description, url: canonical,
      about: { '@type': 'SportsTeam', name, sport: 'Soccer' },
    };

  } else {
    return;
  }

  document.title = title;
  setMeta('meta[name="description"]',         'content', description);
  setMeta('meta[property="og:title"]',        'content', title);
  setMeta('meta[property="og:description"]',  'content', description);
  setMeta('meta[property="og:url"]',          'content', canonical);
  setMeta('meta[name="twitter:title"]',       'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setMeta('meta[property="og:locale"]',       'content', lang === 'es' ? 'es_ES' : 'en_US');
  setCanonical(canonical);
  setHreflang(path);
  if (jsonld) setJsonLdDynamic(jsonld);
}
