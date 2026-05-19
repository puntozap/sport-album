/**
 * Sistema de navegación entre páginas de países.
 *
 * Desktop (>1100px): drag horizontal con efecto 3D
 * Móvil (≤1100px): pan con un dedo + pinch-to-zoom + swipe vertical para cambiar país
 */

import { router } from '../router.js';
import { t } from '../i18n.js';

const SWIPE_THRESHOLD = 60;
const VERTICAL_RATIO = 1.8;
const SNAP_DURATION = 300;
const ALBUM_RATIO = 1629 / 907;
const MOB_MAX_SCALE = 3.0;

function isMobile() {
  return window.innerWidth <= 1100;
}

export function initPageSwipe({ appRoot, allIds, getCurrentId }) {
  let currentId = getCurrentId();
  let currentIndex = allIds.indexOf(currentId);
  let lastValidIndex = currentIndex >= 0 ? currentIndex : 0;

  // Desktop drag state
  let isDragging = false;
  let dragStartX = 0;
  let dragCurrentX = 0;

  // Mobile pan+zoom state
  let mobPanX = 0;
  let mobPanY = 0;
  let mobScale = 1.0;
  const mobMinScale = 1.0;

  // Mobile touch tracking
  let activePointers = new Map(); // identifier → {x, y}
  let singleStartX = 0, singleStartY = 0, singleStartTime = 0;
  let panBaseX = 0, panBaseY = 0;
  let isPinching = false;
  let pinchStartDist = 0, pinchStartScale = 1;
  let pinchStartMidX = 0, pinchStartMidY = 0;
  let pinchBasePanX = 0, pinchBasePanY = 0;

  // Inercia al soltar
  let velHistory = [];          // {x, y, t} — últimas muestras de posición
  let inertiaRAF = null;
  const FRICTION = 0.93;        // deceleración por frame (0.93 → ~1s de deslizamiento)
  const MIN_SPEED = 0.4;        // px/frame mínimo para seguir animando

  let overlay = null;
  let tutorial = null;
  let landscapeWarning = null;
  let landscapeWarningResizeHandler = null;
  const TUTORIAL_KEY = 'album-panini-tutorial-shown';
  let focusSlotHandler = null;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'swipe-overlay';
    overlay.innerHTML = `
      <div class="swipe-overlay-left">
        <span class="swipe-arrow">◀</span>
        <span class="swipe-label">${t('previous')}</span>
      </div>
      <div class="swipe-overlay-right">
        <span class="swipe-label">${t('next')}</span>
        <span class="swipe-arrow">▶</span>
      </div>
      <div class="swipe-overlay-up">
        <span class="swipe-arrow">▲</span>
        <span class="swipe-label">${t('previous')}</span>
      </div>
      <div class="swipe-overlay-down">
        <span class="swipe-label">${t('next')}</span>
        <span class="swipe-arrow">▼</span>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function createTutorial() {
    if (localStorage.getItem(TUTORIAL_KEY)) return;
    const mobile = isMobile();

    tutorial = document.createElement('div');
    tutorial.className = 'swipe-tutorial';
    tutorial.innerHTML = `
      <div class="swipe-tutorial-content">
        <div class="swipe-tutorial-hands">
          ${mobile ? `
            <div class="swipe-hand swipe-hand-up">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
              <span class="swipe-hand-text">${t('swipe_up_down')}</span>
            </div>
            <div class="swipe-hand swipe-hand-horizontal">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              <span class="swipe-hand-text">${t('drag_explore')}</span>
            </div>
          ` : `
            <div class="swipe-hand swipe-hand-left">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              <span class="swipe-hand-text">${t('swipe_left_next')}</span>
            </div>
            <div class="swipe-hand swipe-hand-right">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
              <span class="swipe-hand-text">${t('swipe_right_prev')}</span>
            </div>
          `}
        </div>
        <div class="swipe-tutorial-text">
          <h2>${t('tutorial_title')}</h2>
          <p>${mobile ? t('swipe_help_mobile') : t('swipe_help_desktop')}</p>
        </div>
        <button class="swipe-tutorial-btn">${t('tutorial_ok')}</button>
      </div>
    `;

    tutorial.querySelector('.swipe-tutorial-btn').addEventListener('click', dismissTutorial);
    tutorial.addEventListener('touchstart', dismissTutorial, { once: true });
    document.body.appendChild(tutorial);
  }

  function dismissTutorial() {
    if (!tutorial) return;
    tutorial.classList.add('swipe-tutorial-hide');
    localStorage.setItem(TUTORIAL_KEY, 'true');
    setTimeout(() => tutorial?.remove(), 500);
  }

  function canGoPrev() { 
    const idx = isBracketPage() ? lastValidIndex : currentIndex;
    return idx > 0; 
  }
  function canGoNext() { 
    const idx = isBracketPage() ? lastValidIndex : currentIndex;
    return idx < allIds.length - 1; 
  }
  function goPrev() { 
    const idx = isBracketPage() ? lastValidIndex : currentIndex;
    if (idx > 0) router.navigate(`/${allIds[idx - 1]}`); 
  }
  function goNext() { 
    const idx = isBracketPage() ? lastValidIndex : currentIndex;
    if (idx < allIds.length - 1) router.navigate(`/${allIds[idx + 1]}`); 
  }
  
  function isBracketPage() {
    return currentId === 'simulation';
  }
  function getContainer() { return appRoot.querySelector('.album-shell'); }

  // ===== DESKTOP DRAG =====

  function applyDragTransform(delta) {
    const container = getContainer();
    if (!container) return;
    const rotateY = (delta / window.innerWidth) * 8;
    const scale = 1 - Math.abs(delta) / window.innerWidth * 0.05;
    container.style.transition = 'none';
    container.style.transform = `translateX(${delta * 0.5}px) rotateY(${rotateY}deg) scale(${scale})`;
  }

  function snapBack() {
    const container = getContainer();
    if (!container) return;
    container.style.transition = `transform ${SNAP_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    container.style.transform = 'translateX(0) rotateY(0) scale(1)';
    setTimeout(() => { container.style.transition = ''; }, SNAP_DURATION);
  }

  function showOverlay(delta) {
    if (!overlay) return;
    overlay.classList.remove('swipe-overlay-active-left', 'swipe-overlay-active-right', 'swipe-overlay-active-up', 'swipe-overlay-active-down');
    if (!isMobile()) {
      if (delta > 0 && canGoPrev()) overlay.classList.add('swipe-overlay-active-left');
      else if (delta < 0 && canGoNext()) overlay.classList.add('swipe-overlay-active-right');
    } else {
      if (delta > 0 && canGoPrev()) overlay.classList.add('swipe-overlay-active-up');
      else if (delta < 0 && canGoNext()) overlay.classList.add('swipe-overlay-active-down');
    }
  }
  
  function getEffectiveIndex() {
    return isBracketPage() ? lastValidIndex : currentIndex;
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.classList.remove('swipe-overlay-active-left', 'swipe-overlay-active-right', 'swipe-overlay-active-up', 'swipe-overlay-active-down');
  }

  function onMouseDown(e) {
    if (isMobile()) return;
    // Modals / overlays handle their own interaction — don't interfere (avoid "F5" feeling by navigation)
    if (e.target.closest('.fixture-overlay, .sticker-reveal-overlay, .po-overlay, .fa-modal-overlay, .st-tray')) return;
    if (e.target.closest('button, a, input')) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragCurrentX = dragStartX;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    if (tutorial && !tutorial.classList.contains('swipe-tutorial-hide')) dismissTutorial();
  }

  function onMouseMove(e) {
    if (!isDragging || isMobile()) return;
    dragCurrentX = e.clientX;
    const delta = dragCurrentX - dragStartX;
    applyDragTransform(delta);
    showOverlay(delta);
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    hideOverlay();
    if (isMobile()) return;
    const delta = dragCurrentX - dragStartX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) { snapBack(); return; }
    if (delta > 0 && canGoPrev()) goPrev();
    else if (delta < 0 && canGoNext()) goNext();
    else snapBack();
  }

  function onKeyDown(e) {
    if (isBracketPage()) return;
    if (document.querySelector('.fixture-overlay, .sticker-reveal-overlay, .po-overlay, .fa-modal-overlay')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
  }

  // ===== MÓVIL: PAN + PINCH-TO-ZOOM =====

  function getMobNaturalSize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // En landscape el shell usa width: 100dvw; en portrait usa width: 100dvh * ratio
    if (vw > vh) {
      return { w: vw, h: vw / ALBUM_RATIO };
    }
    return { w: vh * ALBUM_RATIO, h: vh };
  }

  function clampMobPan(x, y, scale) {
    const { w, h } = getMobNaturalSize();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const displayW = w * scale;
    const displayH = h * scale;

    const cx = displayW >= vw
      ? Math.min(0, Math.max(vw - displayW, x))
      : (vw - displayW) / 2;

    const cy = displayH >= vh
      ? Math.min(0, Math.max(vh - displayH, y))
      : (vh - displayH) / 2;

    return { x: cx, y: cy };
  }

  function applyMobTransform(animated = false) {
    const shell = getContainer();
    if (!shell) return;
    if (animated) {
      shell.style.transition = `transform ${SNAP_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      setTimeout(() => { if (shell) shell.style.transition = ''; }, SNAP_DURATION + 10);
    } else {
      shell.style.transition = 'none';
    }
    shell.style.transform = `translate(${mobPanX}px, ${mobPanY}px) scale(${mobScale})`;
  }

  function initMobPanZoom() {
    stopInertia();
    mobScale = 1.0;
    mobPanX = 0;
    mobPanY = 0;
    activePointers.clear();
    isPinching = false;
    velHistory = [];
    // Pequeño delay para asegurar que el DOM ya tiene el tamaño correcto
    requestAnimationFrame(() => applyMobTransform());
  }

  function stopInertia() {
    if (inertiaRAF) { cancelAnimationFrame(inertiaRAF); inertiaRAF = null; }
  }

  function startInertia() {
    // Calcular velocidad a partir de las muestras recientes (últimos 80ms)
    const now = Date.now();
    const recent = velHistory.filter(s => now - s.t < 80);
    if (recent.length < 2) return;

    const first = recent[0];
    const last  = recent[recent.length - 1];
    const dt    = last.t - first.t;
    if (dt === 0) return;

    // Velocidad en px/frame (asumiendo 60fps → 16.67ms/frame)
    let vx = (last.x - first.x) / dt * 16.67;
    let vy = (last.y - first.y) / dt * 16.67;

    if (Math.hypot(vx, vy) < 1.5) return; // flick demasiado lento, no hace falta

    function step() {
      vx *= FRICTION;
      vy *= FRICTION;

      const nx = mobPanX + vx;
      const ny = mobPanY + vy;
      const clamped = clampMobPan(nx, ny, mobScale);

      // Al chocar con un borde, absorber esa componente
      if (Math.abs(clamped.x - nx) > 0.5) vx = 0;
      if (Math.abs(clamped.y - ny) > 0.5) vy = 0;

      mobPanX = clamped.x;
      mobPanY = clamped.y;
      applyMobTransform();

      if (Math.hypot(vx, vy) >= MIN_SPEED) {
        inertiaRAF = requestAnimationFrame(step);
      } else {
        inertiaRAF = null;
      }
    }

    inertiaRAF = requestAnimationFrame(step);
  }

  function onMobTouchStart(e) {
    // En simulación el bracket maneja su propio scroll — no interferir
    if (currentId === 'simulation') return;
    // Modals handle their own touch — don't interfere
    if (e.target.closest('.fixture-overlay, .sticker-reveal-overlay, .po-overlay, .fa-modal-overlay, .st-tray')) return;
    // Country nav handles its own scroll — don't interfere
    if (e.target.closest('.country-nav')) return;
    if (e.target.closest('button, a, input')) return;

    stopInertia(); // cancelar cualquier inercia activa al volver a tocar
    velHistory = [];

    for (const t of e.changedTouches) {
      activePointers.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    const count = activePointers.size;

    if (count === 1) {
      const [, t] = [...activePointers][0];
      singleStartX = t.x;
      singleStartY = t.y;
      singleStartTime = Date.now();
      panBaseX = mobPanX;
      panBaseY = mobPanY;
      isPinching = false;
    }

    if (count === 2) {
      stopInertia();
      isPinching = true;
      const pts = [...activePointers.values()];
      pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartScale = mobScale;
      pinchStartMidX = (pts[0].x + pts[1].x) / 2;
      pinchStartMidY = (pts[0].y + pts[1].y) / 2;
      pinchBasePanX = mobPanX;
      pinchBasePanY = mobPanY;
    }
  }

  function onMobTouchMove(e) {
    if (currentId === 'simulation') return;
    if (e.target.closest('.fixture-overlay, .sticker-reveal-overlay, .po-overlay, .fa-modal-overlay, .st-tray')) return;
    if (e.target.closest('.country-nav')) return;
    e.preventDefault(); // evita scroll y zoom nativo del browser

    for (const t of e.changedTouches) {
      if (activePointers.has(t.identifier)) {
        activePointers.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }

    const count = activePointers.size;

    if (count === 1 && !isPinching) {
      const [, t] = [...activePointers][0];
      const clamped = clampMobPan(
        panBaseX + (t.x - singleStartX),
        panBaseY + (t.y - singleStartY),
        mobScale
      );
      mobPanX = clamped.x;
      mobPanY = clamped.y;
      applyMobTransform();

      // Registrar posición para calcular velocidad al soltar
      velHistory.push({ x: t.x, y: t.y, t: Date.now() });
      if (velHistory.length > 8) velHistory.shift();

    } else if (count >= 2) {
      const pts = [...activePointers.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;

      const newScale = Math.max(mobMinScale, Math.min(MOB_MAX_SCALE,
        pinchStartScale * (dist / pinchStartDist)
      ));

      // Mantener el punto del álbum bajo el centro del pinch fijo
      const albumOrigX = (pinchStartMidX - pinchBasePanX) / pinchStartScale;
      const albumOrigY = (pinchStartMidY - pinchBasePanY) / pinchStartScale;

      const clamped = clampMobPan(
        midX - albumOrigX * newScale,
        midY - albumOrigY * newScale,
        newScale
      );
      mobPanX = clamped.x;
      mobPanY = clamped.y;
      mobScale = newScale;
      applyMobTransform();
    }
  }

  function onMobTouchEnd(e) {
    if (currentId === 'simulation') return;
    const wasOne = activePointers.size === 1;
    const wasPinching = isPinching;

    for (const t of e.changedTouches) {
      activePointers.delete(t.identifier);
    }

    // Si el touchend ocurre dentro de un modal/overlay, solo limpiar tracking y salir.
    if (e.target.closest('.fixture-overlay, .sticker-reveal-overlay, .po-overlay, .fa-modal-overlay, .st-tray')) {
      if (activePointers.size === 0) isPinching = false;
      return;
    }

    const remaining = activePointers.size;

    // Detectar swipe vertical para cambiar de país
    if (wasOne && !wasPinching && remaining === 0) {
      const t = e.changedTouches[0];
      const dx = t.clientX - singleStartX;
      const dy = t.clientY - singleStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const dt = Date.now() - singleStartTime;

      if (!isBracketPage() && dt < 400 && absDy >= SWIPE_THRESHOLD && absDy / Math.max(absDx, 1) >= VERTICAL_RATIO) {
        if (dy > 0 && canGoPrev()) goPrev();
        else if (dy < 0 && canGoNext()) goNext();
        return;
      }
    }

    // Arrancar inercia si no hubo navegación vertical ni pinch
    if (remaining === 0 && !wasPinching) {
      startInertia();
    }

    // Snap de vuelta si el scale quedó por debajo del mínimo
    if (remaining === 0 && mobScale < mobMinScale) {
      mobScale = mobMinScale;
      const clamped = clampMobPan(mobPanX, mobPanY, mobScale);
      mobPanX = clamped.x;
      mobPanY = clamped.y;
      applyMobTransform(true);
    }

    // Al pasar de 2 dedos a 1: resetear baseline del dedo restante
    if (remaining === 1) {
      isPinching = false;
      const [, t] = [...activePointers][0];
      singleStartX = t.x;
      singleStartY = t.y;
      singleStartTime = Date.now();
      panBaseX = mobPanX;
      panBaseY = mobPanY;
    }

    if (remaining === 0) isPinching = false;
  }

  // ===== LANDSCAPE WARNING (álbum en horizontal móvil) =====

  function isLandscapeMobile() {
    return window.innerWidth <= 1100 && window.innerWidth > window.innerHeight;
  }

  function showLandscapeWarning() {
    if (landscapeWarning) return;
    landscapeWarning = document.createElement('div');
    landscapeWarning.className = 'swipe-landscape-warning';
    landscapeWarning.innerHTML = `
      <div class="swipe-landscape-warning-icon">📱</div>
      <div class="swipe-landscape-warning-title">${t('rotate_back_title')}</div>
      <div class="swipe-landscape-warning-sub">${t('rotate_back_sub')}</div>
    `;
    document.body.appendChild(landscapeWarning);
    requestAnimationFrame(() => landscapeWarning?.classList.add('visible'));
  }

  function hideLandscapeWarning() {
    if (!landscapeWarning) return;
    landscapeWarning.classList.remove('visible');
    const el = landscapeWarning;
    landscapeWarning = null;
    setTimeout(() => el.remove(), 350);
  }

  function attachOrientationMonitor() {
    detachOrientationMonitor();
    landscapeWarningResizeHandler = () => {
      if (isLandscapeMobile()) showLandscapeWarning();
      else hideLandscapeWarning();
    };
    window.addEventListener('resize', landscapeWarningResizeHandler);
    // Check immediately
    landscapeWarningResizeHandler();
  }

  function detachOrientationMonitor() {
    if (landscapeWarningResizeHandler) {
      window.removeEventListener('resize', landscapeWarningResizeHandler);
      landscapeWarningResizeHandler = null;
    }
    hideLandscapeWarning();
  }

  // ===== INIT / DETACH =====

  function attach() {
    createOverlay();
    createTutorial();

    if (isMobile()) {
      initMobPanZoom();
      // passive: false en touchmove es obligatorio para poder llamar preventDefault()
      document.addEventListener('touchstart', onMobTouchStart, { passive: true });
      document.addEventListener('touchmove', onMobTouchMove, { passive: false });
      document.addEventListener('touchend', onMobTouchEnd, { passive: true });
    } else {
      document.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('keydown', onKeyDown);

    // Permite que otros componentes (ej: bandeja de cromos) pidan enfocar un slot en móvil
    focusSlotHandler = (ev) => {
      if (!isMobile()) return;
      if (currentId === 'simulation') return;
      const d = ev?.detail || {};
      const { countryId, slotIndex } = d;
      if (!countryId || slotIndex == null) return;
      const el = document.querySelector(`[data-country-id="${countryId}"][data-slot-index="${slotIndex}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = window.innerWidth / 2 - cx;
      const dy = window.innerHeight / 2 - cy;

      const next = clampMobPan(mobPanX + dx, mobPanY + dy, mobScale);
      mobPanX = next.x;
      mobPanY = next.y;
      applyMobTransform(true);
    };
    window.addEventListener('album:focus-slot', focusSlotHandler);
  }

  function detach() {
    document.removeEventListener('touchstart', onMobTouchStart);
    document.removeEventListener('touchmove', onMobTouchMove);
    document.removeEventListener('touchend', onMobTouchEnd);
    document.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('keydown', onKeyDown);
    if (focusSlotHandler) {
      window.removeEventListener('album:focus-slot', focusSlotHandler);
      focusSlotHandler = null;
    }
    if (overlay) overlay.remove();
    if (tutorial) tutorial.remove();
    detachOrientationMonitor();
  }

  function update(newCurrentId) {
    currentId = newCurrentId;
    currentIndex = allIds.indexOf(currentId);
    if (currentIndex >= 0) {
      lastValidIndex = currentIndex;
    }

    if (isMobile()) {
      if (currentId === 'simulation') {
        // En simulación: quitar listeners de touch y monitor de orientación
        document.removeEventListener('touchstart', onMobTouchStart);
        document.removeEventListener('touchmove',  onMobTouchMove);
        document.removeEventListener('touchend',   onMobTouchEnd);
        detachOrientationMonitor();
      } else {
        // Al volver a una página de país: reactivar listeners y monitor de orientación
        document.removeEventListener('touchstart', onMobTouchStart);
        document.removeEventListener('touchmove',  onMobTouchMove);
        document.removeEventListener('touchend',   onMobTouchEnd);
        document.addEventListener('touchstart', onMobTouchStart, { passive: true });
        document.addEventListener('touchmove',  onMobTouchMove,  { passive: false });
        document.addEventListener('touchend',   onMobTouchEnd,   { passive: true });
        initMobPanZoom();
        attachOrientationMonitor();
      }
    }
  }

  attach();
  return { detach, update };
}
