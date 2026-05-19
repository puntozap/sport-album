import './styles/main.css';
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
import './styles/whats-new.css';
import './styles/low-perf.css';
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
import { initStickerTray } from './components/StickerTray.js';
import { showWhatsNewIfNeeded } from './components/WhatsNewModal.js';

async function start() {
  // ── Detectar empresa en la URL ──────────────────────────────
  // Si la URL es /isacell/mexico, el primer segmento "isacell" es la empresa.
  // Intentamos cargar /empresas/isacell/config.json — si existe, activamos branding.
  const segments = window.location.pathname.split('/').filter(Boolean);
  const RESERVED = ['simulation', '404', 'api', 'assets', 'empresas'];
  const potentialSlug = segments[0];

  if (potentialSlug && !RESERVED.includes(potentialSlug)) {
    const loaded = await loadCompanyConfig(potentialSlug);
    if (loaded) setCompanySlug(potentialSlug);
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

  const userHadLang = !!localStorage.getItem('lang');
  if (userHadLang) {
    initI18n();
    initApp();
    initStickerTray();
    showWhatsNewIfNeeded();
  } else {
    showLanguageWelcome(() => {
      initI18n();
      initApp();
      initStickerTray();
      showWhatsNewIfNeeded();
    });
  }
}

start();
