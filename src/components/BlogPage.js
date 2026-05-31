// ─── PEGA AQUÍ la URL de tu Apps Script del Blog ───────────────────────────
// Instrucciones: scripts/apps-script/blog-apps-script.js
const BLOG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyExumHBeTvMusxjm_Kzn2VQGJ0-Pr_CtRJywMJnCb6Ft5WbvAwJtL4spiWKzAEV5YjXw/exec';
// ────────────────────────────────────────────────────────────────────────────

const FALLBACK_POSTS = [];

// ── Markdown mínimo ─────────────────────────────────────────────────────────

function renderInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a class="blog-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function youtubeId(text) {
  const t = text.trim();
  let m;
  m = t.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = t.match(/^[A-Za-z0-9_-]{11}$/);
  if (m) return t;
  return null;
}

function renderContent(raw) {
  const blocks = raw.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks.map(block => {
    const t = block.trim();
    if (!t) return '';
    if (t.startsWith('## ')) return `<h3 class="blog-h3">${renderInline(t.slice(3))}</h3>`;
    if (t.startsWith('# '))  return `<h2 class="blog-h2">${renderInline(t.slice(2))}</h2>`;
    const vid = youtubeId(t);
    if (vid) return `
      <div class="blog-video">
        <iframe src="https://www.youtube.com/embed/${vid}"
          title="Video" frameborder="0" loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>`;
    const hasHtml = /<[a-zA-Z][^>]*>/.test(t);
    const inner = hasHtml ? renderInline(t) : renderInline(t.replace(/\n/g, '<br>'));
    return `<p class="blog-p">${inner}</p>`;
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function excerpt(raw, maxChars = 100) {
  const plain = raw.replace(/[#*\[\]()]/g, '').replace(/https?:\/\/\S+/g, '').trim();
  return plain.length > maxChars ? plain.slice(0, maxChars) + '…' : plain;
}

// ── Fetch ───────────────────────────────────────────────────────────────────

const BLOG_SEEN_KEY = 'blog_last_seen_id';
let _cachedPosts = null;

async function fetchPosts() {
  if (!BLOG_ENDPOINT) return FALLBACK_POSTS;
  try {
    const r = await fetch(BLOG_ENDPOINT, { cache: 'no-store', redirect: 'follow' });
    if (!r.ok) return FALLBACK_POSTS;
    const data = await r.json();
    const posts = Array.isArray(data.posts) && data.posts.length ? data.posts : FALLBACK_POSTS;
    _cachedPosts = posts.slice().reverse();
    return _cachedPosts;
  } catch {
    return FALLBACK_POSTS;
  }
}

// Cuántos posts nuevos hay desde la última visita al blog
export async function getNewBlogPostsCount() {
  if (!_cachedPosts) _cachedPosts = await fetchPosts();
  if (!_cachedPosts.length) return 0;
  const lastSeenId = localStorage.getItem(BLOG_SEEN_KEY);
  if (!lastSeenId) return _cachedPosts.length;
  const idx = _cachedPosts.findIndex(p => String(p.id) === lastSeenId);
  return idx <= 0 ? 0 : idx; // posts antes del último visto = nuevos
}

// Marcar todos los posts actuales como vistos
export function markBlogSeen() {
  if (_cachedPosts?.length) {
    localStorage.setItem(BLOG_SEEN_KEY, String(_cachedPosts[0].id));
  }
}

// ── Vistas ──────────────────────────────────────────────────────────────────

function buildPostCard(post, featured = false) {
  const vid = youtubeId(post.portada || '');
  const hasImg = post.portada && !vid;
  const thumb = vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : '';
  const cls = featured ? 'blog-card blog-card--featured' : 'blog-card';

  return `
    <article class="${cls}" data-id="${post.id}" tabindex="0" role="button" aria-label="Leer: ${post.titulo}">
      ${hasImg
        ? `<div class="blog-card-cover" style="background-image:url('${post.portada}')"></div>`
        : vid
          ? `<div class="blog-card-cover blog-card-cover--yt" style="background-image:url('${thumb}')">
               <span class="blog-card-play">▶</span>
             </div>`
          : `<div class="blog-card-cover blog-card-cover--empty"><span>📰</span></div>`
      }
      <div class="blog-card-body">
        <div class="blog-card-date">${formatDate(post.fecha)}</div>
        <div class="blog-card-title">${post.titulo}</div>
        <div class="blog-card-excerpt">${excerpt(post.contenido, featured ? 160 : 100)}</div>
      </div>
    </article>
  `;
}

function buildArticleView(post) {
  const vid = youtubeId(post.portada || '');
  const hasImg = post.portada && !vid;

  return `
    <div class="blog-article">
      ${hasImg
        ? `<div class="blog-article-cover" style="background-image:url('${post.portada}')"></div>`
        : vid
          ? `<div class="blog-video blog-article-video">
               <iframe src="https://www.youtube.com/embed/${vid}"
                 title="${post.titulo}" frameborder="0" loading="lazy"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                 allowfullscreen></iframe>
             </div>`
          : ''
      }
      <div class="blog-article-body">
        <div class="blog-article-date">${formatDate(post.fecha)}</div>
        <h1 class="blog-article-title">${post.titulo}</h1>
        <div class="blog-article-content">${renderContent(post.contenido)}</div>
      </div>
    </div>
  `;
}

// ── Modal ───────────────────────────────────────────────────────────────────

export function showBlogModal() {
  const overlay = document.createElement('div');
  overlay.className = 'blog-overlay';

  overlay.innerHTML = `
    <div class="blog-modal" role="dialog" aria-modal="true" aria-label="Blog">

      <div class="blog-topbar">
        <button class="blog-back" aria-label="Volver" style="display:none">
          ← Volver
        </button>
        <div class="blog-topbar-title">📰 Blog</div>
        <button class="blog-close" aria-label="Cerrar">✕</button>
      </div>

      <div class="blog-body">
        <div class="blog-loading">
          <div class="blog-spinner"></div>
          <span>Cargando artículos...</span>
        </div>
      </div>

    </div>
  `;

  const body     = overlay.querySelector('.blog-body');
  const backBtn  = overlay.querySelector('.blog-back');
  const closeBtn = overlay.querySelector('.blog-close');
  let   posts    = [];

  function close() {
    overlay.classList.remove('blog-overlay--active');
    setTimeout(() => overlay.remove(), 280);
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });

  function attachCardHandlers() {
    body.querySelectorAll('.blog-card').forEach(card => {
      const handler = () => {
        const post = posts.find(p => p.id === card.dataset.id);
        if (post) showArticle(post);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });
  }

  function showList() {
    backBtn.style.display = 'none';
    if (!posts.length) {
      body.innerHTML = `<div class="blog-empty"><span>📭</span><p>Aún no hay artículos publicados.</p></div>`;
      return;
    }

    const [latest, ...rest] = posts;
    body.innerHTML = `
      <div class="blog-latest-label">🆕 Última publicación</div>
      ${buildPostCard(latest, true)}
      ${rest.length ? `<div class="blog-prev-label">Anteriores</div><div class="blog-grid">${rest.map(p => buildPostCard(p)).join('')}</div>` : ''}
    `;
    attachCardHandlers();
    body.scrollTop = 0;
  }

  function showArticle(post) {
    backBtn.style.display = '';
    body.innerHTML = buildArticleView(post);
    body.scrollTop = 0;

    const handler = () => {
      backBtn.removeEventListener('click', handler);
      showList();
    };
    backBtn.addEventListener('click', handler);
  }

  // Siempre refresca al abrir
  fetchPosts().then(loaded => {
    posts = loaded;
    markBlogSeen();
    showList();
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('blog-overlay--active')));
}
