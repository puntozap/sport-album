import '../styles/sticker-tray.css';
import { countries } from '../data/countries.js';
import { isEmpresaMode, getEmpresaEntities } from '../data/albumContext.js';
import { collectionStore } from '../data/collectionStore.js';
import { router, getCompanySlug } from '../router.js';
import { Slot } from './Slot.js';
import { initStickerReveal } from './StickerReveal.js';
import { getLang } from '../i18n.js';
import { checkLastStickerCelebration } from './LastStickerCelebration.js';

let trayEl = null;
let armedStickerKey = null; // 1er toque: navegar/armar, 2do toque (en página correcta): pegar
let armedCardEl = null;
const TRAY_TUTORIAL_KEY = 'wc2026_tray_tutorial_shown';
const TRAY_COLLAPSED_KEY = 'wc2026_tray_collapsed';

window.addEventListener('routechange', () => { armedStickerKey = null; setArmedCard(null); });

const stickerReveal = initStickerReveal();

// Construido lazy para respetar el modo activo al momento de usar la bandeja
function buildCountryMap() {
  const map = {};
  const entities = isEmpresaMode() ? getEmpresaEntities() : countries;
  entities.forEach(c => { map[c.id] = c; });
  return map;
}

// ── API pública ─────────────────────────────────────────────────────────────

export function initStickerTray() {
  const pending = collectionStore.getPendingPack();
  if (pending.length > 0) renderTray(pending);
}

export function refreshStickerTray() {
  const pending = collectionStore.getPendingPack();
  if (trayEl) { trayEl.remove(); trayEl = null; }
  if (pending.length > 0) renderTray(pending);
}

export function armSticker(countryId, slotIndex) {
  if (!trayEl) return;
  const card = trayEl.querySelector(
    `.st-card[data-country-id="${countryId}"][data-slot-index="${slotIndex}"]`
  );
  if (!card) return;
  armedStickerKey = `${countryId}:${slotIndex}`;
  setArmedCard(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// ── Render ──────────────────────────────────────────────────────────────────

function renderTray(pending) {
  if (trayEl) trayEl.remove();

  trayEl = document.createElement('div');
  trayEl.className = 'st-tray';
  // Bloquear gestos globales del álbum (PageSwipe escucha touch en document)
  trayEl.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  trayEl.addEventListener('touchend',   e => e.stopPropagation(), { passive: true });
  trayEl.addEventListener('touchmove',  e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
  // Desktop: evitar que el PageSwipe (mousedown global) se active al interactuar con la bandeja
  trayEl.addEventListener('pointerdown', e => e.stopPropagation());
  trayEl.innerHTML = `
    <div class="st-tray-label">
      <button class="st-tray-toggle" type="button" aria-label="Minimizar/expandir">▾</button>
      <span class="st-tray-title">🎴 Pega tus cromos</span>
      <span class="st-tray-count" aria-label="Cromos pendientes"></span>
    </div>
    <div class="st-tray-row"></div>
  `;
  const row = trayEl.querySelector('.st-tray-row');

  const countryMap = buildCountryMap();
  pending.forEach(({ countryId, slotIndex }) => {
    const country = countryMap[countryId];
    if (!country) return;
    const slot = country.slots.find(s => s.number === slotIndex);
    if (!slot?.stickerUrl) return;

    const card = buildCard({ countryId, slotIndex, slot, country });
    row.appendChild(card);
  });

  document.body.appendChild(trayEl);
  updateTrayCount();
  maybeShowTrayTutorial();
  requestAnimationFrame(() => trayEl.classList.add('st-tray-visible'));

  // En móvil: colapsado por defecto si no hay preferencia guardada
  const hasSaved = localStorage.getItem(TRAY_COLLAPSED_KEY) !== null;
  const isMobileScreen = window.innerWidth < 900;
  const shouldCollapse = hasSaved
    ? localStorage.getItem(TRAY_COLLAPSED_KEY) === '1'
    : isMobileScreen;
  if (shouldCollapse) setTrayCollapsed(true);

  const toggleBtn = trayEl.querySelector('.st-tray-toggle');
  const label = trayEl.querySelector('.st-tray-label');
  const toggle = () => setTrayCollapsed(!trayEl.classList.contains('st-tray--collapsed'));
  toggleBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  // Tap en el header también alterna (sin interferir con cards)
  label?.addEventListener('click', (e) => {
    if (e.target?.closest?.('.st-tray-toggle')) return;
    toggle();
  });
}

function buildCard({ countryId, slotIndex, slot, country }) {
  const card = document.createElement('div');
  card.className = 'st-card';
  card.dataset.countryId = countryId;
  card.dataset.slotIndex = slotIndex;
  card.title = `${country.name} · ${slot.name.replace(/\n/, ' ')}`;

  const flagHtml = country.federation?.flag
    ? `<img class="st-card-flag" src="https://flagcdn.com/w40/${country.federation?.flag}.png" alt="" draggable="false">`
    : '';
  card.innerHTML = `
    <div class="st-card-img-wrap">
      <img class="st-card-img" src="${slot.stickerUrl}" alt="${slot.name}" draggable="false">
      ${flagHtml}
    </div>
    <div class="st-card-label">${country.code} <span>${slotIndex}</span></div>
  `;

  const IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
  const cardImg = card.querySelector('.st-card-img');
  cardImg.onerror = () => {
    const src = cardImg.getAttribute('src') || '';
    const ext = src.split('.').pop().split('?')[0].toLowerCase();
    const nextIdx = IMG_EXTS.indexOf(ext) + 1;
    if (nextIdx > 0 && nextIdx < IMG_EXTS.length) {
      cardImg.src = src.replace(/\.[^.?]+(\?.*)?$/, '.' + IMG_EXTS[nextIdx]);
    } else {
      cardImg.removeAttribute('src');
    }
  };

  attachTapInteraction(card, { countryId, slotIndex, slot, country });
  return card;
}

// ── Interaction: click vs drag ───────────────────────────────────────────────

function attachInteraction(card, sticker) {
  card.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    // Evitar que el PageSwipe (mousedown global) se active al interactuar con la bandeja
    e.stopPropagation();
    // Capturar el puntero para no “perder” el drag si el usuario suelta fuera del viewport/ventana.
    try { card.setPointerCapture(e.pointerId); } catch {}

    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let dragStarted = false;
    let dragState = null;
    let safetyTimer = null;

    function onMove(ev) {
      // Si el navegador deja de reportar botones/puntero activo, cancelar el drag.
      if (ev.pointerType === 'mouse' && ev.buttons === 0) {
        onCancel();
        return;
      }
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // Drag deshabilitado: dejar el umbral muy alto para que nunca arranque.
      if (!moved && (Math.abs(dx) > 9999 || Math.abs(dy) > 9999)) {
        moved = true;
        dragStarted = true;
        dragState = beginDrag(ev, card, sticker);
        // Failsafe: si por cualquier razón no llega pointerup/cancel, revertir el estado.
        safetyTimer = setTimeout(onCancel, 2500);
      } else if (dragStarted && dragState) {
        dragState.onMove(ev);
      }
    }

    function onUp(ev) {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
      if (safetyTimer) clearTimeout(safetyTimer);
      try { card.releasePointerCapture(e.pointerId); } catch {}

      if (dragStarted && dragState) {
        dragState.onUp(ev);
      } else {
        // Short tap → click-to-place
        handleClick(card, sticker);
      }
    }

    function onCancel() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
      if (safetyTimer) clearTimeout(safetyTimer);
      try { card.releasePointerCapture(e.pointerId); } catch {}
      card.classList.remove('st-card-dragging');
      dragState?.cancel?.();
    }

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel, { once: true });
  });
}

function attachTapInteraction(card, sticker) {
  // UX:
  // - 1 click / 1 tap: navegar y "armar" el cromo
  // - doble click / doble tap: pegar con animación
  const DOUBLE_TAP_MS = 320;
  const MAX_TAP_MOVE = 12;
  let lastTapAt = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  card.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    // Evitar que el PageSwipe (mousedown global) se active al interactuar con la bandeja
    e.stopPropagation();

    const now = performance.now();
    const dx = e.clientX - lastTapX;
    const dy = e.clientY - lastTapY;
    const closeEnough = Math.abs(dx) <= MAX_TAP_MOVE && Math.abs(dy) <= MAX_TAP_MOVE;

    if (lastTapAt && (now - lastTapAt <= DOUBLE_TAP_MS) && closeEnough) {
      lastTapAt = 0;
      lastTapX = 0;
      lastTapY = 0;
      handleDoubleActivate(card, sticker);
      return;
    }

    lastTapAt = now;
    lastTapX = e.clientX;
    lastTapY = e.clientY;
    handleClick(card, sticker);
  });
}

// ── Click-to-place ───────────────────────────────────────────────────────────

function handleClick(card, sticker) {
  // Toque simple: no hace nada. Todo se gestiona con doble tap.
}

function handleDoubleActivate(card, sticker) {
  const key = `${sticker.countryId}:${sticker.slotIndex}`;
  const currentId = getCurrentId();

  if (currentId !== sticker.countryId) {
    // Doble tap fuera de la página del equipo → navegar
    armedStickerKey = key;
    setArmedCard(card);
    window.dispatchEvent(new CustomEvent('tray:tutorial', { detail: { type: 'single', key } }));
    router.navigate(`/${sticker.countryId}`);
    return;
  }

  // Doble tap en la página correcta → pegar el cromo
  const slotEl = findSlotEl(sticker.countryId, sticker.slotIndex);
  if (!slotEl) return;
  window.dispatchEvent(new CustomEvent('tray:tutorial', { detail: { type: 'double', key } }));
  armedStickerKey = key;
  setArmedCard(card);
  window.dispatchEvent(new CustomEvent('album:focus-slot', { detail: { countryId: sticker.countryId, slotIndex: sticker.slotIndex } }));
  setTimeout(() => flyCardToSlot(card, slotEl, sticker), 260);
}

function flyCardToSlot(card, slotEl, sticker) {
  const cardRect = card.getBoundingClientRect();
  const slotRect = slotEl.getBoundingClientRect();

  const clone = card.cloneNode(true);
  clone.style.cssText = `
    position: fixed;
    left: ${cardRect.left}px;
    top: ${cardRect.top}px;
    width: ${cardRect.width}px;
    height: ${cardRect.height}px;
    z-index: 99999;
    pointer-events: none;
    border-radius: 10px;
    overflow: hidden;
    transition: left 0.38s cubic-bezier(0.4,0,0.2,1),
                top 0.38s cubic-bezier(0.4,0,0.2,1),
                width 0.38s cubic-bezier(0.4,0,0.2,1),
                height 0.38s cubic-bezier(0.4,0,0.2,1),
                opacity 0.2s 0.3s;
  `;
  document.body.appendChild(clone);
  card.classList.add('st-card-dragging');

  // Highlight slot
  slotEl.classList.add('st-slot-target');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.style.left    = `${slotRect.left}px`;
    clone.style.top     = `${slotRect.top}px`;
    clone.style.width   = `${slotRect.width}px`;
    clone.style.height  = `${slotRect.height}px`;
    clone.style.opacity = '0';
  }));

  setTimeout(() => {
    clone.remove();
    slotEl.classList.remove('st-slot-target');
    placeStickerInSlot(slotEl, sticker);
    collectionStore.collect(sticker.countryId, sticker.slotIndex);
    collectionStore.removePending(sticker.countryId, sticker.slotIndex);
    card.remove();
    setArmedCard(null);
    updateTrayCount();
    checkTrayEmpty();
    checkLastStickerCelebration();
  }, 420);
}

// ── Drag & Drop (Pointer Events) ─────────────────────────────────────────────

function beginDrag(e, card, sticker) {
  const rect  = card.getBoundingClientRect();
  // Si se empieza a arrastrar, quitar el estado "seleccionado/agrandado"
  setArmedCard(null);
  const ghost = card.cloneNode(true);
  ghost.className = 'st-card st-ghost';
  ghost.style.cssText = `
    position:fixed; left:${rect.left}px; top:${rect.top}px;
    width:${rect.width}px; height:${rect.height}px;
    z-index:99999; pointer-events:none; touch-action:none;
  `;
  document.body.appendChild(ghost);
  card.classList.add('st-card-dragging');

  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  const targetSlot = findSlotEl(sticker.countryId, sticker.slotIndex);
  if (targetSlot) targetSlot.classList.add('st-slot-target');

  let currentOver = null;

  function onMove(ev) {
    ghost.style.left = `${ev.clientX - offsetX}px`;
    ghost.style.top  = `${ev.clientY - offsetY}px`;

    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const slotEl = el?.closest('[data-country-id][data-slot-index]');
    const isOver = slotEl &&
      slotEl.dataset.countryId === sticker.countryId &&
      +slotEl.dataset.slotIndex === sticker.slotIndex;

    if (isOver && currentOver !== slotEl) {
      currentOver = slotEl;
      ghost.classList.add('st-ghost-over');
      slotEl.classList.add('st-slot-over');
    } else if (!isOver) {
      currentOver = null;
      ghost.classList.remove('st-ghost-over');
      targetSlot?.classList.remove('st-slot-over');
    }
  }

  function onUp(ev) {
    card.classList.remove('st-card-dragging');
    targetSlot?.classList.remove('st-slot-target', 'st-slot-over');

    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const dropEl = el?.closest('[data-country-id][data-slot-index]');
    const correct = dropEl &&
      dropEl.dataset.countryId === sticker.countryId &&
      +dropEl.dataset.slotIndex === sticker.slotIndex;

    if (correct) {
      const slotRect = dropEl.getBoundingClientRect();
      ghost.style.transition = 'left 0.25s, top 0.25s, opacity 0.2s';
      ghost.style.left    = `${slotRect.left}px`;
      ghost.style.top     = `${slotRect.top}px`;
      ghost.style.opacity = '0';
      setTimeout(() => {
        ghost.remove();
        placeStickerInSlot(dropEl, sticker);
        collectionStore.collect(sticker.countryId, sticker.slotIndex);
        collectionStore.removePending(sticker.countryId, sticker.slotIndex);
        card.remove();
        setArmedCard(null);
        updateTrayCount();
        checkTrayEmpty();
        checkLastStickerCelebration();
      }, 260);
    } else {
      ghost.style.transition = 'left 0.28s cubic-bezier(0.22,1,0.36,1), top 0.28s cubic-bezier(0.22,1,0.36,1)';
      ghost.style.left = `${rect.left}px`;
      ghost.style.top  = `${rect.top}px`;
      setTimeout(() => ghost.remove(), 300);
    }
  }

  function cancel() {
    try { ghost.remove(); } catch {}
    targetSlot?.classList.remove('st-slot-target', 'st-slot-over');
  }

  return { onMove, onUp, cancel };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function findSlotEl(countryId, slotIndex) {
  return document.querySelector(
    `[data-country-id="${countryId}"][data-slot-index="${slotIndex}"]`
  );
}

function getCurrentId() {
  const fromHash = window.location.hash?.startsWith('#/')
    ? window.location.hash.slice(1)
    : '';

  let path = fromHash || window.location.pathname || '/mexico';

  const slug = getCompanySlug();
  if (slug) {
    const prefix = '/' + slug;
    if (path.startsWith(prefix + '/')) path = path.slice(prefix.length);
    else if (path === prefix) path = '/';
  }

  return path.replace(/^\//, '') || 'mexico';
}

function placeStickerInSlot(slotEl, sticker) {
  // Re-render del slot con el mismo componente que usa la página,
  // para conservar flip + click de detalle.
  const slotData = sticker.slot;
  const country = sticker.country;

  const newSlot = Slot({
    code: country.code,
    countryId: sticker.countryId,
    number: sticker.slotIndex,
    name: slotData.name,
    type: slotData.type,
    pos: slotData.pos,
    btnCorner: slotData.btnCorner,
    stickerUrl: slotData.stickerUrl,
    countryName: country.name,
    flag: country.federation?.flag || null,
    onStickerClick: (data) => stickerReveal.show(data),
  });

  slotEl.replaceWith(newSlot);
}

function checkTrayEmpty() {
  const remaining = collectionStore.getPendingPack();
  if (remaining.length === 0 && trayEl) {
    trayEl.classList.remove('st-tray-visible');
    setTimeout(() => { trayEl?.remove(); trayEl = null; }, 400);
  }
}

function updateTrayCount() {
  if (!trayEl) return;
  const countEl = trayEl.querySelector('.st-tray-count');
  if (!countEl) return;
  const count = trayEl.querySelectorAll('.st-card').length;
  countEl.textContent = count > 0 ? `(${count})` : '';
}

function setTrayCollapsed(collapsed) {
  if (!trayEl) return;
  trayEl.classList.toggle('st-tray--collapsed', !!collapsed);
  localStorage.setItem(TRAY_COLLAPSED_KEY, collapsed ? '1' : '0');
  const btn = trayEl.querySelector('.st-tray-toggle');
  if (btn) btn.textContent = collapsed ? '▸' : '▾';
  // Si está colapsado, ocultar tutorial para que no tape pantalla
  const tut = trayEl.querySelector('.st-tray-tutorial');
  if (tut) tut.style.display = collapsed ? 'none' : '';
}

function setArmedCard(el) {
  if (armedCardEl && armedCardEl !== el) {
    armedCardEl.classList.remove('st-card-armed');
  }
  armedCardEl = el || null;
  if (armedCardEl) armedCardEl.classList.add('st-card-armed');
}

function maybeShowTrayTutorial() {
  if (!trayEl) return;
  if (localStorage.getItem(TRAY_TUTORIAL_KEY)) return;

  const es = getLang() === 'es';

  // Esperar a que el tray esté visible y el primer card tenga posición
  setTimeout(() => {
    const firstCard = trayEl?.querySelector('.st-card');
    if (!firstCard) return;

    showFingerTutorial(firstCard, es);
  }, 600);
}

function showFingerTutorial(card, es) {
  if (document.querySelector('.st-finger-tutorial')) return;

  const TOTAL_CYCLES = 3;
  let cycle = 0;
  let dismissed = false;
  let timers = [];

  const wrap = document.createElement('div');
  wrap.className = 'st-finger-tutorial';
  wrap.innerHTML = `
    <div class="st-finger-scrim"></div>
    <div class="st-finger-spotlight"></div>
    <div class="st-finger-bubble">
      <span>${es ? '👆 Doble toque para pegar el cromo' : '👆 Double tap to place the sticker'}</span>
    </div>
    <div class="st-finger-hand">
      <div class="st-finger-icon">👆</div>
      <div class="st-finger-ripple r1"></div>
      <div class="st-finger-ripple r2"></div>
    </div>
    <button class="st-finger-skip">${es ? 'Entendido' : 'Got it'}</button>
  `;
  document.body.appendChild(wrap);

  const spotlight = wrap.querySelector('.st-finger-spotlight');
  const hand      = wrap.querySelector('.st-finger-hand');
  const r1        = wrap.querySelector('.st-finger-ripple.r1');
  const r2        = wrap.querySelector('.st-finger-ripple.r2');
  const bubble    = wrap.querySelector('.st-finger-bubble');
  const skipBtn   = wrap.querySelector('.st-finger-skip');

  function positionOverCard() {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;

    spotlight.style.left   = `${cx}px`;
    spotlight.style.top    = `${cy}px`;
    hand.style.left        = `${cx}px`;
    hand.style.top         = `${cy - 10}px`;
    bubble.style.left      = `${cx}px`;
    bubble.style.top       = `${rect.top - 48}px`;
    r1.style.left = r2.style.left = `${cx}px`;
    r1.style.top  = r2.style.top  = `${cy}px`;
  }

  function fireRipple() {
    [r1, r2].forEach(r => {
      r.classList.remove('st-finger-ripple--active');
      void r.offsetWidth;
      r.classList.add('st-finger-ripple--active');
    });
  }

  function doTap(offsetMs) {
    return setTimeout(() => {
      if (dismissed) return;
      hand.classList.add('st-finger--tap');
      fireRipple();
      setTimeout(() => hand.classList.remove('st-finger--tap'), 180);
    }, offsetMs);
  }

  function runCycle() {
    if (dismissed) return;
    positionOverCard();
    // Tap 1 at t=0, tap 2 at t=350
    timers.push(doTap(0));
    timers.push(doTap(350));
    // Next cycle after 3s
    timers.push(setTimeout(() => {
      cycle++;
      if (cycle < TOTAL_CYCLES) {
        runCycle();
      } else {
        dismiss();
      }
    }, 3000));
  }

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    timers.forEach(clearTimeout);
    localStorage.setItem(TRAY_TUTORIAL_KEY, '1');
    wrap.classList.add('st-finger-tutorial--out');
    window.removeEventListener('tray:tutorial', onUserAction);
    setTimeout(() => wrap.remove(), 400);
  }

  function onUserAction() { dismiss(); }

  skipBtn.addEventListener('click', dismiss);
  window.addEventListener('tray:tutorial', onUserAction, { once: true });

  // Iniciar
  requestAnimationFrame(() => {
    wrap.classList.add('st-finger-tutorial--in');
    runCycle();
  });
}
