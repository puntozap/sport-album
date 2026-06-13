import './styles/main.css';
import './styles/pwa-install.css';
import './styles/pwa-gate.css';
import './styles/trade-market.css';
import './styles/client-brand.css';
import './styles/neon-background.css';
import './styles/desktop-background.css';
import './styles/app.css';
import './styles/album-book-background.css';
import './styles/swipe.css';
import './styles/curtain.css';
import './styles/sticker-reveal.css';
import './styles/fixture.css';
import './styles/bracket-page.css';
import './styles/loading-splash.css';
import './styles/language-welcome.css';
import './styles/floating-actions.css';
import './styles/pack-opener.css';
import './styles/sticker-tray.css';
import './styles/share-page.css';
import './styles/whats-new.css';
import './styles/no-packs-modal.css';
import './styles/match-notif-modal.css';
import './styles/last-sticker-celebration.css';
import './styles/low-perf.css';
import './styles/paramount-page.css';
import './styles/blog-page.css';
import './styles/sticker-trade.css';
import { initAppGate } from './components/PWAGate.js';
import { initApp } from './app.js';
import { initPerfMonitor } from './utils/perfMonitor.js';
import { initI18n } from './i18n.js';
import { showLanguageWelcome } from './components/LanguageWelcome.js';
import { createNeonBackground } from './components/NeonBackground.js';
import { createDesktopBackground } from './components/DesktopBackground.js';
import { CLIENT, loadCompanyConfig } from './config/client.js';
import { setCompanySlug } from './router.js';
import { fetchStickerMap } from './data/stickerLoader.js';
import { patchStickerUrls } from './data/countries.js';
import { loadEmpresaAlbum } from './data/empresaLoader.js';
import { initStickerTray } from './components/StickerTray.js';
import { showWhatsNewIfNeeded } from './components/WhatsNewModal.js';
import './components/PWAInstall.js';
import { initPushNotifications } from './utils/pushNotify.js';
import { checkMatchNotifModal } from './components/MatchNotifModal.js';

async function start() {
  // ── Gate: si la app está instalada, bloquear la web ─────────
  const gated = await initAppGate();
  if (gated) return;

  // ── Detectar empresa en la URL ──────────────────────────────
  // Si la URL es /isacell/mexico, el primer segmento "isacell" es la empresa.
  // Intentamos cargar /empresas/isacell/config.json — si existe, activamos branding.
  const segments = window.location.pathname.split('/').filter(Boolean);
  const RESERVED = ['simulation', '404', 'api', 'assets', 'empresas'];
  const potentialSlug = segments[0];

  if (potentialSlug && !RESERVED.includes(potentialSlug)) {
    const loaded = await loadCompanyConfig(potentialSlug);
    if (loaded) {
      setCompanySlug(potentialSlug);
      // Intentar cargar el álbum empresarial; si no existe, el modo se queda en 'fifa'
      const isEmpresa = await loadEmpresaAlbum(potentialSlug);
      if (isEmpresa) document.body.classList.add('empresa-album');
    }
  }

  // ── Aplicar color primario al root ──────────────────────────
  if (CLIENT.active && CLIENT.primaryColor) {
    document.documentElement.style.setProperty('--client-color', CLIENT.primaryColor);
  }

  // ── Service Worker ──────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  // ── Cromos remotos (n8n + Drive) ────────────────────────────
  fetchStickerMap().then(map => { if (map) patchStickerUrls(map); });

  // ── UI ───────────────────────────────────────────────────────
  createNeonBackground();
  createDesktopBackground();
  initPerfMonitor();
  initPushNotifications();

  const userHadLang = !!localStorage.getItem('lang');
  if (userHadLang) {
    initI18n();
    initApp();
    initStickerTray();
    showWhatsNewIfNeeded();
    checkMatchNotifModal();
  } else {
    showLanguageWelcome(() => {
      initI18n();
      initApp();
      initStickerTray();
      showWhatsNewIfNeeded();
      checkMatchNotifModal();
    });
  }
}

start();
