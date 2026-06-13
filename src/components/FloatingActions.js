import { t, getLang } from '../i18n.js';
import { showParamountModal } from './ParamountPage.js';
import { showBlogModal, getNewBlogPostsCount } from './BlogPage.js';
import { CLIENT, clientLogoHtml } from '../config/client.js';
import { countries } from '../data/countries.js';
import { isEmpresaMode, getEmpresaEntities } from '../data/albumContext.js';
import { router } from '../router.js';
import { collectionStore } from '../data/collectionStore.js';
import { openPackModal } from './PackOpener.js';
import { refreshStickerTray } from './StickerTray.js';
import { triggerInstall, canInstall } from './PWAInstall.js';
import { showPerfilModal } from './TradePage.js';
import { openStickerScanner } from './StickerScanner.js';
import { showNoPacksModal } from './NoPacksModal.js';
import { openMusicManager, isMusicActive, stopMusic } from './MusicPlayer.js';
import { maybeShowCompletionModal } from './CompletionModal.js';
import { subscribeOneSignal } from './MatchNotifModal.js';
import { downloadAlbumPdf } from './AlbumPdfExport.js';

function getActiveEntities() {
  return isEmpresaMode() ? getEmpresaEntities() : countries;
}

// ── Modal de países con cromos faltantes ────────────────────────────────────
function buildMissingModal() {
  const lang = getLang();

  const overlay = document.createElement('div');
  overlay.className = 'fa-modal-overlay';

  const { total, collected, percent, byCountry } = collectionStore.getProgress(getActiveEntities());

  const entries = getActiveEntities()
    .map(c => ({ id: c.id, meta: c, ...byCountry[c.id] }))
    .filter(e => e.missing.length > 0);

  const pct = percent.toFixed(1);

  overlay.innerHTML = `
    <div class="fa-modal-card" role="dialog" aria-modal="true">
      <button class="fa-modal-close" aria-label="Cerrar">✕</button>

      <div class="fa-modal-header">
        <div class="fa-modal-trophy">📋</div>
        <div class="fa-modal-title">${lang === 'es' ? 'Cromos faltantes' : 'Missing stickers'}</div>
        <div class="fa-modal-sub">${lang === 'es' ? 'Progreso del álbum' : 'Album progress'}: ${pct}%</div>
      </div>

      <div class="fa-missing-progress-bar">
        <div class="fa-missing-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="fa-missing-progress-label">
        ${collected} / ${total} ${lang === 'es' ? 'cromos' : 'stickers'}
      </div>

      <div class="fa-modal-divider"></div>

      <div class="fa-missing-list"></div>
    </div>
  `;

  function close() {
    overlay.classList.remove('fa-modal-active');
    setTimeout(() => overlay.remove(), 280);
  }

  // Construir filas como elementos DOM para poder añadir click handlers
  const list = overlay.querySelector('.fa-missing-list');
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fa-missing-empty';
    empty.textContent = `🎉 ${lang === 'es' ? '¡Álbum completado!' : 'Album complete!'}`;
    list.appendChild(empty);
  } else {
    entries.forEach(e => {
      const meta = e.meta;
      const name = meta ? meta.name : e.id;
      const flag = meta ? meta.federation?.flag : '';

      const row = document.createElement('div');
      row.className = 'fa-missing-row';
      row.title = lang === 'es' ? `Ir a ${name}` : `Go to ${name}`;

      if (flag) {
        const img = document.createElement('img');
        img.className = 'fa-missing-flag';
        img.src = `https://flagcdn.com/w40/${flag}.png`;
        img.alt = name;
        row.appendChild(img);
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'fa-missing-name';
      nameEl.textContent = name;
      row.appendChild(nameEl);

      const badge = document.createElement('span');
      badge.className = 'fa-missing-badge';
      badge.textContent = `${e.found}/${e.total}`;
      row.appendChild(badge);

      const arrow = document.createElement('span');
      arrow.className = 'fa-missing-arrow';
      arrow.textContent = '›';
      row.appendChild(arrow);

      row.addEventListener('click', () => {
        close();
        router.navigate(`/${e.id}`);
      });

      list.appendChild(row);
    });
  }

  overlay.querySelector('.fa-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('fa-modal-active')));
}

const WHATSAPP_NUMBER   = '584247647893';
const WA_COMMUNITY_LINK = 'https://chat.whatsapp.com/KfBNnndf5JM4VIJtXwNn3k';

function getAlbumUrl() {
  return CLIENT.shareUrl || 'https://sportalbum.chanzia.com';
}

function buildCreditsModal() {
  const lang = getLang();

  const overlay = document.createElement('div');
  overlay.className = 'fa-modal-overlay';

  const clientHeaderHtml = CLIENT.active ? `
    <div class="fa-client-header">
      <div class="fa-client-header-label">Presentado por</div>
      <div class="fa-client-header-brand">
        ${clientLogoHtml({ imgClass: 'fa-client-header-img', textClass: 'fa-client-header-name', heightPx: CLIENT.modal?.logoHeight })}
      </div>
      ${CLIENT.tagline ? `<div class="fa-client-header-tagline">${CLIENT.tagline}</div>` : ''}
    </div>` : '';

  overlay.innerHTML = `
    <div class="fa-modal-card" role="dialog" aria-modal="true">

      <button class="fa-modal-close" aria-label="${t('credits_close')}">✕</button>

      ${clientHeaderHtml}

      <div class="fa-modal-header">
        <div class="fa-modal-trophy">🏆</div>
        <div class="fa-modal-title">${t('credits_title')}</div>
        <div class="fa-modal-sub">${t('credits_subtitle')}</div>
      </div>

      <p class="fa-modal-made">${t('credits_made')}</p>

      <div class="fa-modal-divider"></div>

      <div class="fa-modal-section">
        <div class="fa-modal-section-title">${t('credits_business_title')}</div>
        <p class="fa-modal-section-text">${t('credits_business_text')}</p>
        <a class="fa-modal-cta fa-modal-cta-primary"
           href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t('credits_contact_msg'))}"
           target="_blank" rel="noopener">
          ${t('credits_contact')}
        </a>
      </div>

      <div class="fa-modal-divider"></div>

      <div class="fa-modal-section">
        <div class="fa-modal-section-title">${t('credits_share_title')}</div>
        <div class="fa-modal-share-row">
          <a class="fa-modal-share-btn fa-share-wa"
             href="https://wa.me/?text=${encodeURIComponent(t('credits_share_text') + ' ' + getAlbumUrl())}"
             target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
          <button class="fa-modal-share-btn fa-share-copy" data-url="${getAlbumUrl()}">
            🔗 ${lang === 'es' ? 'Copiar enlace' : 'Copy link'}
          </button>
        </div>
      </div>

    </div>
  `;

  function close() {
    overlay.classList.remove('fa-modal-active');
    setTimeout(() => overlay.remove(), 280);
  }

  overlay.querySelector('.fa-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('.fa-share-copy').addEventListener('click', (btn) => {
    navigator.clipboard?.writeText(getAlbumUrl()).then(() => {
      const el = overlay.querySelector('.fa-share-copy');
      const prev = el.textContent;
      el.textContent = lang === 'es' ? '✓ Copiado' : '✓ Copied';
      setTimeout(() => { el.textContent = prev; }, 2000);
    });
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('fa-modal-active'));
  });
}

function buildMenuModal({ es, onPack, onPackTick }) {
  const dupeCount = collectionStore.getDuplicates().length;
  const { percent, collected, total } = collectionStore.getProgress(getActiveEntities());
  const pct = percent.toFixed(1);
  const canOpen   = collectionStore.canOpenPack();
  const remaining = collectionStore.packsRemaining();

  const overlay = document.createElement('div');
  overlay.className = 'fa-modal-overlay fa-menu-modal-overlay';

  overlay.innerHTML = `
    <div class="fa-modal-card fa-menu-modal-card" role="dialog" aria-modal="true">
      <button class="fa-modal-close" aria-label="Cerrar">✕</button>

      <div class="fa-menu-modal-header">
        <div class="fa-menu-modal-ball">${isEmpresaMode() ? '🎴' : '⚽'}</div>
        <div class="fa-menu-modal-title">${isEmpresaMode() ? 'LIBRITO DE FIGURITAS' : 'ÁLBUM DE FIGURITAS'}</div>
        <div class="fa-menu-modal-progress-wrap">
          <div class="fa-menu-modal-progress-bar">
            <div class="fa-menu-modal-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="fa-menu-modal-progress-label">${collected}/${total} · ${pct}%</span>
        </div>
      </div>

      <div class="fa-menu-modal-grid">

        <button class="fa-menu-card fa-menu-card--pack ${!canOpen ? 'fa-menu-card--disabled' : ''}">
          <span class="fa-menu-card-icon">🎴</span>
          <span class="fa-menu-card-label">${es ? 'Abrir sobre' : 'Open pack'}</span>
          <span class="fa-menu-card-sub">${canOpen ? (es ? `${remaining} disponible${remaining !== 1 ? 's' : ''}` : `${remaining} left`) : (es ? 'Sin sobres' : 'No packs')}</span>
          ${canOpen ? `<span class="fa-menu-card-badge fa-menu-card-badge--pack">${remaining}</span>` : ''}
        </button>

        <button class="fa-menu-card fa-menu-card--trade">
          <span class="fa-menu-card-icon">🔄</span>
          <span class="fa-menu-card-label">${es ? 'Mis repetidas' : 'My dupes'}</span>
          <span class="fa-menu-card-sub">${dupeCount > 0 ? (es ? `${dupeCount} repetida${dupeCount !== 1 ? 's' : ''}` : `${dupeCount} duplicate${dupeCount !== 1 ? 's' : ''}`) : (es ? 'Sin repetidas' : 'No dupes')}</span>
          ${dupeCount > 0 ? `<span class="fa-menu-card-badge fa-menu-card-badge--trade">${dupeCount}</span>` : ''}
        </button>

        <!-- MERCADO DESACTIVADO TEMPORALMENTE
        <button class="fa-menu-card fa-menu-card--mercado">
          <span class="fa-menu-card-icon">🌐</span>
          <span class="fa-menu-card-label">${es ? 'Mercado' : 'Market'}</span>
          <span class="fa-menu-card-sub">${es ? 'Intercambios con otras personas' : 'Trade with others'}</span>
        </button>
        -->

        <button class="fa-menu-card fa-menu-card--missing">
          <span class="fa-menu-card-icon">🔍</span>
          <span class="fa-menu-card-label">${es ? 'Faltantes' : 'Missing'}</span>
          <span class="fa-menu-card-sub">${total - collected} ${es ? 'por conseguir' : 'to collect'}</span>
        </button>

        <button class="fa-menu-card fa-menu-card--scan">
          <span class="fa-menu-card-icon">📷</span>
          <span class="fa-menu-card-label">${es ? 'Escanear QR' : 'Scan QR'}</span>
          <span class="fa-menu-card-sub">${es ? 'Dar o recibir un cromo' : 'Give or receive a sticker'}</span>
        </button>



        <button class="fa-menu-card fa-menu-card--info">
          <span class="fa-menu-card-icon">⭐</span>
          <span class="fa-menu-card-label">Info</span>
          <span class="fa-menu-card-sub">${es ? 'Créditos y más' : 'Credits & more'}</span>
        </button>

        <button class="fa-menu-card fa-menu-card--share">
          <span class="fa-menu-card-icon">📤</span>
          <span class="fa-menu-card-label">${es ? 'Compartir' : 'Share'}</span>
          <span class="fa-menu-card-sub">${es ? 'QR · WhatsApp · Link' : 'QR · WhatsApp · Link'}</span>
        </button>

        <button class="fa-menu-card fa-menu-card--blog">
          <span class="fa-menu-card-icon">📰</span>
          <span class="fa-menu-card-label">${es ? 'Blog' : 'Blog'}</span>
          <span class="fa-menu-card-sub">${es ? 'Noticias y novedades' : 'News & updates'}</span>
          <span class="fa-menu-card-badge fa-menu-card-badge--blog" id="fa-blog-badge" style="display:none"></span>
        </button>

        <button class="fa-menu-card fa-menu-card--music">
          <span class="fa-menu-card-icon">${isMusicActive() ? '⏹' : '🎵'}</span>
          <span class="fa-menu-card-label">${isMusicActive() ? (es ? 'Detener música' : 'Stop music') : (es ? 'Música' : 'Music')}</span>
          <span class="fa-menu-card-sub">${isMusicActive() ? (es ? 'Toca para parar' : 'Tap to stop') : (es ? 'Playlists de YouTube' : 'YouTube playlists')}</span>
        </button>

        <button class="fa-menu-card fa-menu-card--paramount">
          <span class="fa-menu-card-icon">📺</span>
          <span class="fa-menu-card-label">${es ? 'Ver partidos' : 'Watch matches'}</span>
          <span class="fa-menu-card-sub">104 partidos · Paramount+</span>
        </button>

        ${percent >= 100 ? `
        <button class="fa-menu-card fa-menu-card--pdf">
          <span class="fa-menu-card-icon">📄</span>
          <span class="fa-menu-card-label">${es ? 'Descargar PDF' : 'Download PDF'}</span>
          <span class="fa-menu-card-sub">${es ? 'Tu álbum como recuerdo' : 'Your album as memento'}</span>
        </button>` : ''}

        <button class="fa-menu-card fa-menu-card--lang">
          <span class="fa-menu-card-icon">🌐</span>
          <span class="fa-menu-card-label">${es ? 'Idioma' : 'Language'}</span>
          <span class="fa-menu-card-sub">${es ? 'Cambiar a English' : 'Switch to Español'}</span>
        </button>

        ${canInstall() ? `
        <button class="fa-menu-card fa-menu-card--install">
          <span class="fa-menu-card-icon">📲</span>
          <span class="fa-menu-card-label">${es ? 'Instalar app' : 'Install app'}</span>
          <span class="fa-menu-card-sub">${es ? 'Funciona sin internet' : 'Works offline'}</span>
        </button>` : ''}

        <button class="fa-menu-card fa-menu-card--perfil">
          <span class="fa-menu-card-icon">👤</span>
          <span class="fa-menu-card-label">${es ? 'Mi perfil' : 'My profile'}</span>
          <span class="fa-menu-card-sub">${localStorage.getItem('trade_my_name') || (es ? 'Nombre y teléfono' : 'Name & phone')}</span>
        </button>

      </div>

      <div class="fa-menu-modal-footer">${isEmpresaMode() ? '🎴 LIBRITO DE FIGURITAS · Álbum empresarial' : '⚽ ÁLBUM DE FIGURITAS · Sin ánimo de lucro · Hecho para fans'}</div>
    </div>
  `;

  function close() {
    overlay.classList.remove('fa-modal-active');
    setTimeout(() => overlay.remove(), 300);
  }

  overlay.querySelector('.fa-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });

  overlay.querySelector('.fa-menu-card--pack').addEventListener('click', () => {
    if (!collectionStore.canOpenPack()) return;
    close();
    setTimeout(() => onPack(), 200);
  });

  overlay.querySelector('.fa-menu-card--trade').addEventListener('click', () => {
    close();
    setTimeout(() => router.navigate('/give'), 200);
  });

  overlay.querySelector('.fa-menu-card--share').addEventListener('click', () => {
    close();
    setTimeout(() => router.navigate('/share'), 200);
  });

  // overlay.querySelector('.fa-menu-card--mercado').addEventListener('click', () => {
  //   close();
  //   setTimeout(() => router.navigate('/mercado'), 200);
  // });

  overlay.querySelector('.fa-menu-card--missing').addEventListener('click', () => {
    close();
    setTimeout(() => buildMissingModal(), 200);
  });

  overlay.querySelector('.fa-menu-card--scan').addEventListener('click', () => {
    close();
    setTimeout(() => openStickerScanner(), 200);
  });


  overlay.querySelector('.fa-menu-card--info').addEventListener('click', () => {
    close();
    setTimeout(() => buildCreditsModal(), 200);
  });

  overlay.querySelector('.fa-menu-card--blog').addEventListener('click', () => {
    close();
    setTimeout(() => showBlogModal(), 200);
  });

  // Badge de posts nuevos — carga asíncrona
  getNewBlogPostsCount().then(count => {
    const badge = overlay.querySelector('#fa-blog-badge');
    if (badge && count > 0) {
      badge.textContent = count;
      badge.style.display = '';
    }
  });

  overlay.querySelector('.fa-menu-card--paramount').addEventListener('click', () => {
    close();
    setTimeout(() => showParamountModal(), 200);
  });

  overlay.querySelector('.fa-menu-card--pdf')?.addEventListener('click', () => {
    close();
    setTimeout(() => downloadAlbumPdf(), 300);
  });

  overlay.querySelector('.fa-menu-card--lang').addEventListener('click', () => {
    localStorage.removeItem('lang');
    window.location.reload();
  });

  overlay.querySelector('.fa-menu-card--install')?.addEventListener('click', () => {
    close();
    setTimeout(() => triggerInstall(), 200);
  });

  overlay.querySelector('.fa-menu-card--perfil')?.addEventListener('click', () => {
    close();
    setTimeout(() => showPerfilModal(), 200);
  });

  overlay.querySelector('.fa-menu-card--music')?.addEventListener('click', () => {
    close();
    if (isMusicActive()) {
      stopMusic();
    } else {
      setTimeout(() => openMusicManager(), 200);
    }
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('fa-modal-active')));
  return overlay;
}

export function createFloatingActions() {
  const lang = getLang();
  const es   = lang === 'es';

  const panel = document.createElement('div');
  panel.className = 'fa-panel';

  // ── Barra de progreso ──────────────────────────────────────────────────────
  const { percent } = collectionStore.getProgress(getActiveEntities());
  const pct = percent.toFixed(1);
  maybeShowCompletionModal(percent);

  const progressPill = document.createElement('div');
  progressPill.className = 'fa-progress-pill';
  progressPill.innerHTML = `
    <div class="fa-progress-track">
      <div class="fa-progress-fill" style="width:${pct}%"></div>
    </div>
    <span class="fa-progress-label">${pct}%</span>
  `;
  panel.appendChild(progressPill);

  // ── Botón Menú (abre modal) ────────────────────────────────────────────────
  const dupeCount = collectionStore.getDuplicates().length;
  const btnMenu = document.createElement('button');
  btnMenu.className = 'fa-btn fa-btn-menu fa-btn-wide';
  btnMenu.innerHTML = `
    <span class="fa-btn-icon">☰</span>
    <span class="fa-btn-label">${es ? 'Menú' : 'Menu'}</span>
    ${dupeCount > 0 ? `<span class="fa-menu-dupe-badge">${dupeCount}</span>` : ''}
  `;
  panel.appendChild(btnMenu);

  // ── Botón Abrir sobre / Notificaciones ────────────────────────────────────
  const albumComplete = percent >= 100;

  if (albumComplete) {
    // Álbum completo → mostrar botón de notificaciones de partidos
    const SUBSCRIBED_KEY = 'wc2026_push_subscribed';
    const alreadySubscribed = localStorage.getItem(SUBSCRIBED_KEY) === 'true';
    const btnNotif = document.createElement('button');
    btnNotif.className = 'fa-btn fa-btn-pack fa-btn-wide';
    if (alreadySubscribed) {
      btnNotif.innerHTML = `<span class="fa-btn-icon">✅</span><span class="fa-btn-label">${es ? 'Notificaciones activas' : 'Notifications active'}</span>`;
      btnNotif.disabled = true;
    } else {
      btnNotif.innerHTML = `<span class="fa-btn-icon">🔔</span><span class="fa-btn-label">${es ? 'Activar notificaciones de partidos' : 'Enable match notifications'}</span>`;
      btnNotif.addEventListener('click', () => subscribeOneSignal(btnNotif.querySelector('.fa-btn-label'), es));
    }
    panel.appendChild(btnNotif);

    btnMenu.addEventListener('click', () => buildMenuModal({ es, onPack: null }));
  } else {
    const canOpen   = collectionStore.canOpenPack();
    const remaining = collectionStore.packsRemaining();
    const btnPack = document.createElement('button');
    btnPack.className = 'fa-btn fa-btn-pack fa-btn-wide';
    btnPack.title = canOpen
      ? (es ? `${remaining} sobre${remaining !== 1 ? 's' : ''} disponibles` : `${remaining} pack${remaining !== 1 ? 's' : ''} available`)
      : (es ? 'Sin sobres por ahora' : 'No packs left');

    const packLabel = canOpen
      ? `${es ? 'Abrir sobre' : 'Open pack'} <span class="fa-pack-count">${remaining}</span>`
      : `${es ? 'Sin sobres' : 'No packs'}`;
    btnPack.innerHTML = `<span class="fa-btn-icon">🎴</span><span class="fa-btn-label">${packLabel}</span>`;
    if (!canOpen) btnPack.disabled = true;
    panel.appendChild(btnPack);

    const packTimer = document.createElement('div');
    packTimer.className = 'fa-pack-timer';
    panel.appendChild(packTimer);

    function formatMs(ms) {
      const s = Math.max(0, Math.floor(ms / 1000));
      const hh = String(Math.floor(s / 3600)).padStart(2, '0');
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    }

    function refreshPackUi() {
      const can     = collectionStore.canOpenPack();
      const leftNow = collectionStore.packsRemaining();
      if (can) {
        btnPack.disabled = false;
        btnPack.querySelector('.fa-btn-label').innerHTML =
          `${es ? 'Abrir sobre' : 'Open pack'} <span class="fa-pack-count">${leftNow}</span>`;
        packTimer.textContent = '';
        return true;
      }
      btnPack.disabled = true;
      btnPack.querySelector('.fa-btn-label').innerHTML = `${es ? 'Sin sobres' : 'No packs'}`;
      const ms = collectionStore.msUntilNextPack();
      packTimer.textContent = es ? `Disponible en ${formatMs(ms)}` : `Available in ${formatMs(ms)}`;
      return false;
    }

    refreshPackUi();
    let packTick = null;
    if (!collectionStore.canOpenPack()) {
      packTick = setInterval(() => {
        if (!panel.isConnected) { clearInterval(packTick); return; }
        if (refreshPackUi()) clearInterval(packTick);
      }, 1000);
    }

    function doOpenPack() {
      if (!collectionStore.canOpenPack()) return;
      collectionStore.markPackOpened();
      const left = collectionStore.packsRemaining();
      if (left === 0) {
        refreshPackUi();
        if (!packTick) {
          packTick = setInterval(() => {
            if (!panel.isConnected) { clearInterval(packTick); return; }
            if (refreshPackUi()) clearInterval(packTick);
          }, 1000);
        }
        setTimeout(() => showNoPacksModal(), 800);
      } else {
        const badge = btnPack.querySelector('.fa-pack-count');
        if (badge) badge.textContent = left;
      }
      openPackModal({ onClose: () => refreshStickerTray() });
    }

    btnMenu.addEventListener('click', () => buildMenuModal({ es, onPack: doOpenPack }));
    btnPack.addEventListener('click', doOpenPack);
  }

  // ── Botón Buscar cromoses en la ciudad ─────────────────────────────────────
  const btnMap = document.createElement('button');
  btnMap.className = 'fa-btn fa-btn-wide fa-btn-city';
  btnMap.innerHTML = `
    <span class="fa-btn-icon">📍</span>
    <span class="fa-btn-label">${es ? 'Buscar cromoses en la ciudad' : 'Find stickers in the city'}</span>
  `;
  btnMap.addEventListener('click', () => router.navigate('/map'));
  panel.appendChild(btnMap);

  return panel;
}
