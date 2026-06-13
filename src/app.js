import { router, getCompanySlug } from './router.js';
import { downloadAlbumPdf } from './components/AlbumPdfExport.js';
import { countries, getCountryById, patchPlayerNames } from './data/countries.js';
import { isEmpresaMode, getEmpresaEntities } from './data/albumContext.js';
import { CountryPage } from './components/CountryPage.js';
import { BracketPage } from './components/BracketPage.js';
import { GivePage } from './components/GivePage.js';
import { GiftCreatorPage } from './components/GiftCreatorPage.js';
import { ReceivePage } from './components/ReceivePage.js';
import { handleScanRoute } from './components/ScanPage.js';
import { SharePage } from './components/SharePage.js';
import { PongPage } from './components/PongPage.js';
import { ARPage } from './components/ARPage.js';
import { FindPage } from './components/FindPage.js';
import { MapPage } from './components/MapPage.js';
import { empty } from './utils/dom.js';
import { initPageSwipe } from './components/PageSwipe.js';
import { initResponsiveScale } from './utils/scale.js';
import { showCountryCurtain } from './components/CountryCurtain.js';
import { t } from './i18n.js';
import { showLoadingSplash, hideLoadingSplash } from './components/LoadingSplash.js';
import { serverResultsStore } from './data/serverResultsStore.js';
import { updateSEO } from './seo.js';
import { restoreMusicPlayer } from './components/MusicPlayer.js';

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
    const converted = {};
    Object.entries(data).forEach(([matchId, result]) => {
      if (result.home_score != null && result.away_score != null) {
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
let swipeController = null;
let lastEntityId = null;

function getActiveEntities() {
  return isEmpresaMode() ? getEmpresaEntities() : countries;
}

function getEntityById(id) {
  return getActiveEntities().find(e => e.id === id) || null;
}

async function renderEntity(entityId) {
  const entity = getEntityById(entityId);
  if (!entity) {
    appRoot.innerHTML = `<h1>${t('country_not_found')}</h1>`;
    return;
  }

  lastEntityId = entityId;
  showLoadingSplash();
  try {
    empty(appRoot);
    const allIds = getActiveEntities().map(e => e.id);
    const page = await CountryPage({ country: entity, allCountryIds: allIds });
    appRoot.appendChild(page);
  } finally {
    hideLoadingSplash();
  }

  if (swipeController) swipeController.update(entityId);
}

function renderBracket() {
  showLoadingSplash();
  try {
    empty(appRoot);
    const page = BracketPage({ previousCountryId: lastEntityId });
    appRoot.appendChild(page);
  } finally {
    hideLoadingSplash();
  }

  if (swipeController) swipeController.update('simulation');
}

const MATCH_POLL_INTERVAL = 30_000;

export function initApp() {
  const activeEntities = getActiveEntities();
  const allEntityIds = activeEntities.map(e => e.id);
  lastEntityId = allEntityIds[0] || 'mexico';

  // La música solo se inicia cuando el usuario la selecciona desde el botón 🎵

  // Rutas de entidades (países FIFA o entidades empresa)
  activeEntities.forEach(entity => {
    router.on(`/${entity.id}`, async () => {
      empty(appRoot);
      lastEntityId = entity.id;
      updateSEO(`/${entity.id}`);

      if (!isEmpresaMode()) await fetchPlayerOverrides();

      const allIds = allEntityIds;
      const page = CountryPage({ country: entity, allCountryIds: allIds });
      appRoot.appendChild(page);

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

      if (window._skipNextCurtain) {
        window._skipNextCurtain = false;
        if (swipeController) swipeController.update(entity.id);
      } else {
        showCountryCurtain(entity.id, () => {
          if (swipeController) swipeController.update(entity.id);
        }, readyPromise);
      }
    });
  });

  // Ruta raíz → primera entidad
  router.on('/', () => router.navigate('/' + (allEntityIds[0] || 'mexico')));

  // Simulador y bracket solo en modo FIFA
  if (!isEmpresaMode()) {
    fetchMatchOverrides();
    setInterval(fetchMatchOverrides, MATCH_POLL_INTERVAL);

    router.on('/simulation', () => {
      empty(appRoot);
      updateSEO('/simulation');
      renderBracket();
    });
  }

  // Regalar cromos (QR físico)
  router.on('/give', () => {
    updateSEO('/give');
    if (!document.querySelector('.gr-overlay')) GivePage();
  });

  // Crear regalo de cromos (elige país + slots desde duplicados)
  router.on('/gift-creator', () => {
    updateSEO('/gift-creator');
    if (!document.querySelector('.gc-overlay')) GiftCreatorPage();
  });

  // Share
  router.on('/share', () => {
    document.getElementById('share-page')?.remove();
    document.body.appendChild(SharePage());
  });

  // Pong multijugador
  router.on('/pong', () => {
    document.getElementById('pong-page')?.remove();
    PongPage();
  });

  // AR: colocar cromo en la ciudad (admin)
  router.on('/ar', () => {
    document.getElementById('ar-page')?.remove();
    ARPage();
  });

  // Find: buscar cromo en la ciudad (usuario)
  router.on('/find', () => {
    document.getElementById('find-page')?.remove();
    FindPage();
  });

  // Map: mapa público de todos los cromoses escondidos
  router.on('/map', () => {
    document.getElementById('map-page')?.remove();
    MapPage();
  });

  // Descarga directa del PDF por URL
  router.on('/pdf', () => {
    router.navigate('/' + (allEntityIds[0] || 'mexico'));
    setTimeout(() => downloadAlbumPdf(), 400);
  });

  router.on('/404', (path) => {
    const receiveMatch = path?.match(/^\/receive\/(.+)$/);
    if (receiveMatch) {
      document.querySelector('.rv-overlay')?.remove();
      ReceivePage({ transferId: receiveMatch[1] });
      return;
    }

    // Intercambio de cromos QR: /scan?need=... o /scan?give=...
    if (path?.match(/^\/scan(\?.*)?$/)) {
      document.querySelector('.sc-overlay')?.remove();
      handleScanRoute(path);
      return;
    }

    appRoot.innerHTML = `<h1>${t('page_not_found')}</h1>`;
  });

  swipeController = initPageSwipe({
    appRoot,
    allIds: allEntityIds,
    getCurrentId: () => {
      const slug = getCompanySlug();
      let raw = window.location.hash.slice(1) || window.location.pathname || '/' + lastEntityId;
      if (slug) {
        const prefix = '/' + slug;
        if (raw.startsWith(prefix + '/')) raw = raw.slice(prefix.length);
        else if (raw === prefix) raw = '/';
      }
      return raw.replace(/^\//, '') || lastEntityId;
    }
  });

  initResponsiveScale();
  router.resolve();
}
