const CACHE_STATIC = 'album-static-v4';   // assets que no cambian
const CACHE_DYNAMIC = 'album-dynamic-v4'; // cromos y API (se cachean al visitar)
const CACHE_FLAGS = 'album-flags-v4';     // banderas de flagcdn.com

// ── Assets que se descargan en la instalación ─────────────────────────────
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/flags.webp',
  '/flags@2x.webp',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/backgrounds/album-fondo-vectorial.svg',
  '/assets/backgrounds/fondo-base64.png',
  // Fondos de las 51 páginas del álbum
  ...Array.from({ length: 51 }, (_, i) =>
    `/assets/backgrounds/pagina_${String(i + 1).padStart(2, '0')}.png`
  ),
];

// ── Instalación: precachear assets esenciales ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

// ── Cachear cromos en segundo plano (sin bloquear) ────────────────────────
async function cacheStickerImages() {
  try {
    const res = await fetch('/api/stickerMap.json', { cache: 'no-store' });
    if (!res.ok) return;
    const map = await res.json();
    const urls = Object.values(map).flat()
      .filter(u => u && typeof u === 'string' && !u.startsWith('http'))
      .map(u => u.startsWith('/') ? u : '/' + u);

    const cache = await caches.open(CACHE_DYNAMIC);
    // Cachear en lotes de 20 para no saturar la red
    for (let i = 0; i < urls.length; i += 20) {
      await Promise.allSettled(
        urls.slice(i, i + 20).map(url =>
          cache.match(url).then(cached => {
            if (!cached) return fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null);
          })
        )
      );
    }
  } catch (_) {}
}

// ── Códigos de banderas de los 48 equipos (flagcdn.com) ──────────────────
const FLAG_CODES = ["mx","za","kr","cz","ca","ba","qa","ch","br","ma","ht",
  "gb-sct","us","py","au","tr","de","cw","ci","ec","nl","jp","se","tn","be",
  "eg","ir","nz","es","cv","sa","uy","fr","sn","iq","no","ar","dz","at","jo",
  "pt","cd","uz","co","gb-eng","hr","gh","pa"];

// Tamaños usados en la app + extras del selector de idioma
const FLAG_EXTRAS = ['us','es'];
const FLAG_SIZES  = ['w40','w80','w160','w320'];

async function cacheFlagImages() {
  const cache = await caches.open(CACHE_FLAGS);
  const allCodes = [...new Set([...FLAG_CODES, ...FLAG_EXTRAS])];
  const urls = allCodes.flatMap(code =>
    FLAG_SIZES.map(size => `https://flagcdn.com/${size}/${code}.png`)
  );
  // Lotes de 10 para no saturar
  for (let i = 0; i < urls.length; i += 10) {
    await Promise.allSettled(
      urls.slice(i, i + 10).map(url =>
        cache.match(url).then(cached => {
          if (cached) return;
          return fetch(url, { mode: 'cors' })
            .then(r => r.ok ? cache.put(url, r) : null)
            .catch(() => null);
        })
      )
    );
  }
}

// ── Activación: limpiar cachés viejos y arrancar descargas en background ──
self.addEventListener('activate', e => {
  const keep = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_FLAGS];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => Promise.all([
        cacheStickerImages(),  // 576 cromos locales
        cacheFlagImages(),     // banderas de flagcdn.com
      ]))
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Banderas de flagcdn.com → caché primero
  if (url.hostname === 'flagcdn.com') {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request, { mode: 'cors' }).then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_FLAGS).then(c => c.put(request, copy));
          }
          return res;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Navegación SPA: siempre devolver index.html (desde caché si no hay red)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          // Actualizar caché con la versión más reciente
          const copy = res.clone();
          caches.open(CACHE_STATIC).then(c => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // API dinámica: red primero, caché como fallback (funciona offline con datos viejos)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_DYNAMIC).then(c => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cromos: red primero, se cachean al cargar (offline muestra los ya visitados)
  if (url.pathname.startsWith('/cromos_extraidos/')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_DYNAMIC).then(c => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Fondos, íconos, flags: caché primero (precacheados en install)
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/flags.webp' ||
    url.pathname === '/flags@2x.webp'
  ) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_STATIC).then(c => c.put(request, copy));
          }
          return res;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // Todo lo demás: red con fallback silencioso
  e.respondWith(fetch(request).catch(() => new Response('', { status: 408 })));
});
