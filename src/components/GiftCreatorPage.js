import '../styles/gift-creator.css';
import { countries } from '../data/countries.js';
import { isEmpresaMode, getEmpresaEntities } from '../data/albumContext.js';
import { transferService } from '../data/transferService.js';
import { getLang } from '../i18n.js';
import { router } from '../router.js';

function getEntities() {
  return isEmpresaMode() ? getEmpresaEntities() : countries;
}

function getReceiveUrl(id) {
  return window.location.origin + '/#/receive/' + id;
}

export function GiftCreatorPage() {
  const es       = getLang() === 'es';
  const entities = getEntities();

  const overlay = document.createElement('div');
  overlay.className = 'gc-overlay';
  overlay.addEventListener('pointerdown', e => e.stopPropagation());

  let selected  = [];
  let pollTimer = null;
  let curStep   = 'select';

  overlay.innerHTML = `
    <div class="gc-header">
      <button class="gc-header-back" id="gc-back">←</button>
      <div class="gc-header-title">${es ? 'Crear regalo de cromos' : 'Create sticker gift'}</div>
    </div>

    <!-- PASO 1: seleccionar -->
    <div class="gc-step gc-step--active" id="gc-step-select">
      <div class="gc-search-wrap">
        <input class="gc-search" id="gc-search" type="search"
               placeholder="🔍 ${es ? 'Buscar país o equipo…' : 'Search country or team…'}"
               autocomplete="off" spellcheck="false">
      </div>
      <div class="gc-countries" id="gc-countries"></div>
      <div class="gc-footer">
        <button class="gc-btn" id="gc-btn-create" disabled>
          ${es ? 'Selecciona al menos 1 cromo' : 'Select at least 1 sticker'}
        </button>
      </div>
    </div>

    <!-- PASO 2: QR esperando aceptación -->
    <div class="gc-step" id="gc-step-qr">
      <div class="gc-result-section">
        <div class="gc-result-badge">
          🎁 ${es ? '¡Muéstrale este QR a tu amigo!' : 'Show this QR to your friend!'}
        </div>
        <div class="gc-result-preview" id="gc-result-preview"></div>
        <div class="gc-qr-box">
          <div class="gc-qr-loader"><div class="gc-spinner"></div></div>
          <img class="gc-qr-img" id="gc-qr-img" src="" alt="QR" style="display:none">
        </div>
        <div class="gc-waiting">
          <div class="gc-waiting-spin"></div>
          <span>${es ? 'Esperando que escaneen…' : 'Waiting for scan…'}</span>
        </div>
        <button class="gc-btn gc-btn--share" id="gc-btn-share">
          📤 ${es ? 'Compartir enlace' : 'Share link'}
        </button>
        <div class="gc-share-socials">
          <button class="gc-btn-social gc-btn-social--fb" id="gc-btn-facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
            Facebook
          </button>
          <button class="gc-btn-social gc-btn-social--li" id="gc-btn-linkedin">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn
          </button>
        </div>
      </div>
      <div class="gc-footer">
        <button class="gc-btn gc-btn--cancel" id="gc-btn-cancel">
          ${es ? 'Cancelar' : 'Cancel'}
        </button>
      </div>
    </div>

    <!-- PASO 3: éxito -->
    <div class="gc-step" id="gc-step-success">
      <div class="gc-result-section">
        <div class="gc-success-icon">🎉</div>
        <div class="gc-success-title">${es ? '¡Cromos enviados!' : 'Stickers sent!'}</div>
        <div class="gc-success-sub">${es ? 'Los cromos ya están en el álbum de tu amigo.' : "The stickers are now in your friend's album."}</div>
      </div>
      <div class="gc-footer">
        <button class="gc-btn" id="gc-btn-close">${es ? 'Cerrar' : 'Close'}</button>
      </div>
    </div>
  `;

  // ── Construir lista de países ───────────────────────────────────────────────
  function buildList(query = '') {
    const q = query.toLowerCase().trim();
    const container = overlay.querySelector('#gc-countries');
    container.innerHTML = '';

    const visible = entities.filter(c =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );

    if (visible.length === 0) {
      container.innerHTML = `<div class="gc-no-results">${es ? `Sin resultados para "${query}"` : `No results for "${query}"`}</div>`;
      return;
    }

    visible.forEach(country => {
      const totalSlots = (country.slots || []).length;
      if (!totalSlots) return;

      const block = document.createElement('div');
      block.className = 'gc-country-block';
      block.dataset.country = country.id;

      const flagHtml = country.federation?.flag
        ? `<img class="gc-country-flag" src="https://flagcdn.com/w40/${country.federation.flag}.png" alt="">`
        : '';

      const selCount = selected.filter(s => s.countryId === country.id).length;

      block.innerHTML = `
        <div class="gc-country-header" data-country="${country.id}">
          ${flagHtml}
          <span class="gc-country-code">${country.code}</span>
          <span class="gc-country-name">${country.name}</span>
          <span class="gc-country-total">${totalSlots} ${es ? 'cromos' : 'stickers'}</span>
          <span class="gc-country-sel" id="gcsel-${country.id}" ${selCount ? '' : 'style="display:none"'}>${selCount ? `${selCount} ✓` : ''}</span>
          <span class="gc-country-chevron" id="gcchev-${country.id}">▸</span>
        </div>
        <div class="gc-slots-row" id="gcrow-${country.id}" style="display:none"></div>
      `;

      const header   = block.querySelector('.gc-country-header');
      const slotsRow = block.querySelector(`#gcrow-${country.id}`);

      header.addEventListener('click', () => {
        const open = slotsRow.style.display !== 'none';
        slotsRow.style.display = open ? 'none' : 'flex';
        block.querySelector(`#gcchev-${country.id}`).textContent = open ? '▸' : '▾';
        if (!open && slotsRow.children.length === 0) buildSlots(country, slotsRow);
      });

      container.appendChild(block);
    });

    selected.forEach(s => updateCountryBadge(s.countryId));
  }

  function buildSlots(country, row) {
    (country.slots || []).forEach(slot => {
      const isSel = selected.some(s => s.countryId === country.id && s.slotIndex === slot.number);
      const card  = document.createElement('div');
      card.className = 'gc-slot-card' + (isSel ? ' gc-slot-card--selected' : '');

      const imgHtml = slot.stickerUrl
        ? `<img src="${slot.stickerUrl}" alt="${slot.name || ''}" class="gc-slot-img">`
        : `<div class="gc-slot-placeholder">${slot.number}</div>`;

      card.innerHTML = `
        ${imgHtml}
        <div class="gc-slot-label">${country.code} ${slot.number}</div>
        <div class="gc-slot-check">✓</div>
      `;

      card.addEventListener('click', () => {
        const idx = selected.findIndex(s => s.countryId === country.id && s.slotIndex === slot.number);
        if (idx >= 0) {
          selected.splice(idx, 1);
          card.classList.remove('gc-slot-card--selected');
        } else {
          selected.push({
            countryId:  country.id,
            slotIndex:  slot.number,
            stickerUrl: slot.stickerUrl || '',
            name:       (slot.name || '').replace(/\n/g, ' '),
            code:       country.code,
          });
          card.classList.add('gc-slot-card--selected');
        }
        updateCountryBadge(country.id);
        refreshFooter();
      });

      row.appendChild(card);
    });
  }

  function updateCountryBadge(countryId) {
    const n     = selected.filter(s => s.countryId === countryId).length;
    const badge = overlay.querySelector(`#gcsel-${countryId}`);
    if (!badge) return;
    if (n > 0) { badge.textContent = `${n} ✓`; badge.style.display = 'inline'; }
    else        { badge.style.display = 'none'; }
  }

  function refreshFooter() {
    const btn = overlay.querySelector('#gc-btn-create');
    const n   = selected.length;
    btn.disabled    = n === 0;
    btn.textContent = n === 0
      ? (es ? 'Selecciona al menos 1 cromo' : 'Select at least 1 sticker')
      : (es ? `Crear regalo (${n} cromo${n !== 1 ? 's' : ''})` : `Create gift (${n} sticker${n !== 1 ? 's' : ''})`);
  }

  function showStep(name) {
    overlay.querySelectorAll('.gc-step').forEach(s => s.classList.remove('gc-step--active'));
    overlay.querySelector(`#gc-step-${name}`).classList.add('gc-step--active');
    curStep = name;
  }

  buildList();
  overlay.querySelector('#gc-search').addEventListener('input', e => buildList(e.target.value));

  // ── Crear regalo ────────────────────────────────────────────────────────────
  let currentReceiveUrl = '';

  overlay.querySelector('#gc-btn-create').addEventListener('click', async () => {
    const btn = overlay.querySelector('#gc-btn-create');
    btn.disabled    = true;
    btn.textContent = es ? 'Creando…' : 'Creating…';

    try {
      const stickers = selected.map(s => ({ countryId: s.countryId, slotIndex: s.slotIndex }));
      const res = await transferService.create(stickers, { name: 'regalo', phone: '' });
      if (res.error) throw new Error(res.error);

      currentReceiveUrl = getReceiveUrl(res.id);

      overlay.querySelector('#gc-result-preview').innerHTML =
        selected.map(s => s.stickerUrl
          ? `<img src="${s.stickerUrl}" alt="${s.name}" title="${s.code} ${s.slotIndex}">`
          : `<div class="gc-preview-placeholder">${s.code}<br>${s.slotIndex}</div>`
        ).join('');

      const qrImg    = overlay.querySelector('#gc-qr-img');
      const qrLoader = overlay.querySelector('.gc-qr-loader');
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(currentReceiveUrl)}`;
      qrImg.onload = () => { qrLoader.style.display = 'none'; qrImg.style.display = 'block'; };

      showStep('qr');
      startPolling(res.id);
    } catch {
      btn.disabled    = false;
      btn.textContent = es ? '❌ Error. Reintentar' : '❌ Error. Retry';
    }
  });

  // ── Polling ──────────────────────────────────────────────────────────────────
  function startPolling(transferId) {
    pollTimer = setInterval(async () => {
      try {
        const res = await transferService.status(transferId);
        if (res.status === 'accepted') { clearInterval(pollTimer); showStep('success'); }
      } catch {}
    }, 3000);
  }

  // ── Compartir ─────────────────────────────────────────────────────────────
  overlay.querySelector('#gc-btn-share').addEventListener('click', async () => {
    const text = es
      ? `🎁 Te regalo cromos para el álbum. Ábrelo aquí:\n${currentReceiveUrl}`
      : `🎁 Sticker gift for your album. Open here:\n${currentReceiveUrl}`;
    const shareBtn = overlay.querySelector('#gc-btn-share');
    if (navigator.share) {
      try { await navigator.share({ title: es ? '🎁 Regalo de cromos' : '🎁 Sticker gift', text, url: currentReceiveUrl }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        shareBtn.textContent = es ? '✓ ¡Enlace copiado!' : '✓ Link copied!';
        setTimeout(() => { shareBtn.textContent = `📤 ${es ? 'Compartir enlace' : 'Share link'}`; }, 2200);
      } catch {
        window.prompt(es ? 'Copia este enlace:' : 'Copy this link:', currentReceiveUrl);
      }
    }
  });

  // ── Compartir en Facebook ─────────────────────────────────────────────────
  overlay.querySelector('#gc-btn-facebook').addEventListener('click', () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentReceiveUrl)}`;
    window.open(url, '_blank', 'width=600,height=460');
  });

  // ── Compartir en LinkedIn ─────────────────────────────────────────────────
  overlay.querySelector('#gc-btn-linkedin').addEventListener('click', () => {
    const text = es
      ? '🎁 Te regalo cromos del álbum del Mundial 2026. ¡Recíbelos gratis!'
      : '🎁 Sticker gift for the 2026 World Cup album. Claim yours for free!';
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentReceiveUrl)}&summary=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=520');
  });

  // ── Cancelar / volver ─────────────────────────────────────────────────────
  overlay.querySelector('#gc-btn-cancel').addEventListener('click', () => {
    clearInterval(pollTimer);
    showStep('select');
  });

  overlay.querySelector('#gc-btn-close').addEventListener('click', close);
  overlay.querySelector('#gc-back').addEventListener('click', () => {
    if (curStep === 'qr') { clearInterval(pollTimer); showStep('select'); return; }
    close();
  });

  function close() {
    clearInterval(pollTimer);
    overlay.remove();
    router.navigate('/');
  }

  document.body.appendChild(overlay);
  return overlay;
}
