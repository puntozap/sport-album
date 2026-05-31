// Slug de empresa activo (null = modo normal sin empresa)
let _companySlug = '';

export function setCompanySlug(slug) { _companySlug = slug || ''; }
export function getCompanySlug()     { return _companySlug; }

export const router = {
  routes: new Map(),

  on(path, handler) {
    this.routes.set(path, handler);
  },

  navigate(path, { force = false } = {}) {
    // Bloquear navegación cuando hay un modal activo (salvo forced)
    if (!force && isModalOpen()) return;

    const normalized = path.startsWith('/') ? path : '/' + path;

    // En modo archivo (file://) usamos hash sin prefijo de empresa
    if (window.location.protocol === 'file:') {
      window.location.hash = normalized;
      return;
    }

    // Anteponer slug de empresa si existe: /mexico → /isacell/mexico
    const fullPath = _companySlug ? `/${_companySlug}${normalized}` : normalized;
    window.history.pushState({}, '', fullPath);
    this.resolve();
    window.dispatchEvent(new Event('routechange'));
  },

  resolve() {
    const fromHash = window.location.hash?.startsWith('#/')
      ? window.location.hash.slice(1)
      : '';

    let path = fromHash || window.location.pathname || '/';

    // Quitar prefijo de empresa: /isacell/mexico → /mexico
    if (_companySlug) {
      const prefix = '/' + _companySlug;
      if (path === prefix || path === prefix + '/') {
        path = '/';
      } else if (path.startsWith(prefix + '/')) {
        path = path.slice(prefix.length);
      }
    }

    if (!path || path === '/') path = '/';

    const handler = this.routes.get(path) || this.routes.get('/404');
    if (handler) handler(path);
  }
};

// Detecta si hay algún modal/overlay bloqueando la navegación
function isModalOpen() {
  return !!(
    document.querySelector('.po-overlay.po-active') ||
    document.querySelector('.fa-modal-overlay.fa-modal-active') ||
    document.querySelector('.fixture-overlay') ||
    document.querySelector('.sticker-reveal-overlay.sticker-reveal-active') ||
    document.querySelector('.gr-overlay') ||
    document.querySelector('.rv-overlay')
  );
}

window.addEventListener('hashchange', () => {
  if (isModalOpen()) return;
  router.resolve();
  window.dispatchEvent(new Event('routechange'));
});

window.addEventListener('popstate', () => {
  if (isModalOpen()) return;
  router.resolve();
  window.dispatchEvent(new Event('routechange'));
});
