import '../styles/music-player.css';

const USER_PLAYLISTS_KEY = 'music_user_playlists';
const CURRENT_KEY        = 'music_current';

const GLOBAL_PLAYLISTS = [
  {
    id: 'global-1',
    name: 'FIFA World Cup 2026',
    desc: 'Soundtrack oficial',
    icon: '⚽',
    videoId: 'fcnDmrtj6Sk',
  },
  {
    id: 'global-2',
    name: 'Dp1yDtYqAKg',
    desc: '(FIFA World Cup 2026™)',
    icon: '🔥',
    videoId: 'Dp1yDtYqAKg',
  },
  {
    id: 'global-3',
    name: '♫ FRANCIA: LA VENGANZA | Canción del Mundial 26',
    desc: '(FIFA World Cup 2026™)',
    icon: '🎧',
    videoId: 'Ep8FiwiB7EY',
  },
];

// ── YouTube IFrame API ────────────────────────────────────────────────────────

let ytReady = false;
let ytPlayer = null;
let ytPlayerReady = false;
let pendingLoad = null;

function loadYouTubeAPI() {
  if (ytReady) return Promise.resolve();
  if (window.YT && window.YT.Player) { ytReady = true; return Promise.resolve(); }
  return new Promise(resolve => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => { ytReady = true; resolve(); };
  });
}

function parseYouTubeUrl(url) {
  try {
    const u = new URL(url.trim());
    const listId  = u.searchParams.get('list');
    let videoId   = u.searchParams.get('v');
    if (!videoId && u.hostname === 'youtu.be') videoId = u.pathname.slice(1).split('?')[0];
    return { listId, videoId };
  } catch { return null; }
}

function getThumbUrl(item) {
  if (item.thumb) return item.thumb;
  const id = item.videoId;
  if (!id) return null;
  if (item.type === 'playlist') return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

// ── Estado global del player ─────────────────────────────────────────────────

let currentItem   = null;
let isPlaying     = false;
let barEl         = null;
let expandedEl    = null;
let leftBtnEl     = null;
let titleEl       = null;
let playBtnEl     = null;
let iframeWrapEl  = null;
let progressTimer = null;

function getAllPlaylists() {
  return [...GLOBAL_PLAYLISTS, ...getUserPlaylists()];
}

function currentIndex() {
  if (!currentItem) return -1;
  return getAllPlaylists().findIndex(p => p.id === currentItem.id);
}

function nextTrack() {
  const all = getAllPlaylists();
  if (!all.length) return;
  const idx = currentIndex();
  const next = all[(idx + 1) % all.length];
  initPlayer(next);
}

function prevTrack() {
  const all = getAllPlaylists();
  if (!all.length) return;
  const idx = currentIndex();
  const prev = all[(idx - 1 + all.length) % all.length];
  initPlayer(prev);
}

function saveCurrentItem(item) {
  currentItem = item;
  if (item) localStorage.setItem(CURRENT_KEY, JSON.stringify(item));
  else localStorage.removeItem(CURRENT_KEY);
}

function loadCurrentItem() {
  try { return JSON.parse(localStorage.getItem(CURRENT_KEY)); } catch { return null; }
}

// ── Mini bar ─────────────────────────────────────────────────────────────────

function ensureBar() {
  if (barEl) return barEl;

  barEl = document.createElement('div');
  barEl.className = 'mp-bar';
  barEl.innerHTML = `
    <div class="mp-bar-iframe-wrap" id="mp-yt-wrap" tabindex="-1">
      <div id="mp-yt-player"></div>
    </div>
    <div class="mp-bar-info">
      <div class="mp-bar-title" id="mp-bar-title">—</div>
      <div class="mp-bar-playlist" id="mp-bar-playlist"></div>
    </div>
    <div class="mp-bar-controls">
      <button class="mp-ctrl-btn" id="mp-prev" title="Anterior">⏮</button>
      <button class="mp-ctrl-btn mp-ctrl-btn--play" id="mp-play" title="Play/Pause">▶</button>
      <button class="mp-ctrl-btn" id="mp-next" title="Siguiente">⏭</button>
      <button class="mp-ctrl-btn mp-ctrl-btn--open" id="mp-open" title="Abrir">🎵</button>
    </div>
  `;

  titleEl      = barEl.querySelector('#mp-bar-title');
  playBtnEl    = barEl.querySelector('#mp-play');
  iframeWrapEl = barEl.querySelector('#mp-yt-wrap');

  barEl.querySelector('#mp-play').addEventListener('click', e => { e.stopPropagation(); togglePlay(); });
  barEl.querySelector('#mp-prev').addEventListener('click', e => { e.stopPropagation(); prevTrack(); });
  barEl.querySelector('#mp-next').addEventListener('click', e => { e.stopPropagation(); nextTrack(); });
  barEl.querySelector('#mp-open').addEventListener('click', e => { e.stopPropagation(); openMusicModal(); });

  // Tap en la barra (info) → abrir expanded player
  barEl.querySelector('.mp-bar-info').addEventListener('click', openExpanded);
  barEl.querySelector('.mp-bar-iframe-wrap').addEventListener('click', openExpanded);

  document.body.appendChild(barEl);
  return barEl;
}

function showBar() {
  ensureBar();
  requestAnimationFrame(() => barEl.classList.add('mp-bar--visible'));
}

function hideBar() {
  barEl?.classList.remove('mp-bar--visible');
}

function updateBarInfo(title, playlistName) {
  if (titleEl) titleEl.textContent = title || '—';
  const sub = barEl?.querySelector('#mp-bar-playlist');
  if (sub) sub.textContent = playlistName || '';
  updateExpandedInfo(title, playlistName);
}

function updatePlayBtn() {
  if (playBtnEl) playBtnEl.textContent = isPlaying ? '⏸' : '▶';
  updateLeftBtn();
  // Actualizar botón play en expanded
  const expPlay = expandedEl?.querySelector('#mp-exp-play');
  if (expPlay) expPlay.textContent = isPlaying ? '⏸' : '▶';
}

function updateLeftBtn() {
  const icon = leftBtnEl?.querySelector('#mp-left-icon');
  if (icon) icon.textContent = isPlaying ? '⏸' : '▶';
}

// ── Expanded Player ───────────────────────────────────────────────────────────

function openExpanded() {
  if (!ytPlayerReady) return;
  if (!expandedEl) buildExpanded();

  // Mover el iframe al expanded
  const expVideoInner = expandedEl.querySelector('.mp-exp-video-inner');
  const wrap = barEl.querySelector('#mp-yt-wrap');
  if (wrap && expVideoInner) expVideoInner.appendChild(wrap);

  expandedEl.classList.add('mp-expanded--open');
  startProgressPoll();

  // Redimensionar el player al tamaño del contenedor
  requestAnimationFrame(() => {
    const inner = expandedEl.querySelector('.mp-exp-video-inner');
    if (inner && ytPlayer?.setSize) {
      ytPlayer.setSize(inner.clientWidth || 280, inner.clientHeight || 158);
    }
    // Forzar el iframe a llenar el contenedor vía CSS
    const iframe = expandedEl.querySelector('iframe');
    if (iframe) {
      iframe.style.width  = '100%';
      iframe.style.height = '100%';
    }
    const wrap = expandedEl.querySelector('#mp-yt-wrap');
    if (wrap) { wrap.style.width = '100%'; wrap.style.height = '100%'; }
  });

  // Swipe down para cerrar
  let startY = 0;
  expandedEl.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true, once: false });
  expandedEl._swipeHandler = (e) => {
    if (e.touches[0].clientY - startY > 80) closeExpanded();
  };
  expandedEl.addEventListener('touchmove', expandedEl._swipeHandler, { passive: true });
}

function closeExpanded() {
  if (!expandedEl) return;
  expandedEl.classList.remove('mp-expanded--open');
  stopProgressPoll();

  // Devolver el iframe a la mini bar
  // #mp-yt-wrap ES la .mp-bar-iframe-wrap (mismo elemento) — buscar en expandedEl
  const wrap = expandedEl.querySelector('#mp-yt-wrap');
  if (wrap && barEl) {
    wrap.style.width  = '';
    wrap.style.height = '';
    const iframe = wrap.querySelector('iframe');
    if (iframe) { iframe.style.width = ''; iframe.style.height = ''; }
    // Reinsertar como primer hijo del bar (posición original)
    barEl.insertBefore(wrap, barEl.firstChild);
    // Restaurar tamaño del player después de reinsertar
    requestAnimationFrame(() => {
      if (ytPlayer?.setSize) ytPlayer.setSize(80, 45);
    });
  }

  if (expandedEl._swipeHandler) {
    expandedEl.removeEventListener('touchmove', expandedEl._swipeHandler);
  }
}

function buildExpanded() {
  expandedEl = document.createElement('div');
  expandedEl.className = 'mp-expanded';
  expandedEl.innerHTML = `
    <div class="mp-expanded-bg">
      <div class="mp-blob mp-blob-1"></div>
      <div class="mp-blob mp-blob-2"></div>
      <div class="mp-blob mp-blob-3"></div>
    </div>
    <div class="mp-exp-header">
      <div class="mp-exp-header-label">Reproduciendo ahora</div>
      <button class="mp-exp-close" id="mp-exp-close">╲╱</button>
    </div>
    <div class="mp-exp-video-wrap">
      <div class="mp-exp-ring">
        <div class="mp-exp-video-inner"></div>
      </div>
    </div>
    <div class="mp-exp-info">
      <div class="mp-exp-title" id="mp-exp-title">—</div>
      <div class="mp-exp-playlist" id="mp-exp-playlist"></div>
    </div>
    <div class="mp-exp-progress-wrap">
      <div class="mp-exp-progress-bar" id="mp-exp-progress-bar">
        <div class="mp-exp-progress-fill" id="mp-exp-fill"></div>
      </div>
      <div class="mp-exp-times">
        <span id="mp-exp-cur">0:00</span>
        <span id="mp-exp-dur">0:00</span>
      </div>
    </div>
    <div class="mp-exp-controls">
      <button class="mp-exp-btn mp-exp-btn--sm" id="mp-exp-prev">⏮</button>
      <button class="mp-exp-btn mp-exp-btn--play" id="mp-exp-play">▶</button>
      <button class="mp-exp-btn mp-exp-btn--sm" id="mp-exp-next">⏭</button>
    </div>
    <div class="mp-exp-footer">
      <button class="mp-exp-footer-btn" id="mp-exp-playlist-btn">🎵 Playlists</button>
    </div>
  `;

  expandedEl.querySelector('#mp-exp-close').addEventListener('click', closeExpanded);
  expandedEl.querySelector('#mp-exp-play').addEventListener('click', () => { togglePlay(); updatePlayBtn(); });
  expandedEl.querySelector('#mp-exp-prev').addEventListener('click', prevTrack);
  expandedEl.querySelector('#mp-exp-next').addEventListener('click', nextTrack);
  expandedEl.querySelector('#mp-exp-playlist-btn').addEventListener('click', () => { closeExpanded(); openMusicModal(); });

  // Seek al tocar la barra de progreso
  expandedEl.querySelector('#mp-exp-progress-bar').addEventListener('click', e => {
    if (!ytPlayer || !ytPlayerReady) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    const dur  = ytPlayer.getDuration?.() || 0;
    if (dur > 0) ytPlayer.seekTo(pct * dur, true);
  });

  // Actualizar info inicial
  updateExpandedInfo(titleEl?.textContent, barEl?.querySelector('#mp-bar-playlist')?.textContent);
  const expPlay = expandedEl.querySelector('#mp-exp-play');
  if (expPlay) expPlay.textContent = isPlaying ? '⏸' : '▶';

  document.body.appendChild(expandedEl);
}

function updateExpandedInfo(title, playlist) {
  if (!expandedEl) return;
  const t = expandedEl.querySelector('#mp-exp-title');
  const p = expandedEl.querySelector('#mp-exp-playlist');
  if (t) t.textContent = title || '—';
  if (p) p.textContent = playlist || '';
}

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function startProgressPoll() {
  stopProgressPoll();
  progressTimer = setInterval(() => {
    if (!ytPlayer || !ytPlayerReady || !expandedEl?.classList.contains('mp-expanded--open')) return;
    try {
      const cur = ytPlayer.getCurrentTime?.() || 0;
      const dur = ytPlayer.getDuration?.() || 0;
      const pct = dur > 0 ? (cur / dur) * 100 : 0;
      const fill = expandedEl.querySelector('#mp-exp-fill');
      if (fill) fill.style.width = pct + '%';
      const curEl = expandedEl.querySelector('#mp-exp-cur');
      const durEl = expandedEl.querySelector('#mp-exp-dur');
      if (curEl) curEl.textContent = fmtTime(cur);
      if (durEl) durEl.textContent = fmtTime(dur);

      // Actualizar título si cambió el video
      const info = ytPlayer.getVideoData?.();
      if (info?.title && info.title !== expandedEl.querySelector('#mp-exp-title')?.textContent) {
        updateExpandedInfo(info.title, currentItem?.name || '');
        updateBarInfo(info.title, currentItem?.name || '');
      }
    } catch {}
  }, 1000);
}

function stopProgressPoll() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

// ── Player ───────────────────────────────────────────────────────────────────

async function initPlayer(item) {
  ensureBar();
  await loadYouTubeAPI();
  saveCurrentItem(item);
  updateBarInfo(item.name, item.desc || '');
  showBar();

  // Playlist IDs empiezan con PL, UU, RD, etc. Cualquier otro es un video ID.
  const isPlaylistId = /^(PL|UU|RD|FL|OL|LL|WL)/i.test(item.videoId || '');
  const listId  = isPlaylistId ? item.videoId : null;
  const videoId = isPlaylistId ? null : item.videoId;

  if (ytPlayer && ytPlayerReady) {
    if (listId) {
      ytPlayer.loadPlaylist({ list: listId, listType: 'playlist', index: 0 });
    } else if (videoId) {
      ytPlayer.loadVideoById(videoId);
    }
    return;
  }

  // Primera vez: crear el player
  // videoId va al nivel raíz, NO dentro de playerVars
  ytPlayer = new window.YT.Player('mp-yt-player', {
    width: '80',
    height: '45',
    ...(videoId ? { videoId } : {}),
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      ...(listId ? { listType: 'playlist', list: listId } : {}),
    },
    events: {
      onReady(e) {
        ytPlayerReady = true;
        e.target.playVideo();
        isPlaying = true;
        updatePlayBtn();
        // Evitar que el iframe robe el foco del teclado (navigation con flechas)
        setTimeout(() => {
          barEl?.querySelector('iframe')?.setAttribute('tabindex', '-1');
        }, 300);
      },
      onStateChange(e) {
        const state = e.data;
        isPlaying = state === window.YT.PlayerState.PLAYING;
        updatePlayBtn();
        try {
          const info = ytPlayer.getVideoData();
          if (info?.title) updateBarInfo(info.title, currentItem?.name || '');
        } catch {}
        if (state === window.YT.PlayerState.ENDED) nextTrack();
      },
      onError() {
        // Video no disponible o no embeddable → saltar al siguiente
        setTimeout(nextTrack, 1500);
      },
    },
  });
}

function togglePlay() {
  if (!ytPlayer || !ytPlayerReady) return;
  if (isPlaying) { ytPlayer.pauseVideo(); isPlaying = false; }
  else           { ytPlayer.playVideo();  isPlaying = true;  }
  updatePlayBtn();
}

// ── Gestión de playlists de usuario ─────────────────────────────────────────

function getUserPlaylists() {
  try { return JSON.parse(localStorage.getItem(USER_PLAYLISTS_KEY)) || []; } catch { return []; }
}

function saveUserPlaylists(list) {
  localStorage.setItem(USER_PLAYLISTS_KEY, JSON.stringify(list));
}

function addUserPlaylist(name, url) {
  const parsed = parseYouTubeUrl(url);
  if (!parsed) return false;

  const item = {
    id: 'user-' + Date.now(),
    name: name || 'Mi playlist',
    desc: url,
    icon: '🎵',
    videoId: parsed.listId || parsed.videoId,
    type: parsed.listId ? 'playlist' : 'video',
  };

  const list = getUserPlaylists();
  list.push(item);
  saveUserPlaylists(list);
  return item;
}

function removeUserPlaylist(id) {
  const list = getUserPlaylists().filter(p => p.id !== id);
  saveUserPlaylists(list);
}

// ── Modal de playlists ────────────────────────────────────────────────────────

function openMusicModal() {
  const existing = document.querySelector('.mp-modal-overlay');
  if (existing) { closeMusicModal(existing); return; }

  const overlay = document.createElement('div');
  overlay.className = 'mp-modal-overlay';

  overlay.innerHTML = `
    <div class="mp-modal">
      <div class="mp-modal-header">
        <div class="mp-modal-title">🎵 Música</div>
        <button class="mp-modal-close" id="mp-close">✕</button>
      </div>
      <div class="mp-modal-body" id="mp-body"></div>
    </div>
  `;

  overlay.addEventListener('click', e => { if (e.target === overlay) closeMusicModal(overlay); });
  overlay.querySelector('#mp-close').addEventListener('click', () => closeMusicModal(overlay));

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('mp-modal--open')));

  renderModalBody(overlay);
}

function closeMusicModal(overlay) {
  overlay.classList.remove('mp-modal--open');
  setTimeout(() => overlay.remove(), 280);
}

function renderModalBody(overlay) {
  const body = overlay.querySelector('#mp-body');
  body.innerHTML = '';

  // ── Playlists globales
  const globalSection = document.createElement('div');
  globalSection.innerHTML = `<div class="mp-section-title">Playlists globales</div>`;

  GLOBAL_PLAYLISTS.forEach(item => {
    globalSection.appendChild(buildPlaylistRow(item, overlay, false));
  });

  body.appendChild(globalSection);

  // ── Playlists del usuario
  const userSection = document.createElement('div');
  userSection.id = 'mp-user-section';
  userSection.innerHTML = `<div class="mp-section-title">Mis playlists</div>`;

  renderUserRows(userSection, overlay);
  body.appendChild(userSection);

  // ── Botón agregar
  const addBtn = document.createElement('button');
  addBtn.className = 'mp-add-btn';
  addBtn.innerHTML = `<span style="font-size:22px">➕</span> Agregar playlist de YouTube`;
  addBtn.addEventListener('click', () => showAddForm(body, overlay));
  body.appendChild(addBtn);
}

function renderUserRows(section, overlay) {
  // Limpiar filas existentes (no el header)
  section.querySelectorAll('.mp-playlist-row').forEach(r => r.remove());
  const playlists = getUserPlaylists();
  if (playlists.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mp-no-user';
    empty.style.cssText = 'padding:8px 16px;font-size:13px;color:rgba(255,255,255,0.3);';
    empty.textContent = 'Aún no tienes playlists guardadas';
    section.appendChild(empty);
    return;
  }
  playlists.forEach(item => {
    section.appendChild(buildPlaylistRow(item, overlay, true));
  });
}

function buildPlaylistRow(item, overlay, isUser) {
  const isActive = currentItem?.id === item.id;
  const row = document.createElement('div');
  row.className = 'mp-playlist-row' + (isActive ? ' mp-playlist--active' : '');

  const thumb = getThumbUrl(item);
  row.innerHTML = `
    <div class="mp-playlist-thumb">
      ${thumb ? `<img src="${thumb}" alt="">` : item.icon}
    </div>
    <div class="mp-playlist-info">
      <div class="mp-playlist-name">${item.name}</div>
      <div class="mp-playlist-desc">${item.desc || ''}</div>
    </div>
    <span class="mp-playlist-play">${isActive && isPlaying ? '🔊' : '▶'}</span>
    ${isUser ? `<button class="mp-playlist-delete" title="Eliminar">🗑</button>` : ''}
  `;

  row.addEventListener('click', e => {
    if (e.target.closest('.mp-playlist-delete')) return;
    initPlayer(item);
    closeMusicModal(overlay);
  });

  if (isUser) {
    row.querySelector('.mp-playlist-delete').addEventListener('click', e => {
      e.stopPropagation();
      removeUserPlaylist(item.id);
      if (currentItem?.id === item.id) { hideBar(); saveCurrentItem(null); }
      renderUserRows(overlay.querySelector('#mp-user-section'), overlay);
    });
  }

  return row;
}

function showAddForm(body, overlay) {
  const existing = body.querySelector('.mp-add-form');
  if (existing) { existing.remove(); return; }

  const form = document.createElement('div');
  form.className = 'mp-add-form';
  form.innerHTML = `
    <input class="mp-add-input" id="mp-add-name" type="text"
           placeholder="Nombre (ej: Mis canciones)" autocomplete="off">
    <input class="mp-add-input" id="mp-add-url" type="url"
           placeholder="Link de YouTube (video o playlist)" autocomplete="off">
    <div class="mp-add-form-btns">
      <button class="mp-add-save" id="mp-add-ok">Guardar</button>
      <button class="mp-add-cancel" id="mp-add-cancel">Cancelar</button>
    </div>
    <div id="mp-add-error" style="font-size:12px;color:#ef4444;display:none;padding-top:4px;">
      Link no válido. Pega un enlace de YouTube.
    </div>
  `;

  body.insertBefore(form, body.querySelector('.mp-add-btn'));

  form.querySelector('#mp-add-cancel').addEventListener('click', () => form.remove());
  form.querySelector('#mp-add-ok').addEventListener('click', () => {
    const name = form.querySelector('#mp-add-name').value.trim();
    const url  = form.querySelector('#mp-add-url').value.trim();
    const item = addUserPlaylist(name, url);
    if (!item) {
      form.querySelector('#mp-add-error').style.display = 'block';
      return;
    }
    form.remove();
    renderUserRows(overlay.querySelector('#mp-user-section'), overlay);
    initPlayer(item);
    closeMusicModal(overlay);
  });
}

// ── API pública ───────────────────────────────────────────────────────────────

export function isMusicActive() {
  return ytPlayerReady && barEl?.classList.contains('mp-bar--visible');
}

export function stopMusic() {
  try { ytPlayer?.pauseVideo(); } catch {}
  isPlaying = false;
  updatePlayBtn();
  hideBar();
  closeExpanded();
  saveCurrentItem(null);
  // No destruir ytPlayer — el iframe sigue en el DOM y se reutiliza al volver a tocar
}

export function openMusicManager() {
  openMusicModal();
}

export function restoreMusicPlayer() {
  const saved = loadCurrentItem();
  if (saved) {
    initPlayer(saved);
  }
}
