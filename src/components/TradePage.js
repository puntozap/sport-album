import '../styles/trade.css';
import { collectionStore } from '../data/collectionStore.js';
import { tradeService } from '../data/tradeService.js';
import { countries } from '../data/countries.js';
import { router } from '../router.js';
import { isEmpresaMode } from '../data/albumContext.js';

const WA_COMMUNITY = 'https://chat.whatsapp.com/KfBNnndf5JM4VIJtXwNn3k';

function communityBanner() {
  const el = document.createElement('a');
  el.className = 'tr-community-banner';
  el.href = WA_COMMUNITY;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  el.innerHTML = `
    <div class="tr-community-icon">👥</div>
    <div class="tr-community-text">
      <strong>Comunidad de intercambios</strong>
      <span>Únete al grupo de WhatsApp y encuentra personas para cambiar tus cromos repetidos</span>
    </div>
    <div class="tr-community-arrow">→</div>
  `;
  return el;
}

const countryMap = {};
countries.forEach(c => { countryMap[c.id] = c; });

// ── Rastreo de cromos "en vuelo" (en un intercambio activo) ──────────────────
const IN_FLIGHT_KEY = 'trade_in_flight';

function getInFlight() {
  try { return JSON.parse(localStorage.getItem(IN_FLIGHT_KEY) || '{}'); } catch { return {}; }
}

function stickerKey(countryId, slotIndex) {
  return `${countryId}:${slotIndex}`;
}

export function lockStickersInFlight(stickers, tradeId) {
  const map = getInFlight();
  stickers.forEach(s => { map[stickerKey(s.countryId, s.slotIndex)] = tradeId; });
  localStorage.setItem(IN_FLIGHT_KEY, JSON.stringify(map));
}

export function releaseStickersInFlight(tradeId) {
  const map = getInFlight();
  for (const k in map) if (map[k] === tradeId) delete map[k];
  localStorage.setItem(IN_FLIGHT_KEY, JSON.stringify(map));
}

function isLocked(countryId, slotIndex) {
  return !!getInFlight()[stickerKey(countryId, slotIndex)];
}

// ── Entrada principal ────────────────────────────────────────────────────────

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
    page.appendChild(buildWizard(dupes, close));
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
  wrap.insertBefore(communityBanner(), wrap.querySelector('.tr-back-btn'));
  wrap.querySelector('.tr-back-btn').addEventListener('click', close);
  return wrap;
}

// ── Wizard ───────────────────────────────────────────────────────────────────

function buildWizard(dupes, close) {
  const { byCountry } = collectionStore.getProgress(countries);
  const missingCountries = countries.filter(c => (byCountry[c.id]?.missing?.length || 0) > 0);

  let step            = 1;
  let selectedOffers  = []; // {countryId, slotIndex, stickerUrl, name}
  let selectedWants   = []; // {countryId, slotIndex, stickerUrl, name}
  let browseCountry   = null;

  const wrap = document.createElement('div');
  wrap.className = 'tr-wrap';

  // ── Community banner ────────────────────────────────────────────────────
  wrap.appendChild(communityBanner());

  // ── Header ─────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'tr-header';
  header.innerHTML = `
    <button class="tr-header-back">←</button>
    <div class="tr-header-center">
      <div class="tr-header-title">🔄 Intercambiar cromos</div>
    </div>
    <div class="tr-header-spacer"></div>
  `;
  header.querySelector('.tr-header-back').addEventListener('click', () => {
    if (step === 1) { close(); return; }
    if (step === 2 && browseCountry) { browseCountry = null; renderStep(); return; }
    step--;
    renderStep();
  });
  wrap.appendChild(header);

  // ── Stepper ─────────────────────────────────────────────────────────────
  const stepper = document.createElement('div');
  stepper.className = 'tr-stepper';
  wrap.appendChild(stepper);

  function updateStepper() {
    stepper.innerHTML = ['Ofrezco', 'Quiero', 'Contacto'].map((label, i) => {
      const n   = i + 1;
      const cls = n < step ? 'done' : n === step ? 'active' : 'pending';
      return `
        <div class="tr-step tr-step--${cls}">
          <div class="tr-step-dot">${n < step ? '✓' : n}</div>
          <div class="tr-step-label">${label}</div>
        </div>
        ${i < 2 ? `<div class="tr-step-line tr-step-line--${n < step ? 'done' : 'pending'}"></div>` : ''}
      `;
    }).join('');
  }

  // ── Área de contenido ────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'tr-content';
  wrap.appendChild(content);

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.className = 'tr-footer';
  wrap.appendChild(footer);

  function setFooterBtn({ text, disabled, onClick }) {
    footer.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'tr-cta-btn';
    btn.disabled  = disabled;
    btn.innerHTML = text;
    btn.addEventListener('click', onClick);
    footer.appendChild(btn);
    return btn;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PASO 1 — Mis cromos para ofrecer
  // ════════════════════════════════════════════════════════════════════════

  function renderStep1() {
    content.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'tr-step-heading';
    label.innerHTML = `<strong>Selecciona los cromos que quieres dar</strong><br><span class="tr-step-hint">Toca los que tienes repetidos</span>`;
    content.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'tr-offer-grid';

    dupes.forEach(({ countryId, slotIndex, count }) => {
      const country = countryMap[countryId];
      const slot    = country?.slots.find(s => s.number === slotIndex);
      if (!slot?.stickerUrl) return;

      const locked = isLocked(countryId, slotIndex);

      for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'tr-offer-card' + (locked ? ' tr-offer-card--locked' : '');

        const alreadySel = selectedOffers.some(o => o.countryId === countryId && o.slotIndex === slotIndex && !o._used);
        if (alreadySel && !locked) card.classList.add('tr-offer-card--selected');

        card.innerHTML = `
          <img class="tr-offer-card-img" src="${slot.stickerUrl}" alt="${slot.name}">
          <div class="tr-offer-card-code">${country.code} ${slotIndex}</div>
          ${locked
            ? `<div class="tr-offer-card-lock">🔒<span>En intercambio</span></div>`
            : `<div class="tr-offer-card-check">✓</div>`}
        `;

        if (!locked) {
          card.addEventListener('click', () => {
            if (card.classList.contains('tr-offer-card--selected')) {
              card.classList.remove('tr-offer-card--selected');
              const idx = selectedOffers.findIndex(o => o.countryId === countryId && o.slotIndex === slotIndex && o._card === card);
              if (idx >= 0) selectedOffers.splice(idx, 1);
            } else {
              card.classList.add('tr-offer-card--selected');
              selectedOffers.push({ countryId, slotIndex, stickerUrl: slot.stickerUrl, name: slot.name, _card: card });
            }
            refreshStep1Footer();
          });
        }

        grid.appendChild(card);
      }
    });

    enableHorizontalDragScroll(grid);
    content.appendChild(grid);

    // Selección visible en tira
    const selBar = document.createElement('div');
    selBar.className = 'tr-sel-bar';
    content.appendChild(selBar);

    function refreshStep1Footer() {
      const n = selectedOffers.length;
      selBar.innerHTML = n === 0
        ? `<span class="tr-sel-hint">Selecciona al menos 1 cromo</span>`
        : selectedOffers.map(o => `<img class="tr-sel-thumb" src="${o.stickerUrl}" title="${o.name}">`).join('');
      setFooterBtn({
        text: n === 0
          ? `<span class="tr-cta-icon">⚽</span> Selecciona cromos para ofrecer`
          : `Siguiente → (${n} cromo${n > 1 ? 's' : ''})`,
        disabled: n === 0,
        onClick: () => { step = 2; renderStep(); },
      });
    }

    refreshStep1Footer();
  }

  // ════════════════════════════════════════════════════════════════════════
  // PASO 2 — ¿Qué quiero a cambio?
  // ════════════════════════════════════════════════════════════════════════

  function renderStep2() {
    content.innerHTML = '';

    // Barra de "lo que ya quiero"
    const wantsBar = document.createElement('div');
    wantsBar.className = 'tr-wants-bar';
    content.appendChild(wantsBar);

    function refreshWantsBar() {
      if (selectedWants.length === 0) {
        wantsBar.innerHTML = `<span class="tr-sel-hint">Aquí aparecerán los cromos que pidas</span>`;
      } else {
        wantsBar.innerHTML = selectedWants.map((w, idx) => `
          <div class="tr-wants-chip" data-idx="${idx}">
            <img src="${w.stickerUrl}" alt="${w.name}">
            <button class="tr-wants-remove" data-idx="${idx}">×</button>
          </div>
        `).join('');
        wantsBar.querySelectorAll('.tr-wants-remove').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            selectedWants.splice(Number(btn.dataset.idx), 1);
            refreshWantsBar();
            refreshStep2Footer();
            // Si estamos en vista de jugadores, refrescar checkmarks
            if (browseCountry) renderPlayerView(browseCountry);
          });
        });
      }
    }

    // Área de vista
    const viewArea = document.createElement('div');
    viewArea.className = 'tr-view-area';
    content.appendChild(viewArea);

    function renderCountryList() {
      browseCountry = null;
      viewArea.innerHTML = '';

      const search = document.createElement('input');
      search.className = 'tr-search-input';
      search.type = 'text';
      search.placeholder = '🔍 Buscar país…';
      viewArea.appendChild(search);

      const grid = document.createElement('div');
      grid.className = 'tr-country-grid';

      missingCountries.forEach(country => {
        const hasSelected = selectedWants.some(w => w.countryId === country.id);
        const card = document.createElement('div');
        card.className = 'tr-country-card' + (hasSelected ? ' tr-country-card--has-sel' : '');
        card.dataset.name = country.name.toLowerCase();
        card.innerHTML = `
          <img class="tr-country-flag" src="https://flagcdn.com/w80/${country.federation?.flag || 'un'}.png" alt="${country.name}">
          <div class="tr-country-name">${country.name}</div>
          <div class="tr-country-code">${country.code}</div>
          ${hasSelected ? `<div class="tr-country-sel-badge">${selectedWants.filter(w => w.countryId === country.id).length}✓</div>` : ''}
        `;
        card.addEventListener('click', () => renderPlayerView(country));
        grid.appendChild(card);
      });

      enableHorizontalDragScroll(grid);
      viewArea.appendChild(grid);

      search.addEventListener('input', () => {
        const q = search.value.toLowerCase().trim();
        grid.querySelectorAll('.tr-country-card').forEach(c => {
          c.style.display = !q || c.dataset.name.includes(q) ? '' : 'none';
        });
      });
    }

    function renderPlayerView(country) {
      browseCountry = country;
      viewArea.innerHTML = '';

      const backRow = document.createElement('div');
      backRow.className = 'tr-pv-back-row';
      backRow.innerHTML = `
        <button class="tr-pv-back-btn">←</button>
        <img class="tr-pv-label-flag" src="https://flagcdn.com/w40/${country.federation?.flag || 'un'}.png" alt="">
        <strong>${country.name}</strong>
      `;
      backRow.querySelector('.tr-pv-back-btn').addEventListener('click', renderCountryList);
      viewArea.appendChild(backRow);

      const missing = byCountry[country.id]?.missing || [];
      const grid = document.createElement('div');
      grid.className = 'tr-player-grid';

      missing.forEach(slotIndex => {
        const slot = country.slots.find(s => s.number === slotIndex);
        if (!slot?.stickerUrl) return;

        const selected = selectedWants.some(w => w.countryId === country.id && w.slotIndex === slotIndex);
        const card = document.createElement('div');
        card.className = 'tr-player-card' + (selected ? ' tr-player-card--selected' : '');
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
          refreshWantsBar();
          refreshStep2Footer();
        });
        grid.appendChild(card);
      });

      enableHorizontalDragScroll(grid);
      viewArea.appendChild(grid);
      refreshStep2Footer();
    }

    function refreshStep2Footer() {
      const n = selectedWants.length;
      setFooterBtn({
        text: n === 0
          ? `<span class="tr-cta-icon">⚽</span> Elige los cromos que quieres`
          : `Siguiente → (pido ${n} cromo${n > 1 ? 's' : ''})`,
        disabled: n === 0,
        onClick: () => { step = 3; renderStep(); },
      });
    }

    refreshWantsBar();
    refreshStep2Footer();
    renderCountryList();
  }

  // ════════════════════════════════════════════════════════════════════════
  // PASO 3 — Datos de contacto y envío
  // ════════════════════════════════════════════════════════════════════════

  function renderStep3() {
    content.innerHTML = '';

    // Resumen del intercambio
    const summary = document.createElement('div');
    summary.className = 'tr-trade-summary';
    summary.innerHTML = `
      <div class="tr-trade-summary-col">
        <div class="tr-trade-summary-label">Doy</div>
        <div class="tr-trade-summary-thumbs">
          ${selectedOffers.map(o => `<img src="${o.stickerUrl}" title="${o.name}">`).join('')}
        </div>
      </div>
      <div class="tr-trade-summary-arrow">⇄</div>
      <div class="tr-trade-summary-col">
        <div class="tr-trade-summary-label">Recibo</div>
        <div class="tr-trade-summary-thumbs">
          ${selectedWants.map(w => `<img src="${w.stickerUrl}" title="${w.name}">`).join('')}
        </div>
      </div>
    `;
    content.appendChild(summary);

    // Formulario de contacto
    const form = buildContactForm(() => {
      const n = localStorage.getItem('trade_my_name')  || '';
      const t = localStorage.getItem('trade_my_phone') || '';
      doSubmit(n, t);
    });
    content.appendChild(form);

    footer.innerHTML = ''; // El botón está dentro del formulario
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function doSubmit(nombre, telefono) {
    const btn = footer.querySelector('.tr-cta-btn') || content.querySelector('.tr-registro-btn');
    const submitBtn = content.querySelector('.tr-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `⏳ Enviando…`;
    }

    const ofrece = selectedOffers.map(o => ({ countryId: o.countryId, slotIndex: o.slotIndex }));
    const busca  = selectedWants.map(w => ({ countryId: w.countryId,  slotIndex: w.slotIndex }));

    try {
      const res = await tradeService.submit({ nombre, telefono, ofrece, busca });
      if (res.error) throw new Error(res.error);

      localStorage.setItem('trade_my_name',  nombre);
      localStorage.setItem('trade_my_phone', telefono);
      localStorage.setItem('trade_my_id',    res.id);

      // Bloquear los cromos ofrecidos para futuros intercambios
      lockStickersInFlight(ofrece.map((o, i) => ({
        countryId: o.countryId,
        slotIndex: o.slotIndex,
        stickerUrl: selectedOffers[i]?.stickerUrl || '',
      })), res.id);

      if (res.matched) {
        if (submitBtn) submitBtn.innerHTML = `🎉 ¡Coincidencia! Revisa tu WhatsApp`;
        setTimeout(() => router.navigate(`/trade/${res.id}`), 1800);
      } else {
        if (submitBtn) submitBtn.innerHTML = `✅ Solicitud enviada. Te avisamos por WhatsApp`;
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `❌ Error: ${err.message}`;
        setTimeout(() => { submitBtn.disabled = false; submitBtn.innerHTML = `Publicar intercambio`; }, 3000);
      }
    }
  }

  // ── Render paso ──────────────────────────────────────────────────────────

  function renderStep() {
    updateStepper();
    if (step === 1) renderStep1();
    else if (step === 2) renderStep2();
    else renderStep3();
  }

  renderStep();
  return wrap;
}

// ── Formulario de contacto (paso 3) ─────────────────────────────────────────

function buildContactForm(onSubmit) {
  const savedName = localStorage.getItem('trade_my_name')  || '';
  const savedIso2 = localStorage.getItem('trade_my_phone_iso2') || 've';
  const savedNum  = localStorage.getItem('trade_my_phone_num')  || '';

  const optionsHtml = DIAL_COUNTRIES.map(c =>
    `<option value="${c.iso2}" data-dial="${c.dial}" ${c.iso2 === savedIso2 ? 'selected' : ''}>${c.name} +${c.dial}</option>`
  ).join('');

  const wrap = document.createElement('div');
  wrap.className = 'tr-contact-form';
  wrap.innerHTML = `
    <div class="tr-contact-title">¿Cómo te contactamos?</div>
    <div class="tr-contact-sub">Te avisamos por WhatsApp cuando encontremos tu intercambio</div>
    <input class="tr-registro-input" id="tr-c-nombre" type="text" placeholder="Tu nombre" maxlength="50" autocomplete="name" value="${savedName.replace(/"/g, '&quot;')}">
    <div class="tr-registro-phone-row">
      <select class="tr-registro-country-select" id="tr-c-pais">${optionsHtml}</select>
      <input class="tr-registro-input tr-registro-phone-num" id="tr-c-tel" type="tel" placeholder="Número" autocomplete="tel-national" inputmode="numeric" value="${savedNum}">
    </div>
    <div class="tr-registro-phone-hint">Sin el 0 inicial</div>
    <button class="tr-submit-btn" disabled>Publicar intercambio</button>
  `;

  const nombreInput = wrap.querySelector('#tr-c-nombre');
  const paisSelect  = wrap.querySelector('#tr-c-pais');
  const numInput    = wrap.querySelector('#tr-c-tel');
  const submitBtn   = wrap.querySelector('.tr-submit-btn');

  const EJEMPLOS = {
    've': 'Ej: 4247647893', 'co': 'Ej: 3001234567', 'mx': 'Ej: 5512345678',
    'ar': 'Ej: 1112345678', 'es': 'Ej: 612345678',  'us': 'Ej: 2025550123',
    'br': 'Ej: 11912345678','cl': 'Ej: 912345678',  'pe': 'Ej: 912345678',
  };
  const hint = wrap.querySelector('.tr-registro-phone-hint');
  const updateHint = () => { hint.textContent = EJEMPLOS[paisSelect.value] || 'Sin el 0 inicial'; };
  paisSelect.addEventListener('change', updateHint);
  updateHint();

  const validate = () => {
    submitBtn.disabled = !nombreInput.value.trim() || numInput.value.replace(/\D/g, '').length < 6;
  };
  nombreInput.addEventListener('input', validate);
  numInput.addEventListener('input', validate);
  if (savedName && savedNum) validate();

  submitBtn.addEventListener('click', () => {
    const n = nombreInput.value.trim();
    if (!n || numInput.value.replace(/\D/g, '').length < 6) return;
    const opt  = paisSelect.options[paisSelect.selectedIndex];
    const dial = opt.dataset.dial;
    const iso2 = paisSelect.value;
    const num  = numInput.value.replace(/\D/g, '').replace(/^0+/, '');
    localStorage.setItem('trade_my_phone_iso2', iso2);
    localStorage.setItem('trade_my_phone_num',  num);
    onSubmit(n, `+${dial}${num}`);
  });

  return wrap;
}

// ── Modal de perfil (exportado para FloatingActions) ─────────────────────────

export function showPerfilModal() {
  const nombre = localStorage.getItem('trade_my_name')  || '';
  const phone  = localStorage.getItem('trade_my_phone') || '';
  if (!nombre && !phone) {
    showRegistroModal(() => {});
  } else {
    showRegistroModal(() => {}, { isEdit: true });
  }
}

function showRegistroModal(onDone, opts = {}) {
  const { isEdit = false } = opts;
  const savedName = localStorage.getItem('trade_my_name')  || '';
  const savedIso2 = localStorage.getItem('trade_my_phone_iso2') || 've';
  const savedNum  = localStorage.getItem('trade_my_phone_num')  || '';

  const overlay = document.createElement('div');
  overlay.className = 'tr-registro-overlay';

  const optionsHtml = DIAL_COUNTRIES.map(c =>
    `<option value="${c.iso2}" data-dial="${c.dial}" ${c.iso2 === savedIso2 ? 'selected' : ''}>${c.name} +${c.dial}</option>`
  ).join('');

  const card = document.createElement('div');
  card.className = 'tr-registro-card';
  card.innerHTML = `
    <div class="tr-registro-icon">${isEdit ? '✏️' : '⚽'}</div>
    <div class="tr-registro-title">${isEdit ? 'Editar perfil' : '¿Cómo te llamamos?'}</div>
    <div class="tr-registro-sub">${isEdit ? 'Actualiza tu nombre o número' : 'Para avisarte por WhatsApp'}</div>
    <input class="tr-registro-input" id="tr-reg-nombre" type="text" placeholder="Tu nombre" maxlength="50" autocomplete="name" value="${savedName.replace(/"/g, '&quot;')}">
    <div class="tr-registro-phone-row">
      <select class="tr-registro-country-select" id="tr-reg-pais">${optionsHtml}</select>
      <input class="tr-registro-input tr-registro-phone-num" id="tr-reg-telefono" type="tel" placeholder="Número" autocomplete="tel-national" inputmode="numeric" value="${savedNum}">
    </div>
    <div class="tr-registro-phone-hint">Sin el 0 inicial</div>
    <button class="tr-registro-btn">${isEdit ? '💾 Guardar' : 'Listo ✓'}</button>
    ${isEdit ? `<button class="tr-registro-delete">🗑 Borrar perfil</button>` : ''}
    <button class="tr-registro-cancel">Cancelar</button>
  `;
  overlay.appendChild(card);

  const nombreInput  = card.querySelector('#tr-reg-nombre');
  const paisSelect   = card.querySelector('#tr-reg-pais');
  const numInput     = card.querySelector('#tr-reg-telefono');
  const btn          = card.querySelector('.tr-registro-btn');

  const validate = () => {
    btn.disabled = !nombreInput.value.trim() || numInput.value.replace(/\D/g, '').length < 6;
  };
  nombreInput.addEventListener('input', validate);
  numInput.addEventListener('input', validate);
  if (savedName && savedNum) validate();

  function getPhoneE164() {
    const opt  = paisSelect.options[paisSelect.selectedIndex];
    const dial = opt.dataset.dial;
    const iso2 = paisSelect.value;
    const num  = numInput.value.replace(/\D/g, '').replace(/^0+/, '');
    localStorage.setItem('trade_my_phone_iso2', iso2);
    localStorage.setItem('trade_my_phone_num',  num);
    return `+${dial}${num}`;
  }

  function closeModal() {
    overlay.classList.remove('tr-registro-active');
    setTimeout(() => overlay.remove(), 260);
  }

  btn.addEventListener('click', () => {
    const n = nombreInput.value.trim();
    if (!n || numInput.value.replace(/\D/g, '').length < 6) return;
    const phone = getPhoneE164();
    localStorage.setItem('trade_my_name',  n);
    localStorage.setItem('trade_my_phone', phone);
    closeModal();
    onDone(n, phone);
  });

  card.querySelector('.tr-registro-delete')?.addEventListener('click', () => {
    ['trade_my_name','trade_my_phone','trade_my_phone_iso2','trade_my_phone_num','trade_my_id'].forEach(k => localStorage.removeItem(k));
    closeModal();
  });

  card.querySelector('.tr-registro-cancel').addEventListener('click', closeModal);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('tr-registro-active')));
}

// ── Drag-scroll horizontal táctil ────────────────────────────────────────────

function enableHorizontalDragScroll(el) {
  let startX, startScrollLeft, startY, dragging = false;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startScrollLeft = el.scrollLeft;
    dragging = false;
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!dragging) {
      if (Math.abs(dx) < Math.abs(dy)) return; // gesto vertical → no intervenir
      dragging = true;
    }
    e.preventDefault();
    el.scrollLeft = startScrollLeft - dx;
  }, { passive: false });
}

// ── Países con código de marcado ─────────────────────────────────────────────

const DIAL_COUNTRIES = [
  { iso2: 've', name: 'Venezuela',       dial: '58'  },
  { iso2: 'co', name: 'Colombia',        dial: '57'  },
  { iso2: 'mx', name: 'México',          dial: '52'  },
  { iso2: 'ar', name: 'Argentina',       dial: '54'  },
  { iso2: 'es', name: 'España',          dial: '34'  },
  { iso2: 'us', name: 'Estados Unidos',  dial: '1'   },
  { iso2: 'br', name: 'Brasil',          dial: '55'  },
  { iso2: 'pe', name: 'Perú',            dial: '51'  },
  { iso2: 'cl', name: 'Chile',           dial: '56'  },
  { iso2: 'ec', name: 'Ecuador',         dial: '593' },
  { iso2: 'bo', name: 'Bolivia',         dial: '591' },
  { iso2: 'py', name: 'Paraguay',        dial: '595' },
  { iso2: 'uy', name: 'Uruguay',         dial: '598' },
  { iso2: 'cr', name: 'Costa Rica',      dial: '506' },
  { iso2: 'pa', name: 'Panamá',          dial: '507' },
  { iso2: 'do', name: 'Rep. Dominicana', dial: '1'   },
  { iso2: 'gt', name: 'Guatemala',       dial: '502' },
  { iso2: 'hn', name: 'Honduras',        dial: '504' },
  { iso2: 'ni', name: 'Nicaragua',       dial: '505' },
  { iso2: 'sv', name: 'El Salvador',     dial: '503' },
  { iso2: 'cu', name: 'Cuba',            dial: '53'  },
  { iso2: 'pt', name: 'Portugal',        dial: '351' },
  { iso2: 'fr', name: 'Francia',         dial: '33'  },
  { iso2: 'de', name: 'Alemania',        dial: '49'  },
  { iso2: 'it', name: 'Italia',          dial: '39'  },
  { iso2: 'gb', name: 'Reino Unido',     dial: '44'  },
  { iso2: 'ca', name: 'Canadá',          dial: '1'   },
  { iso2: 'nl', name: 'Países Bajos',    dial: '31'  },
  { iso2: 'tr', name: 'Turquía',         dial: '90'  },
  { iso2: 'ma', name: 'Marruecos',       dial: '212' },
  { iso2: 'sa', name: 'Arabia Saudita',  dial: '966' },
  { iso2: 'ng', name: 'Nigeria',         dial: '234' },
  { iso2: 'za', name: 'Sudáfrica',       dial: '27'  },
  { iso2: 'sn', name: 'Senegal',         dial: '221' },
  { iso2: 'kr', name: 'Corea del Sur',   dial: '82'  },
  { iso2: 'jp', name: 'Japón',           dial: '81'  },
  { iso2: 'au', name: 'Australia',       dial: '61'  },
];
