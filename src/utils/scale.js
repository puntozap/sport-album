/**
 * Escala el álbum para desktop.
 *
 * Desktop (>1100px): sin transformaciones, álbum centrado con max-width via CSS.
 * Móvil (≤1100px): no hace nada — CSS + PageSwipe.js gestionan el pan/zoom.
 */

export function initResponsiveScale() {
  const app = document.getElementById('app');

  function resetMobileOverrides() {
    const shell = document.querySelector('.album-shell');
    if (!shell) return;
    // Limpiar cualquier inline style que pueda haber quedado de ejecuciones anteriores
    shell.style.width = '';
    shell.style.height = '';
    shell.style.display = '';
    app.style.width = '';
    app.style.height = '';
    app.style.overflow = '';
    app.style.overflowX = '';
    app.style.overflowY = '';
    app.style.display = '';
    app.style.webkitOverflowScrolling = '';
    document.body.style.overflow = '';
    document.body.style.height = '';
    document.body.style.margin = '';
  }

  function scale() {
    const vw = window.innerWidth;

    if (vw > 1100) {
      // Desktop: limpiar overrides por si se redimensionó desde móvil
      resetMobileOverrides();
    }
    // Móvil: el CSS y PageSwipe.js lo gestionan todo — no tocar nada
  }

  scale();
  window.addEventListener('resize', scale);
  window.addEventListener('orientationchange', () => setTimeout(scale, 200));
}
