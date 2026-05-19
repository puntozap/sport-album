import { router, getCompanySlug } from './router.js';
import { countries, getCountryById, patchPlayerNames } from './data/countries.js';
import { CountryPage } from './components/CountryPage.js';
import { BracketPage } from './components/BracketPage.js';
import { TradePage } from './components/TradePage.js';
import { TradeRoom } from './components/TradeRoom.js';
import { empty } from './utils/dom.js';
import { initPageSwipe } from './components/PageSwipe.js';
import { initResponsiveScale } from './utils/scale.js';
import { showCountryCurtain } from './components/CountryCurtain.js';
import { t } from './i18n.js';
import { showLoadingSplash, hideLoadingSplash } from './components/LoadingSplash.js';
import { serverResultsStore } from './data/serverResultsStore.js';
import { updateSEO } from './seo.js';

async function fetchPlayerOverrides() {
  try {
    const r = await fetch('/api/players-override.json', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    if (data && typeof data === 'object' && !Array.isArray(data)) patchPlayerNames(data);
  } catch {}
}

async function fetchMatchOverrides() {
  try {
    const r = await fetch('/api/matches-override.json', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    // Convertir { "1": { home_score, away_score, status } } → formato interno
    const converted = {};
    Object.entries(data).forEach(([matchId, result]) => {
      if (result.home_score != null && result.away_score != null) {
        // Normalizar la clave a string de entero (ej: "1.0" → "1")
        const key = String(Number(matchId)) !== 'NaN' ? String(Math.round(Number(matchId))) : matchId;
        converted[key] = {
          homeGoals: Number(result.home_score),
          awayGoals: Number(result.away_score),
          status: result.status || 'played',
        };
      }
    });
    serverResultsStore.setAll(converted);
  } catch {}
}

const appRoot = document.getElementById('app');
const allCountryIds = countries.map(c => c.id);
let swipeController = null;
let lastCountryId = 'mexico';

async function renderCountry(countryId) {
  const country = getCountryById(countryId);
  if (!country) {
    appRoot.innerHTML = `<h1>${t('country_not_found')}</h1>`;
    return;
  }

  lastCountryId = countryId;
  showLoadingSplash();
  try {
    empty(appRoot);
    const page = await CountryPage({ country, allCountryIds });
    appRoot.appendChild(page);
  } finally {
    hideLoadingSplash();
  }

  if (swipeController) {
    swipeController.update(countryId);
  }
}

function renderBracket() {
  showLoadingSplash();
  try {
    empty(appRoot);
    const page = BracketPage({ previousCountryId: lastCountryId });
    appRoot.appendChild(page);
  } finally {
    hideLoadingSplash();
  }

  if (swipeController) {
    swipeController.update('simulation');
  }
}

// Registrar rutas con efecto telón
countries.forEach(country => {
  router.on(`/${country.id}`, async () => {
    empty(appRoot);
    lastCountryId = country.id;
    updateSEO(`/${country.id}`);

    // Traer nombres editados antes de renderizar
    await fetchPlayerOverrides();

    // Renderizar la página por debajo de la cortina mientras está visible
    const page = CountryPage({ country, allCountryIds });
    appRoot.appendChild(page);

    // Promesa que resuelve cuando todos los cromos cargaron (o fallaron)
    const stickerImgs = Array.from(appRoot.querySelectorAll('img.slot-sticker'));
    const readyPromise = stickerImgs.length === 0
      ? Promise.resolve()
      : new Promise(resolve => {
          let pending = stickerImgs.length;
          const done = () => { if (--pending === 0) resolve(); };
          stickerImgs.forEach(img => {
            if (img.complete) { done(); }
            else {
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            }
          });
        });

    showCountryCurtain(country.id, () => {
      if (swipeController) swipeController.update(country.id);
    }, readyPromise);
  });
});

// Ruta raíz → redirige al primer país
router.on('/', () => router.navigate('/mexico'));

// Ruta del simulador
router.on('/simulation', () => {
  empty(appRoot);
  updateSEO('/simulation');
  renderBracket();
});

// Ruta de intercambio de cromos (overlay, se monta en body)
router.on('/trade', () => {
  updateSEO('/trade');
  if (!document.querySelector('.trade-overlay')) TradePage();
});

router.on('/404', (path) => {
  // /trade/:id — sala de intercambio
  const tradeMatch = path?.match(/^\/trade\/(.+)$/);
  if (tradeMatch) {
    if (!document.querySelector('.trade-overlay')) TradeRoom({ tradeId: tradeMatch[1] });
    return;
  }
  appRoot.innerHTML = `<h1>${t('page_not_found')}</h1>`;
});

const MATCH_POLL_INTERVAL = 30_000; // 30 segundos

export function initApp() {
  // Arrancar polling de resultados desde el servidor
  fetchMatchOverrides();
  setInterval(fetchMatchOverrides, MATCH_POLL_INTERVAL);

  swipeController = initPageSwipe({
    appRoot,
    allIds: allCountryIds,
    getCurrentId: () => {
      const slug = getCompanySlug();
      let raw = window.location.hash.slice(1) || window.location.pathname || '/mexico';
      if (slug) {
        const prefix = '/' + slug;
        if (raw.startsWith(prefix + '/')) raw = raw.slice(prefix.length);
        else if (raw === prefix) raw = '/';
      }
      return raw.replace(/^\//, '') || 'mexico';
    }
  });

  initResponsiveScale();
  router.resolve();
}
