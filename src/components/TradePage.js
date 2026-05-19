import '../styles/trade.css';
import 'intl-tel-input/dist/css/intlTelInput.css';
import intlTelInput from 'intl-tel-input/dist/js/intlTelInputWithUtils.mjs';
import { collectionStore } from '../data/collectionStore.js';
import { tradeService } from '../data/tradeService.js';
import { countries } from '../data/countries.js';
import { router } from '../router.js';

const countryMap = {};
countries.forEach(c => { countryMap[c.id] = c; });

// ── Página principal de intercambio ─────────────────────────────────────────

export function TradePage() {
  const page = document.createElement('div');
  page.className = 'trade-overlay';

  function close() {
    page.classList.remove('trade-overlay--open');
    setTimeout(() => { page.remove(); router.navigate('/mexico'); }, 260);
  }

  const dupes = collectionStore.getDuplicates();
  if (dupes.length === 0) {
    page.appendChild(buildEmpty(close));
  } else {
    page.appendChild(buildMainUI(dupes, close));
  }

  document.body.appendChild(page);
  requestAnimationFrame(() => page.classList.add('trade-overlay--open'));
  return page;
}

// ── Estado vacío ─────────────────────────────────────────────────────────────

function buildEmpty(close) {
  const wrap = document.createElement('div');
  wrap.className = 'tr-empty';
  wrap.innerHTML = `
    <div class="tr-empty-ball">⚽</div>
    <div class="tr-empty-title">Sin repetidas</div>
    <div class="tr-empty-desc">Cuando tengas cromos repetidos podrás intercambiarlos aquí.</div>
    <button class="tr-back-btn">← Volver al álbum</button>
  `;
  wrap.querySelector('.tr-back-btn').addEventListener('click', close);
  return wrap;
}

// ── UI principal ─────────────────────────────────────────────────────────────

function buildMainUI(dupes, close) {
  const { byCountry } = collectionStore.getProgress(countries);
  const missingCountries = countries.filter(c => (byCountry[c.id]?.missing?.length || 0) > 0);

  // Multi-selection: arrays de {countryId, slotIndex, stickerUrl, name}
  let selectedOffers = [];
  let selectedWants  = [];

  // Total de cromos disponibles (expandido por count)
  const totalDupes = dupes.reduce((s, d) => s + d.count, 0);

  const wrap = document.createElement('div');
  wrap.className = 'tr-wrap';

  // ── Header ──────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'tr-header';
  header.innerHTML = `
    <button class="tr-header-back">←</button>
    <div class="tr-header-center">
      <div class="tr-header-title">🔄 Intercambiar cromos</div>
      <div class="tr-header-sub">FIFA WORLD CUP 2026™</div>
    </div>
    <div class="tr-header-spacer"></div>
  `;
  header.querySelector('.tr-header-back').addEventListener('click', close);
  wrap.appendChild(header);

  // ── Split ────────────────────────────────────────────────────────────────
  const split = document.createElement('div');
  split.className = 'tr-split';
  wrap.appendChild(split);

  // ═══ PANEL IZQUIERDO: mis repetidas ═════════════════════════════════════
  const leftPanel = document.createElement('div');
  leftPanel.className = 'tr-panel tr-panel--left';

  const leftLabel = document.createElement('div');
  leftLabel.className = 'tr-panel-label';
  leftLabel.innerHTML = `Ofrezco <span class="tr-panel-count">${totalDupes}</span>`;
  leftPanel.appendChild(leftLabel);

  const offerGrid = document.createElement('div');
  offerGrid.className = 'tr-offer-grid';

  // Cada copia duplicada aparece como tarjeta individual
  dupes.forEach(({ countryId, slotIndex, count }) => {
    const country = countryMap[countryId];
    const slot    = country?.slots.find(s => s.number === slotIndex);
    if (!slot?.stickerUrl) return;

    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'tr-offer-card';
      card.innerHTML = `
        <img class="tr-offer-card-img" src="${slot.stickerUrl}" alt="${slot.name}">
        <div class="tr-offer-card-check">✓</div>
      `;
      card.addEventListener('click', () => {
        if (card.classList.contains('tr-offer-card--selected')) {
          card.classList.remove('tr-offer-card--selected');
          const idx = selectedOffers.findIndex(o => o.countryId === countryId && o.slotIndex === slotIndex && o._card === card);
          if (idx >= 0) selectedOffers.splice(idx, 1);
        } else {
          card.classList.add('tr-offer-card--selected');
          selectedOffers.push({ countryId, slotIndex, stickerUrl: slot.stickerUrl, name: slot.name, _card: card });
        }
        updateSummary();
      });
      offerGrid.appendChild(card);
    }
  });

  enableHorizontalDragScroll(offerGrid);
  leftPanel.appendChild(offerGrid);
  split.appendChild(leftPanel);

  // ═══ PANEL DERECHO: buscar jugador ══════════════════════════════════════
  const rightPanel = document.createElement('div');
  rightPanel.className = 'tr-panel tr-panel--right';
  split.appendChild(rightPanel);

  const rightLabel = document.createElement('div');
  rightLabel.className = 'tr-panel-label';
  rightLabel.textContent = 'Quiero';
  rightPanel.appendChild(rightLabel);

  // Vista de países
  const countryView = document.createElement('div');
  countryView.className = 'tr-cv';

  const searchBar = document.createElement('div');
  searchBar.className = 'tr-search-bar';
  searchBar.innerHTML = `<input class="tr-search-input" type="text" placeholder="🔍 Buscar país…">`;
  countryView.appendChild(searchBar);

  const countryGrid = document.createElement('div');
  countryGrid.className = 'tr-country-grid';

  missingCountries.forEach(country => {
    const card = document.createElement('div');
    card.className = 'tr-country-card';
    card.dataset.name = country.name.toLowerCase();
    card.dataset.id = country.id;
    card.innerHTML = `
      <img class="tr-country-flag" src="https://flagcdn.com/w80/${country.federation.flag}.png" alt="${country.name}">
      <div class="tr-country-name">${country.name}</div>
      <div class="tr-country-code">${country.code}</div>
    `;
    card.addEventListener('click', () => showPlayers(country));
    countryGrid.appendChild(card);
  });

  enableHorizontalDragScroll(countryGrid);
  countryView.appendChild(countryGrid);
  rightPanel.appendChild(countryView);

  searchBar.querySelector('.tr-search-input').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    countryGrid.querySelectorAll('.tr-country-card').forEach(c => {
      c.style.display = !q || c.dataset.name.includes(q) ? '' : 'none';
    });
  });

  // Vista de jugadores (inicialmente oculta)
  const playerView = document.createElement('div');
  playerView.className = 'tr-pv';
  playerView.style.display = 'none';
  rightPanel.appendChild(playerView);

  function showCountryView() {
    countryView.style.display = '';
    playerView.style.display = 'none';
    playerView.innerHTML = '';
    rightLabel.textContent = 'Quiero';
    countryGrid.querySelectorAll('.tr-country-card--active').forEach(c => c.classList.remove('tr-country-card--active'));
  }

  function showPlayers(country) {
    countryGrid.querySelectorAll('.tr-country-card--active').forEach(c => c.classList.remove('tr-country-card--active'));
    const activeCard = countryGrid.querySelector(`.tr-country-card[data-id="${country.id}"]`);
    if (activeCard) activeCard.classList.add('tr-country-card--active');

    countryView.style.display = 'none';
    playerView.style.display = '';
    playerView.innerHTML = '';
    rightLabel.innerHTML = `
      <button class="tr-pv-back-btn">←</button>
      <img class="tr-pv-label-flag" src="https://flagcdn.com/w40/${country.federation.flag}.png" alt="">
      ${country.name}
    `;
    rightLabel.querySelector('.tr-pv-back-btn').addEventListener('click', showCountryView);

    const missing = byCountry[country.id]?.missing || [];
    const playerGrid = document.createElement('div');
    playerGrid.className = 'tr-player-grid';

    missing.forEach(slotIndex => {
      const slot = country.slots.find(s => s.number === slotIndex);
      if (!slot?.stickerUrl) return;

      const card = document.createElement('div');
      card.className = 'tr-player-card';
      // Restaurar selección si ya estaba elegido
      if (selectedWants.some(w => w.countryId === country.id && w.slotIndex === slotIndex)) {
        card.classList.add('tr-player-card--selected');
      }
      card.innerHTML = `
        <div class="tr-player-card-img-wrap">
          <img src="${slot.stickerUrl}" alt="${slot.name}">
          <div class="tr-player-card-check">✓</div>
        </div>
        <div class="tr-player-card-code">${country.code} ${slotIndex}</div>
      `;
      card.addEventListener('click', () => {
        if (card.classList.contains('tr-player-card--selected')) {
          card.classList.remove('tr-player-card--selected');
          const idx = selectedWants.findIndex(w => w.countryId === country.id && w.slotIndex === slotIndex);
          if (idx >= 0) selectedWants.splice(idx, 1);
        } else {
          card.classList.add('tr-player-card--selected');
          selectedWants.push({ countryId: country.id, slotIndex, stickerUrl: slot.stickerUrl, name: slot.name });
        }
        updateSummary();
      });
      playerGrid.appendChild(card);
    });

    enableHorizontalDragScroll(playerGrid);
    playerView.appendChild(playerGrid);
  }

  // ── Barra de resumen ──────────────────────────────────────────────────────
  const summaryBar = document.createElement('div');
  summaryBar.className = 'tr-summary-bar';
  wrap.appendChild(summaryBar);

  function makeSummarySlot(items, label) {
    const slot = document.createElement('div');
    slot.className = 'tr-summary-slot';
    if (items.length === 0) {
      slot.innerHTML = `
        <div class="tr-summary-empty">?</div>
        <div class="tr-summary-slot-label">${label}</div>
      `;
    } else if (items.length === 1) {
      slot.innerHTML = `
        <img class="tr-summary-img" src="${items[0].stickerUrl}" alt="">
        <div class="tr-summary-slot-label">${label}</div>
      `;
    } else {
      slot.innerHTML = `
        <div class="tr-summary-multi">
          <img class="tr-summary-img tr-summary-img--stack" src="${items[0].stickerUrl}" alt="">
          <div class="tr-summary-multi-badge">×${items.length}</div>
        </div>
        <div class="tr-summary-slot-label">${label}</div>
      `;
    }
    return slot;
  }

  function updateSummary() {
    summaryBar.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'tr-summary-inner';
    inner.appendChild(makeSummarySlot(selectedOffers, 'Ofrezco'));

    const swapIcon = document.createElement('div');
    swapIcon.className = 'tr-summary-swap';
    swapIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>`;
    inner.appendChild(swapIcon);
    inner.appendChild(makeSummarySlot(selectedWants, 'Quiero'));
    summaryBar.appendChild(inner);

    const btn = document.createElement('button');
    btn.className = 'tr-cta-btn';
    const ready = selectedOffers.length > 0 && selectedWants.length > 0;
    btn.disabled = !ready;
    btn.innerHTML = ready
      ? `<span class="tr-cta-icon">🔄</span> <span class="tr-cta-label">Solicitar intercambio (${selectedOffers.length}↔${selectedWants.length})</span>`
      : `<span class="tr-cta-icon">⚽</span> <span class="tr-cta-label">Selecciona los cromos</span>`;

    btn.addEventListener('click', () => {
      const nombre   = localStorage.getItem('trade_my_name')  || '';
      const telefono = localStorage.getItem('trade_my_phone') || '';
      if (!nombre || !telefono) {
        showRegistroModal((n, t) => doSubmit(btn, n, t));
      } else {
        doSubmit(btn, nombre, telefono);
      }
    });

    summaryBar.appendChild(btn);
  }

  updateSummary();

  async function doSubmit(btn, nombre, telefono) {
    btn.disabled = true;
    btn.innerHTML = `<span class="tr-cta-icon">⏳</span> <span class="tr-cta-label">Enviando…</span>`;

    const ofrece = selectedOffers.map(o => ({ countryId: o.countryId, slotIndex: o.slotIndex }));
    const busca  = selectedWants.map(w => ({ countryId: w.countryId,  slotIndex: w.slotIndex }));

    try {
      const res = await tradeService.submit({ nombre, telefono, ofrece, busca });
      if (res.error) throw new Error(res.error);

      localStorage.setItem('trade_my_name',  nombre);
      localStorage.setItem('trade_my_phone', telefono);
      localStorage.setItem('trade_my_id',    res.id);

      if (res.matched) {
        btn.innerHTML = `<span class="tr-cta-icon">🎉</span> <span class="tr-cta-label">¡Coincidencia! Revisa tu WhatsApp</span>`;
        setTimeout(() => router.navigate(`/trade/${res.id}`), 1800);
      } else {
        btn.innerHTML = `<span class="tr-cta-icon">✅</span> <span class="tr-cta-label">Solicitud enviada. Te avisamos</span>`;
      }
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `<span class="tr-cta-icon">❌</span> <span class="tr-cta-label">Error: ${err.message}</span>`;
      setTimeout(() => updateSummary(), 3000);
    }
  }

  return wrap;
}

// ── Países con código de marcado (para select nativo en móvil) ───────────────
const DIAL_COUNTRIES = [
  // Preferidos primero
  { iso2: 've', name: 'Venezuela',          dial: '58'  },
  { iso2: 'co', name: 'Colombia',           dial: '57'  },
  { iso2: 'mx', name: 'México',             dial: '52'  },
  { iso2: 'ar', name: 'Argentina',          dial: '54'  },
  { iso2: 'es', name: 'España',             dial: '34'  },
  { iso2: 'us', name: 'Estados Unidos',     dial: '1'   },
  { iso2: 'br', name: 'Brasil',             dial: '55'  },
  { iso2: 'pe', name: 'Perú',               dial: '51'  },
  { iso2: 'cl', name: 'Chile',              dial: '56'  },
  { iso2: 'ec', name: 'Ecuador',            dial: '593' },
  { iso2: 'bo', name: 'Bolivia',            dial: '591' },
  { iso2: 'py', name: 'Paraguay',           dial: '595' },
  { iso2: 'uy', name: 'Uruguay',            dial: '598' },
  { iso2: 'cr', name: 'Costa Rica',         dial: '506' },
  { iso2: 'pa', name: 'Panamá',             dial: '507' },
  { iso2: 'do', name: 'Rep. Dominicana',    dial: '1'   },
  { iso2: 'gt', name: 'Guatemala',          dial: '502' },
  { iso2: 'hn', name: 'Honduras',           dial: '504' },
  { iso2: 'ni', name: 'Nicaragua',          dial: '505' },
  { iso2: 'sv', name: 'El Salvador',        dial: '503' },
  { iso2: 'cu', name: 'Cuba',               dial: '53'  },
  { iso2: 'ht', name: 'Haití',              dial: '509' },
  { iso2: 'pr', name: 'Puerto Rico',        dial: '1'   },
  { iso2: 'pt', name: 'Portugal',           dial: '351' },
  { iso2: 'fr', name: 'Francia',            dial: '33'  },
  { iso2: 'de', name: 'Alemania',           dial: '49'  },
  { iso2: 'it', name: 'Italia',             dial: '39'  },
  { iso2: 'gb', name: 'Reino Unido',        dial: '44'  },
  { iso2: 'ca', name: 'Canadá',             dial: '1'   },
  { iso2: 'au', name: 'Australia',          dial: '61'  },
  { iso2: 'jp', name: 'Japón',              dial: '81'  },
  { iso2: 'cn', name: 'China',              dial: '86'  },
  { iso2: 'in', name: 'India',              dial: '91'  },
  { iso2: 'sa', name: 'Arabia Saudita',     dial: '966' },
  { iso2: 'ae', name: 'Emiratos Árabes',    dial: '971' },
  { iso2: 'tr', name: 'Turquía',            dial: '90'  },
  { iso2: 'ma', name: 'Marruecos',          dial: '212' },
  { iso2: 'eg', name: 'Egipto',             dial: '20'  },
  { iso2: 'ng', name: 'Nigeria',            dial: '234' },
  { iso2: 'za', name: 'Sudáfrica',          dial: '27'  },
  { iso2: 'gh', name: 'Ghana',              dial: '233' },
  { iso2: 'sn', name: 'Senegal',            dial: '221' },
  { iso2: 'ru', name: 'Rusia',              dial: '7'   },
  { iso2: 'nl', name: 'Países Bajos',       dial: '31'  },
  { iso2: 'be', name: 'Bélgica',            dial: '32'  },
  { iso2: 'se', name: 'Suecia',             dial: '46'  },
  { iso2: 'no', name: 'Noruega',            dial: '47'  },
  { iso2: 'ch', name: 'Suiza',              dial: '41'  },
  { iso2: 'at', name: 'Austria',            dial: '43'  },
  { iso2: 'pl', name: 'Polonia',            dial: '48'  },
  { iso2: 'ro', name: 'Rumanía',            dial: '40'  },
  { iso2: 'ua', name: 'Ucrania',            dial: '380' },
  { iso2: 'kr', name: 'Corea del Sur',      dial: '82'  },
  { iso2: 'mx', name: 'México',             dial: '52'  },
];

// ── Modal de registro (nombre + teléfono) ─────────────────────────────────────

function showRegistroModal(onDone) {
  const isMobile = window.innerWidth < 700;

  const overlay = document.createElement('div');
  overlay.className = 'tr-registro-overlay';

  const card = document.createElement('div');
  card.className = 'tr-registro-card';
  card.innerHTML = `
    <div class="tr-registro-icon">⚽</div>
    <div class="tr-registro-title">¿Cómo te llamamos?</div>
    <div class="tr-registro-sub">Para avisarte por WhatsApp cuando encontremos un intercambio</div>
    <input class="tr-registro-input" id="tr-reg-nombre" type="text" placeholder="Tu nombre" maxlength="50" autocomplete="name">
    <div class="tr-registro-phone-wrap">
      ${isMobile ? `
        <div class="tr-registro-phone-mobile">
          <select class="tr-registro-country-select" id="tr-reg-pais">
            ${[...new Map(DIAL_COUNTRIES.map(c => [c.iso2 + c.dial, c])).values()]
                .map(c => `<option value="${c.iso2}" data-dial="${c.dial}" ${c.iso2 === 've' ? 'selected' : ''}>+${c.dial} ${c.name}</option>`)
                .join('')}
          </select>
          <input class="tr-registro-input tr-registro-phone-num" id="tr-reg-telefono" type="tel" placeholder="Número" autocomplete="tel-national">
        </div>
      ` : `
        <input class="tr-registro-input tr-registro-phone" id="tr-reg-telefono" type="tel" placeholder="WhatsApp" autocomplete="tel">
      `}
    </div>
    <div class="tr-registro-phone-hint">${isMobile ? 'Sin el 0 inicial — ej: 4247647893' : 'Incluye el código de tu país'}</div>
    <button class="tr-registro-btn" disabled>Listo ✓</button>
    <button class="tr-registro-cancel">Cancelar</button>
  `;
  overlay.appendChild(card);

  const nombreInput = card.querySelector('#tr-reg-nombre');
  const btn         = card.querySelector('.tr-registro-btn');

  let getPhoneE164;

  if (isMobile) {
    // ── Móvil: select nativo + input de número ────────────────────────────
    const paisSelect  = card.querySelector('#tr-reg-pais');
    const numInput    = card.querySelector('#tr-reg-telefono');

    function validateMobile() {
      const nameOk = !!nombreInput.value.trim();
      const numOk  = numInput.value.replace(/\D/g, '').length >= 6;
      btn.disabled = !nameOk || !numOk;
    }

    const hint = card.querySelector('.tr-registro-phone-hint');
    const EJEMPLOS = {
      've': 'Ej: 4247647893',
      'co': 'Ej: 3001234567',
      'mx': 'Ej: 5512345678 (sin el 1)',
      'ar': 'Ej: 1112345678 (sin el 9)',
      'es': 'Ej: 612345678',
      'us': 'Ej: 2025550123',
      'br': 'Ej: 11912345678',
      'cl': 'Ej: 912345678',
      'pe': 'Ej: 912345678',
    };
    const updateHint = () => {
      const iso2 = paisSelect.value;
      hint.textContent = EJEMPLOS[iso2] || 'Sin el 0 inicial';
    };
    paisSelect.addEventListener('change', updateHint);
    updateHint();

    nombreInput.addEventListener('input', validateMobile);
    numInput.addEventListener('input', validateMobile);

    getPhoneE164 = () => {
      const opt  = paisSelect.options[paisSelect.selectedIndex];
      const dial = opt.dataset.dial;
      const iso2 = paisSelect.value;
      // Quitar no-dígitos y el 0 inicial (prefijo trunk local)
      let num = numInput.value.replace(/\D/g, '').replace(/^0+/, '');
      // Argentina: WhatsApp requiere 9 antes del código de área
      if (iso2 === 'ar' && !num.startsWith('9')) num = '9' + num;
      // México: WhatsApp requiere 1 antes del número de celular
      if (iso2 === 'mx' && !num.startsWith('1')) num = '1' + num;
      return `+${dial}${num}`;
    };

    [numInput].forEach(input => {
      input.addEventListener('focus', () => {
        setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
      });
    });

  } else {
    // ── Desktop: intl-tel-input completo ──────────────────────────────────
    const telefonoInput = card.querySelector('#tr-reg-telefono');

    const iti = intlTelInput(telefonoInput, {
      initialCountry:     've',
      countryOrder:       ['ve', 'co', 'mx', 'es', 'us', 'ar'],
      separateDialCode:   true,
      showFlags:          true,
      formatOnDisplay:    true,
      useFullscreenPopup: false,
      dropdownContainer:  document.body,
    });

    function validateDesktop() {
      btn.disabled = !nombreInput.value.trim() || !iti.isValidNumber();
    }

    nombreInput.addEventListener('input', validateDesktop);
    telefonoInput.addEventListener('input', validateDesktop);
    telefonoInput.addEventListener('countrychange', validateDesktop);

    getPhoneE164 = () => iti.getNumber();

    btn.addEventListener('click', () => {
      const n = nombreInput.value.trim();
      if (!n || !iti.isValidNumber()) return;
      overlay.classList.remove('tr-registro-active');
      setTimeout(() => { iti.destroy(); overlay.remove(); }, 260);
      onDone(n, getPhoneE164());
    });

    card.querySelector('.tr-registro-cancel').addEventListener('click', () => {
      overlay.classList.remove('tr-registro-active');
      setTimeout(() => { iti.destroy(); overlay.remove(); }, 260);
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('tr-registro-active')));
    return;
  }

  // Botón y cancelar para móvil
  btn.addEventListener('click', () => {
    const n = nombreInput.value.trim();
    if (!n) return;
    overlay.classList.remove('tr-registro-active');
    setTimeout(() => overlay.remove(), 260);
    onDone(n, getPhoneE164());
  });

  card.querySelector('.tr-registro-cancel').addEventListener('click', () => {
    overlay.classList.remove('tr-registro-active');
    setTimeout(() => overlay.remove(), 260);
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('tr-registro-active')));
}

// ── Drag-scroll horizontal táctil ─────────────────────────────────────────────
// Permite deslizar horizontalmente con el dedo en las tiras de móvil.
// Detecta si el gesto es horizontal y hace scroll; si es vertical lo ignora.
function enableHorizontalDragScroll(el) {
  let startX, startScrollLeft, startY, isDragging = false;

  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startScrollLeft = el.scrollLeft;
    isDragging = false;
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!isDragging) {
      // Solo activamos scroll horizontal si el gesto es más horizontal que vertical
      if (Math.abs(dx) < Math.abs(dy)) return;
      isDragging = true;
    }

    e.preventDefault();
    el.scrollLeft = startScrollLeft - dx;
  }, { passive: false });
}
