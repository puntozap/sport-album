import '../styles/trade-market.css';
import { countries } from '../data/countries.js';
import { getAllTradeSlots } from '../data/stickerLoader.js';
import { initStickerReveal } from './StickerReveal.js';
import { tradeService } from '../data/tradeService.js';
import { router } from '../router.js';
import { isEmpresaMode } from '../data/albumContext.js';

const stickerReveal = initStickerReveal();

const countryMap = {};
countries.forEach(c => { countryMap[c.id] = c; });

// ── Leaflet loader (lazy, CDN) ──────────────────────────────────────────────

let _leafletLoad = null;
function loadLeaflet() {
  if (_leafletLoad) return _leafletLoad;
  _leafletLoad = new Promise(res => {
    if (window.L) { res(window.L); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => res(window.L);
    script.onerror = () => res(null);
    document.head.appendChild(script);
  });
  return _leafletLoad;
}

// ── Entrada pública ──────────────────────────────────────────────────────────

export function TradeMarket() {
  const overlay = document.createElement('div');
  overlay.className = 'tm-overlay';

  function close() {
    overlay.classList.remove('tm-overlay--open');
    setTimeout(() => { overlay.remove(); router.navigate('/mexico'); }, 260);
  }

  overlay.appendChild(buildHeader(close));

  const body = document.createElement('div');
  body.className = 'tm-body';
  overlay.appendChild(body);

  showFeed(body, overlay);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('tm-overlay--open'));
}

// ── Header ───────────────────────────────────────────────────────────────────

function buildHeader(close) {
  const h = document.createElement('div');
  h.className = 'tm-header';
  h.innerHTML = `
    <button class="tm-header-back">←</button>
    <div class="tm-header-center">
      <div class="tm-header-title">🌍 Mercado de Cromos</div>
      <div class="tm-header-sub">${isEmpresaMode() ? 'LIBRITO DE FIGURITAS' : 'ÁLBUM DE FIGURITAS · Sin ánimo de lucro'}</div>
    </div>
    <div class="tm-header-spacer"></div>
  `;
  h.querySelector('.tm-header-back').addEventListener('click', close);
  return h;
}

// ── FEED ─────────────────────────────────────────────────────────────────────

function showFeed(body, overlay) {
  body.innerHTML = '';

  const hero = document.createElement('div');
  hero.className = 'tm-hero';
  hero.innerHTML = `
    <div class="tm-hero-title">⇄ INTERCAMBIA CROMOS</div>
    <div class="tm-hero-desc">Conecta con fans cerca de ti · Entregas físicas</div>
  `;
  body.appendChild(hero);

  const fab = document.createElement('button');
  fab.className = 'tm-fab';
  fab.innerHTML = '+ &nbsp;Publicar intercambio';
  fab.addEventListener('click', () => showWizard(body, overlay));
  body.appendChild(fab);

  const feed = document.createElement('div');
  feed.className = 'tm-feed';
  feed.innerHTML = `<div class="tm-loading">⚽ Cargando intercambios…</div>`;
  body.appendChild(feed);

  tradeService.marketList().then(res => {
    if (res.error) throw new Error(res.error);
    const trades = res.trades || [];
    feed.innerHTML = '';
    if (!trades.length) {
      feed.innerHTML = `
        <div class="tm-empty">
          <div class="tm-empty-icon">🎴</div>
          <div class="tm-empty-title">No hay intercambios activos</div>
          <div class="tm-empty-sub">¡Sé el primero en publicar uno!</div>
        </div>`;
      return;
    }
    const myName = localStorage.getItem('trade_my_name') || '';
    trades.forEach(t => feed.appendChild(buildCard(t, myName)));
  }).catch(() => {
    feed.innerHTML = `
      <div class="tm-empty">
        <div class="tm-empty-icon">📡</div>
        <div class="tm-empty-title">Sin conexión</div>
        <div class="tm-empty-sub">Revisa tu internet</div>
        <button class="tm-retry-btn">🔄 Reintentar</button>
      </div>`;
    feed.querySelector('.tm-retry-btn')?.addEventListener('click', () => showFeed(body, overlay));
  });
}

function buildCard(trade, myName) {
  const isMe = myName && trade.nombre?.trim() === myName.trim();
  const card = document.createElement('div');
  card.className = `tm-card${isMe ? ' tm-card--mine' : ''}`;

  function groupByCountry(items) {
    const groups = {};
    (items || []).forEach(s => {
      if (!groups[s.countryId]) groups[s.countryId] = [];
      groups[s.countryId].push(s);
    });
    return groups;
  }

  function buildFlagChips(groups) {
    const section = document.createElement('div');
    section.className = 'tm-flag-section';

    const chipsRow = document.createElement('div');
    chipsRow.className = 'tm-flag-chips-row';

    const stickersArea = document.createElement('div');
    stickersArea.className = 'tm-chip-stickers';
    stickersArea.hidden = true;

    let activeId = null;

    Object.entries(groups).forEach(([countryId, stickers]) => {
      const c = countryMap[countryId];
      if (!c) return;

      const chip = document.createElement('div');
      chip.className = 'tm-flag-chip';
      chip.innerHTML = `
        <img src="https://flagcdn.com/w40/${c.federation?.flag || 'un'}.png" alt="${c.name}">
        <span class="tm-chip-code">${c.code}</span>
        <span class="tm-chip-count">×${stickers.length}</span>
        <span class="tm-chip-arr">▾</span>
      `;

      chip.addEventListener('click', () => {
        if (activeId === countryId) {
          stickersArea.hidden = true;
          stickersArea.innerHTML = '';
          chip.classList.remove('tm-flag-chip--open');
          activeId = null;
          return;
        }
        chipsRow.querySelectorAll('.tm-flag-chip--open').forEach(el => el.classList.remove('tm-flag-chip--open'));
        chip.classList.add('tm-flag-chip--open');
        stickersArea.hidden = false;
        stickersArea.innerHTML = '';
        stickers.forEach(s => {
          const slot = c.slots.find(sl => sl.number === s.slotIndex);
          if (!slot?.stickerUrl) return;
          const item = document.createElement('div');
          item.className = 'tm-chip-sticker-item';
          item.style.cursor = 'pointer';
          item.innerHTML = `<img src="${slot.stickerUrl}" alt=""><div class="tm-chip-sticker-code">${c.code} ${s.slotIndex}</div>`;
          item.addEventListener('click', () => {
            stickerReveal.show({
              stickerUrl:  slot.stickerUrl,
              countryName: c.name,
              countryCode: c.code,
              flag:        c.federation?.flag || null,
              playerName:  slot.name || '',
              slotNumber:  s.slotIndex,
              isGold:      s.slotIndex === 0
            });
          });
          stickersArea.appendChild(item);
        });
        activeId = countryId;
      });

      chipsRow.appendChild(chip);
    });

    section.appendChild(chipsRow);
    section.appendChild(stickersArea);
    return section;
  }

  const waNum = (trade.telefono || '').replace(/\D/g, '');
  const waMsg = encodeURIComponent(`Hola ${trade.nombre}, vi tu intercambio en el álbum del Mundial 2026 ⚽`);
  const locHtml = trade.ciudad ? `<div class="tm-card-loc">📍 ${trade.ciudad}</div>` : '';

  card.innerHTML = `
    <div class="tm-card-head">
      <div class="tm-card-avatar">${(trade.nombre || '?')[0].toUpperCase()}</div>
      <div class="tm-card-info">
        <div class="tm-card-name">${trade.nombre || '—'} ${isMe ? '<span class="tm-badge-you">Tú</span>' : ''}</div>
        ${locHtml}
      </div>
    </div>
    <div class="tm-card-trade">
      <div class="tm-card-col">
        <div class="tm-card-col-label">🎴 OFREZCO</div>
        <div class="js-ofrece"></div>
      </div>
      <div class="tm-card-swap">⇄</div>
      <div class="tm-card-col">
        <div class="tm-card-col-label">🔍 BUSCO</div>
        <div class="js-busca"></div>
      </div>
    </div>
    ${!isMe && waNum ? `
      <a class="tm-card-wa" href="https://wa.me/${waNum}?text=${waMsg}" target="_blank" rel="noopener">
        💬 Contactar por WhatsApp
      </a>` : ''}
  `;

  card.querySelector('.js-ofrece').appendChild(buildFlagChips(groupByCountry(trade.ofrece)));
  card.querySelector('.js-busca').appendChild(buildFlagChips(groupByCountry(trade.busca)));

  return card;
}

// ── WIZARD ────────────────────────────────────────────────────────────────────

function showWizard(body, overlay) {
  body.innerHTML = '';
  const wizard = document.createElement('div');
  wizard.className = 'tm-wizard';
  body.appendChild(wizard);

  const state = {
    ofrece: [], ofrecePais: null,
    busca:  [], buscaPais:  null,
    nombre:   localStorage.getItem('trade_my_name')   || '',
    telefono: localStorage.getItem('trade_my_phone')  || '',
    ciudad:   localStorage.getItem('trade_my_ciudad') || '',
    lat: null, lng: null, _marker: null
  };

  function go(n) {
    wizard.innerHTML = '';
    // onContinue: salta directo al siguiente bloque cuando ya hay cromos elegidos
    if (n === 1) renderPickPais(wizard,    state, 'ofrece', () => go(2), () => showFeed(body, overlay), () => go(3));
    if (n === 2) renderPickPlayers(wizard, state, 'ofrece', () => go(3), () => go(1));
    if (n === 3) renderPickPais(wizard,    state, 'busca',  () => go(4), () => go(2),                   () => go(5));
    if (n === 4) renderPickPlayers(wizard, state, 'busca',  () => go(5), () => go(3));
    if (n === 5) renderConfirm(wizard,     state, () => showSuccess(body, overlay), () => go(4));
  }

  go(1);
}

// ── Step bar ──────────────────────────────────────────────────────────────────

function mkStepBar(current) {
  const phases = [
    { label: 'OFREZCO',   steps: [1, 2] },
    { label: 'RECIBO',    steps: [3, 4] },
    { label: 'CONFIRMAR', steps: [5]    }
  ];
  const bar = document.createElement('div');
  bar.className = 'tm-stepbar';

  phases.forEach((ph, i) => {
    const active = ph.steps.includes(current);
    const done   = ph.steps[ph.steps.length - 1] < current;

    if (i > 0) {
      const line = document.createElement('div');
      line.className = `tm-stepbar-line${done ? ' done' : ''}`;
      bar.appendChild(line);
    }

    const item = document.createElement('div');
    item.className = 'tm-stepbar-item';

    const dot = document.createElement('div');
    dot.className = `tm-stepbar-dot${active ? ' active' : ''}${done ? ' done' : ''}`;
    dot.textContent = done ? '✓' : String(i + 1);

    const lbl = document.createElement('div');
    lbl.className = `tm-stepbar-label${active || done ? ' active' : ''}`;
    lbl.textContent = ph.label;

    item.appendChild(dot);
    item.appendChild(lbl);
    bar.appendChild(item);
  });

  return bar;
}

// ── Steps 1 & 3: elegir país ──────────────────────────────────────────────────

function renderPickPais(container, state, field, onCountryPicked, onBack, onContinue) {
  const isOffer   = field === 'ofrece';
  const existing  = state[field];          // cromos ya elegidos
  const hasItems  = existing.length > 0;
  container.appendChild(mkStepBar(isOffer ? 1 : 3));

  // Mini-tray de selección previa (visible solo si ya hay cromos)
  if (hasItems) {
    const prevTray = document.createElement('div');
    prevTray.className = 'tm-prev-tray';
    prevTray.innerHTML = `
      <span class="tm-prev-tray-label">Ya tienes ${existing.length} cromo${existing.length !== 1 ? 's' : ''} ·</span>
      ${existing.slice(0, 6).map(s => `<img class="tm-prev-chip" src="${s.stickerUrl}" alt="">`).join('')}
      ${existing.length > 6 ? `<span class="tm-prev-more">+${existing.length - 6}</span>` : ''}
    `;
    container.appendChild(prevTray);
  }

  const hero = document.createElement('div');
  hero.className = 'tm-wiz-hero';
  hero.innerHTML = `
    <div class="tm-wiz-title">${hasItems ? '＋ Añadir de otro país' : (isOffer ? '¿Qué OFRECES?' : '¿Qué NECESITAS?')}</div>
    <div class="tm-wiz-sub">${isOffer ? 'Selecciona el país del cromo que tienes de más' : 'Selecciona el país del cromo que estás buscando'}</div>
  `;
  container.appendChild(hero);

  const searchEl = document.createElement('input');
  searchEl.className = 'tm-search';
  searchEl.type = 'text';
  searchEl.placeholder = '🔍 Buscar país…';
  container.appendChild(searchEl);

  const grid = document.createElement('div');
  grid.className = 'tm-country-grid';

  countries.forEach(c => {
    const hasFromThisCountry = existing.some(s => s.countryId === c.id);
    const card = document.createElement('div');
    card.className = `tm-country-card${hasFromThisCountry ? ' tm-country-card--has' : ''}`;
    card.dataset.name = c.name.toLowerCase();
    card.innerHTML = `
      <img class="tm-country-flag" src="https://flagcdn.com/w80/${c.federation?.flag || 'un'}.png" alt="${c.name}">
      <div class="tm-country-name">${c.name}</div>
      <div class="tm-country-code">${c.code}</div>
      ${hasFromThisCountry ? '<div class="tm-country-added">✓</div>' : ''}
    `;
    card.addEventListener('click', () => { state[`${field}Pais`] = c; onCountryPicked(); });
    grid.appendChild(card);
  });
  container.appendChild(grid);

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase();
    grid.querySelectorAll('.tm-country-card').forEach(el => {
      el.style.display = !q || el.dataset.name.includes(q) ? '' : 'none';
    });
  });

  const row = document.createElement('div');
  row.className = 'tm-btn-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'tm-btn tm-btn--ghost';
  cancelBtn.textContent = isOffer ? '✕ Cancelar' : '← Anterior';
  cancelBtn.addEventListener('click', onBack);
  row.appendChild(cancelBtn);

  // Botón "Listo" solo si ya hay cromos elegidos
  if (hasItems && onContinue) {
    const continueBtn = document.createElement('button');
    continueBtn.className = 'tm-btn tm-btn--primary';
    continueBtn.textContent = `Listo con ${existing.length} ✓`;
    continueBtn.addEventListener('click', onContinue);
    row.appendChild(continueBtn);
  }

  container.appendChild(row);
}

// ── Steps 2 & 4: elegir jugadores ─────────────────────────────────────────────

function renderPickPlayers(container, state, field, onNext, onBack) {
  const isOffer = field === 'ofrece';
  const country = state[`${field}Pais`];
  container.appendChild(mkStepBar(isOffer ? 2 : 4));

  const hero = document.createElement('div');
  hero.className = 'tm-wiz-hero tm-wiz-hero--flag';
  hero.innerHTML = `
    <img class="tm-wiz-flag" src="https://flagcdn.com/w40/${country.federation?.flag || 'un'}.png" alt="">
    <div>
      <div class="tm-wiz-title">${country.name}</div>
      <div class="tm-wiz-sub">${isOffer ? 'Elige uno o más cromos que ofreces' : 'Elige uno o más cromos que necesitas'}</div>
    </div>
  `;
  container.appendChild(hero);

  const tray = document.createElement('div');
  tray.className = 'tm-sel-tray';
  container.appendChild(tray);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'tm-btn tm-btn--primary';
  nextBtn.textContent = 'Siguiente →';
  nextBtn.disabled = state[field].length === 0;
  nextBtn.addEventListener('click', onNext);

  const grid = document.createElement('div');
  grid.className = 'tm-player-grid';

  function refreshTray() {
    tray.innerHTML = '';
    if (!state[field].length) {
      tray.innerHTML = `<span class="tm-sel-empty">Selecciona al menos un cromo</span>`;
      nextBtn.disabled = true;
      return;
    }
    state[field].forEach((item, idx) => {
      const chip = document.createElement('div');
      chip.className = 'tm-sel-chip';
      chip.innerHTML = `<img src="${item.stickerUrl}" alt=""><button class="tm-sel-remove">✕</button>`;
      chip.querySelector('.tm-sel-remove').addEventListener('click', () => {
        state[field].splice(idx, 1);
        const el = grid.querySelector(`.tm-player-card[data-key="${item.countryId}:${item.slotIndex}"]`);
        if (el) el.classList.remove('tm-player-card--sel');
        refreshTray();
      });
      tray.appendChild(chip);
    });
    nextBtn.disabled = false;
  }

  const tradeSlots = getAllTradeSlots(country.id, country.code);
  tradeSlots.forEach(slot => {
    if (!slot.stickerUrl) return;
    const key   = `${country.id}:${slot.number}`;
    const isSel = state[field].some(s => s.countryId === country.id && s.slotIndex === slot.number);
    const card  = document.createElement('div');
    card.className = `tm-player-card${isSel ? ' tm-player-card--sel' : ''}`;
    card.dataset.key = key;
    card.innerHTML = `
      <div class="tm-player-img-wrap">
        <img src="${slot.stickerUrl}" alt="${slot.name || ''}">
        <div class="tm-player-check">✓</div>
      </div>
      <div class="tm-player-code">${country.code} ${slot.number}</div>
    `;
    card.addEventListener('click', () => {
      const idx = state[field].findIndex(s => s.countryId === country.id && s.slotIndex === slot.number);
      if (idx >= 0) {
        state[field].splice(idx, 1);
        card.classList.remove('tm-player-card--sel');
      } else {
        state[field].push({ countryId: country.id, slotIndex: slot.number, stickerUrl: slot.stickerUrl, name: slot.name || '' });
        card.classList.add('tm-player-card--sel');
      }
      refreshTray();
    });
    grid.appendChild(card);
  });
  container.appendChild(grid);

  const btnRow = document.createElement('div');
  btnRow.className = 'tm-btn-row';

  const addMoreBtn = document.createElement('button');
  addMoreBtn.className = 'tm-btn tm-btn--ghost';
  addMoreBtn.textContent = '＋ Otro país';
  addMoreBtn.addEventListener('click', onBack);

  btnRow.appendChild(addMoreBtn);
  btnRow.appendChild(nextBtn);
  container.appendChild(btnRow);

  refreshTray();
}

// ── Step 5: Confirmar ─────────────────────────────────────────────────────────

function renderConfirm(container, state, onDone, onBack) {
  container.appendChild(mkStepBar(5));

  function thumbsHtml(items) {
    return items.slice(0, 5).map(s => {
      const c    = countryMap[s.countryId];
      const slot = c?.slots.find(sl => sl.number === s.slotIndex);
      return slot?.stickerUrl ? `<img class="tm-confirm-thumb" src="${slot.stickerUrl}" alt="">` : '';
    }).join('');
  }

  const summary = document.createElement('div');
  summary.className = 'tm-confirm-summary';
  summary.innerHTML = `
    <div class="tm-confirm-col">
      <div class="tm-confirm-col-label">🎴 OFREZCO (${state.ofrece.length})</div>
      <div class="tm-confirm-thumbs">${thumbsHtml(state.ofrece)}</div>
    </div>
    <div class="tm-confirm-arrow">⇄</div>
    <div class="tm-confirm-col">
      <div class="tm-confirm-col-label">🔍 BUSCO (${state.busca.length})</div>
      <div class="tm-confirm-thumbs">${thumbsHtml(state.busca)}</div>
    </div>
  `;
  container.appendChild(summary);

  const form = document.createElement('div');
  form.className = 'tm-confirm-form';
  form.innerHTML = `
    <div class="tm-field">
      <label class="tm-field-label">👤 Tu nombre</label>
      <input class="tm-field-input" id="tm-c-name" type="text" placeholder="Nombre o alias" autocomplete="name" value="${state.nombre.replace(/"/g, '&quot;')}">
    </div>
    <div class="tm-field">
      <label class="tm-field-label">💬 WhatsApp</label>
      <input class="tm-field-input" id="tm-c-phone" type="tel" placeholder="+58 412 000 0000" value="${state.telefono.replace(/"/g, '&quot;')}">
    </div>
  `;
  container.appendChild(form);

  const mapSection = document.createElement('div');
  mapSection.className = 'tm-map-section';
  mapSection.innerHTML = `
    <div class="tm-field-label">📍 Tu ubicación <span class="tm-map-req">(obligatorio · entrega física)</span></div>
    <div class="tm-map-el" id="tm-map-el"></div>
    <div class="tm-map-hint" id="tm-map-hint">Cargando mapa…</div>
    <input class="tm-field-input" id="tm-c-ciudad" type="text" placeholder="Tu ciudad (ej: Caracas, Venezuela)" value="${state.ciudad.replace(/"/g, '&quot;')}">
  `;
  container.appendChild(mapSection);

  const statusEl = document.createElement('div');
  statusEl.className = 'tm-confirm-status';
  container.appendChild(statusEl);

  const btnRow = document.createElement('div');
  btnRow.className = 'tm-btn-row';

  const backBtn = document.createElement('button');
  backBtn.className = 'tm-btn tm-btn--ghost';
  backBtn.textContent = '← Anterior';
  backBtn.addEventListener('click', onBack);

  const submitBtn = document.createElement('button');
  submitBtn.className = 'tm-btn tm-btn--primary';
  submitBtn.innerHTML = '🌟 Publicar intercambio';

  btnRow.appendChild(backBtn);
  btnRow.appendChild(submitBtn);
  container.appendChild(btnRow);

  initMap(container, state);
  setupCityAutocomplete(container, state);

  submitBtn.addEventListener('click', async () => {
    const nombre   = container.querySelector('#tm-c-name').value.trim();
    const telefono = container.querySelector('#tm-c-phone').value.trim();
    const ciudad   = container.querySelector('#tm-c-ciudad').value.trim();

    if (!nombre || !telefono) {
      statusEl.textContent = '⚠️ Completa tu nombre y WhatsApp.';
      return;
    }
    if (!ciudad && !state.lat) {
      statusEl.textContent = '⚠️ Indica tu ciudad o activa la ubicación en el mapa.';
      return;
    }

    localStorage.setItem('trade_my_name',   nombre);
    localStorage.setItem('trade_my_phone',  telefono);
    if (ciudad) localStorage.setItem('trade_my_ciudad', ciudad);

    submitBtn.disabled  = true;
    submitBtn.textContent = 'Publicando…';
    statusEl.textContent  = '';

    try {
      const res = await tradeService.marketSubmit({
        nombre, telefono,
        ofrece:    state.ofrece.map(s => ({ countryId: s.countryId, slotIndex: s.slotIndex })),
        busca:     state.busca.map(s => ({ countryId: s.countryId, slotIndex: s.slotIndex })),
        ubicacion: { lat: state.lat, lng: state.lng, ciudad: ciudad || state.ciudad }
      });
      if (res.error) throw new Error(res.error);
      onDone();
    } catch {
      statusEl.textContent  = '⚠️ Error al publicar. Intenta de nuevo.';
      submitBtn.disabled    = false;
      submitBtn.innerHTML   = '🌟 Publicar intercambio';
    }
  });
}

async function initMap(container, state) {
  const mapEl = container.querySelector('#tm-map-el');
  const hint  = container.querySelector('#tm-map-hint');

  const L = await loadLeaflet();
  if (!L) {
    mapEl.style.display = 'none';
    hint.textContent = '🗺️ Mapa no disponible · Escribe tu ciudad abajo.';
    return;
  }

  const map = L.map(mapEl, { zoomControl: true });
  state._map = map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  function addClickListener() {
    map.on('click', e => {
      if (state._marker) state._marker.setLatLng(e.latlng);
      else state._marker = L.marker(e.latlng, { draggable: true }).addTo(map);
      state._marker.on('dragend', () => {
        const p = state._marker.getLatLng();
        state.lat = p.lat;
        state.lng = p.lng;
      });
      state.lat = e.latlng.lat;
      state.lng = e.latlng.lng;
    });
  }

  if (!navigator.geolocation) {
    map.setView([4.6097, -74.0817], 4);
    hint.textContent = '🗺️ Haz clic en el mapa para marcar tu zona.';
    addClickListener();
    return;
  }

  hint.textContent = '📍 Obteniendo tu ubicación…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      state.lat = lat;
      state.lng = lng;
      map.setView([lat, lng], 13);
      state._marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      state._marker.on('dragend', () => {
        const p = state._marker.getLatLng();
        state.lat = p.lat;
        state.lng = p.lng;
      });
      hint.textContent = '✅ Arrastra el marcador para ajustar tu posición';
    },
    () => {
      map.setView([4.6097, -74.0817], 4);
      hint.textContent = '⚠️ Permiso denegado · Haz clic en el mapa para marcar tu zona o escribe tu ciudad.';
      addClickListener();
    }
  );
}

// ── Autocompletado de ciudad (Nominatim) ──────────────────────────────────────

function setupCityAutocomplete(container, state) {
  const input = container.querySelector('#tm-c-ciudad');
  if (!input) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'tm-autocomplete';
  dropdown.hidden = true;
  input.parentNode.appendChild(dropdown);

  let timer = null;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { dropdown.innerHTML = ''; dropdown.hidden = true; return; }
    timer = setTimeout(() => fetchGeo(q, dropdown, input, state), 380);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dropdown.hidden = true; }
  });

  document.addEventListener('click', e => {
    if (!container.contains(e.target)) dropdown.hidden = true;
  }, { passive: true });
}

async function fetchGeo(q, dropdown, input, state) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'es,en' } });
    const data = await res.json();

    dropdown.innerHTML = '';
    if (!data.length) { dropdown.hidden = true; return; }

    dropdown.hidden = false;
    data.forEach(item => {
      const opt = document.createElement('div');
      opt.className = 'tm-autocomplete-item';
      // Nombre corto: ciudad + estado/país
      const addr = item.address || {};
      const short = [addr.city || addr.town || addr.village || addr.municipality, addr.state, addr.country]
        .filter(Boolean).join(', ');
      opt.innerHTML = `<span class="tm-ac-main">${short || item.display_name.split(',')[0]}</span><span class="tm-ac-sub">${item.display_name}</span>`;
      opt.addEventListener('mousedown', e => {
        e.preventDefault(); // evita que el input pierda foco antes del click
        input.value = short || item.display_name.split(',')[0];
        state.lat = parseFloat(item.lat);
        state.lng = parseFloat(item.lon);
        dropdown.hidden = true;
        moveMapTo(state, state.lat, state.lng);
      });
      dropdown.appendChild(opt);
    });
  } catch {
    dropdown.hidden = true;
  }
}

function moveMapTo(state, lat, lng) {
  const L = window.L;
  if (!L || !state._map) return;
  state._map.setView([lat, lng], 13);
  if (state._marker) {
    state._marker.setLatLng([lat, lng]);
  } else {
    state._marker = L.marker([lat, lng], { draggable: true }).addTo(state._map);
    state._marker.on('dragend', () => {
      const p = state._marker.getLatLng();
      state.lat = p.lat;
      state.lng = p.lng;
    });
  }
}

// ── Pantalla de éxito ─────────────────────────────────────────────────────────

function showSuccess(body, overlay) {
  body.innerHTML = '';
  const s = document.createElement('div');
  s.className = 'tm-success';
  s.innerHTML = `
    <div class="tm-success-ball">⚽</div>
    <div class="tm-success-title">¡Perfecto!</div>
    <div class="tm-success-msg">Ya estamos buscando tus cromos con alguien más cerca de ti.</div>
    <div class="tm-success-sub">Te avisaremos por WhatsApp cuando encontremos un match 🎉</div>
    <button class="tm-success-btn">Ver intercambios →</button>
  `;
  s.querySelector('.tm-success-btn').addEventListener('click', () => showFeed(body, overlay));
  body.appendChild(s);
}
