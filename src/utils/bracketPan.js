export function initBracketPan(wrapper, content, header) {
  if (window.innerWidth > 1100) return { destroy() {}, reset() {} };

  let panX = 0, panY = 0;
  let baseX = 0, baseY = 0;
  let startX = 0, startY = 0;
  let velX = 0, velY = 0;
  let lastX = 0, lastY = 0, lastT = 0;
  let dragging = false;
  let rafId = null;

  // Sacar el content del stretch de flex para que tenga su ancho natural
  content.style.alignSelf     = 'flex-start';
  content.style.width         = 'max-content';
  content.style.minWidth      = '100%';
  content.style.transformOrigin = '0 0';
  content.style.willChange    = 'transform';

  function limits() {
    const cw = content.offsetWidth  || 720;
    const ch = content.offsetHeight || wrapper.clientHeight;
    return {
      minX: Math.min(0, wrapper.clientWidth  - cw),
      maxX: 0,
      minY: Math.min(0, wrapper.clientHeight - ch),
      maxY: 0
    };
  }

  function cl(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function applyPan(x, y) {
    const l = limits();
    panX = cl(x, l.minX, l.maxX);
    panY = cl(y, l.minY, l.maxY);
    content.style.transform = `translate(${panX}px,${panY}px)`;
    if (header) {
      const hide = panY < -24;
      header.classList.toggle('bp-header-hidden', hide);
      wrapper.classList.toggle('bp-header-hidden', hide);
    }
  }

  function stopInertia() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function startInertia() {
    stopInertia();
    function step() {
      velX *= 0.91; velY *= 0.91;
      if (Math.abs(velX) < 0.4 && Math.abs(velY) < 0.4) { rafId = null; return; }
      applyPan(panX + velX, panY + velY);
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  function onStart(e) {
    if (e.touches.length !== 1) return;
    stopInertia();
    dragging = true;
    const t = e.touches[0];
    startX = lastX = t.clientX;
    startY = lastY = t.clientY;
    baseX = panX; baseY = panY;
    lastT = Date.now();
    velX = velY = 0;
  }

  function onMove(e) {
    if (!dragging || e.touches.length !== 1) return;
    e.preventDefault();
    const t   = e.touches[0];
    const now = Date.now();
    const dt  = Math.max(1, now - lastT);
    velX = (lastX - t.clientX) / dt * 14;
    velY = (lastY - t.clientY) / dt * 14;
    lastX = t.clientX; lastY = t.clientY; lastT = now;
    applyPan(baseX + (t.clientX - startX), baseY + (t.clientY - startY));
  }

  function onEnd() { dragging = false; startInertia(); }

  wrapper.addEventListener('touchstart',  onStart, { passive: true  });
  wrapper.addEventListener('touchmove',   onMove,  { passive: false });
  wrapper.addEventListener('touchend',    onEnd,   { passive: true  });
  wrapper.addEventListener('touchcancel', onEnd,   { passive: true  });

  // Forzar cálculo de límites tras render completo
  requestAnimationFrame(() => applyPan(0, 0));

  return {
    reset() {
      stopInertia();
      applyPan(0, 0);
      velX = velY = 0;
      if (header) {
        header.classList.remove('bp-header-hidden');
        wrapper.classList.remove('bp-header-hidden');
      }
    },
    destroy() {
      stopInertia();
      wrapper.removeEventListener('touchstart',  onStart);
      wrapper.removeEventListener('touchmove',   onMove);
      wrapper.removeEventListener('touchend',    onEnd);
      wrapper.removeEventListener('touchcancel', onEnd);
    }
  };
}
