import '../styles/ar-page.css';
import { getStickerUrl } from '../data/stickerLoader.js';
import stickerMap from '../data/stickerMap.json';
import { countries } from '../data/countries.js';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js';

function getAllStickers() {
  const list = [];
  for (const [countryId, slots] of Object.entries(stickerMap)) {
    const country = countries.find(c => c.id === countryId);
    slots.forEach((url, idx) => {
      if (!url) return;
      const fullUrl = getStickerUrl(countryId, idx);
      if (fullUrl) list.push({ url: fullUrl, name: `${country?.name || countryId} #${idx + 1}`, countryId, slotIndex: idx });
    });
  }
  return list;
}

const ALL_STICKERS = getAllStickers();
function randomSticker() {
  return ALL_STICKERS[Math.floor(Math.random() * ALL_STICKERS.length)];
}

function loadLeaflet() {
  return new Promise(resolve => {
    if (window.L) { resolve(); return; }
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    const s = document.createElement('script'); s.src = LEAFLET_JS; s.onload = resolve;
    document.head.appendChild(s);
  });
}

export async function ARPage() {
  document.getElementById('ar-page')?.remove();

  const el = document.createElement('div');
  el.id = 'ar-page';
  el.className = 'ar-overlay';
  el.innerHTML = `
    <div class="ar-topbar">
      <button class="ar-topbar-back" id="ar-back">←</button>
      <div class="ar-topbar-title">
        Esconder cromoses en la ciudad
        <span class="ar-topbar-sub">Toca el mapa para colocar cada cromo</span>
      </div>
      <button id="ar-export-btn" style="
        background:linear-gradient(135deg,#6633cc,#00a9bd);
        border:none;color:#fff;border-radius:10px;
        padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;
        white-space:nowrap;flex-shrink:0">
        📤 Guardar lista
      </button>
    </div>

    <!-- Map -->
    <div class="ar-map-wrap" style="flex:1">
      <div id="ar-map"></div>
      <div id="ar-tap-hint" style="
        position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,.65);backdrop-filter:blur(6px);
        color:rgba(255,255,255,.8);font-size:12px;border-radius:20px;
        padding:6px 16px;pointer-events:none;white-space:nowrap;z-index:10">
        👆 Toca el mapa para colocar un cromo
      </div>
    </div>

    <!-- Count badge -->
    <div style="
      position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
      background:rgba(13,20,34,.9);backdrop-filter:blur(8px);
      border:1px solid rgba(255,255,255,.1);border-radius:20px;
      padding:8px 20px;display:flex;align-items:center;gap:10px;z-index:10">
      <span style="font-size:12px;color:rgba(255,255,255,.5);font-weight:600">Cromoses colocados</span>
      <span id="ar-count-badge" style="
        background:rgba(102,51,204,.3);border-radius:20px;
        padding:2px 10px;color:#a78bfa;font-weight:700">0</span>
    </div>
    <div id="ar-list" style="display:none"></div>
  `;
  document.body.appendChild(el);

  el.querySelector('#ar-back').addEventListener('click', () => { el.remove(); history.back(); });

  await loadLeaflet();
  const L = window.L;

  // Always load from server — server is source of truth
  const stickerByName = {};
  ALL_STICKERS.forEach(s => { stickerByName[s.name] = s; });

  let placed = [];
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('/api/ar-cromos.json', { cache: 'no-store', signal: ctrl.signal });
    if (res.ok) placed = await res.json();
  } catch { placed = []; }

  // Ensure all entries have countryId/slotIndex (migrate old format)
  placed.forEach(c => {
    if (!c.countryId && stickerByName[c.name]) {
      c.countryId = stickerByName[c.name].countryId;
      c.slotIndex = stickerByName[c.name].slotIndex;
    }
  });

  // Sync localStorage with server
  localStorage.setItem('ar_placed', JSON.stringify(placed));

  const markers = {}; // id → leaflet marker

  // Map init — use bracket notation to avoid Terser collision with Array.map
  const arLeafMap = window.L['map']('ar-map', { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(arLeafMap);

  // Center on user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      p => arLeafMap.setView([p.coords.latitude, p.coords.longitude], 16),
      () => arLeafMap.setView([7.754, -72.224], 14)
    );
  } else { arLeafMap.setView([7.754, -72.224], 14); }

  function makeIcon(imgUrl) {
    return L.divIcon({
      html: `<div style="width:40px;height:40px;border-radius:50%;
        background:linear-gradient(135deg,#6633cc,#00a9bd);
        border:3px solid #fff;overflow:hidden;
        box-shadow:0 4px 14px rgba(102,51,204,.65);
        display:flex;align-items:center;justify-content:center">
        <img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover"
          onerror="this.parentElement.innerHTML='⭐'">
      </div>`,
      iconSize: [40, 40], iconAnchor: [20, 20], className: ''
    });
  }

  // Update count badge only (list is hidden)
  function renderList() {
    el.querySelector('#ar-count-badge').textContent = placed.length;
  }

  // Add marker to map
  function addMarker(cromo) {
    const m = L.marker([cromo.lat, cromo.lng], { icon: makeIcon(cromo.img) }).addTo(arLeafMap);
    m.bindPopup(`<b>${cromo.name}</b><br><small>${cromo.lat.toFixed(5)}, ${cromo.lng.toFixed(5)}</small>`);
    markers[cromo.id] = m;
  }

  // Add cromo to list
  function addCromo(lat, lng, sticker) {
    const entry = {
      id:         `cromo-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      lat:        parseFloat(lat.toFixed(6)),
      lng:        parseFloat(lng.toFixed(6)),
      name:       sticker.name,
      img:        sticker.url,
      countryId:  sticker.countryId,
      slotIndex:  sticker.slotIndex,
      dist:       3,
      active:     true,
      created:    new Date().toISOString()
    };
    placed.push(entry);
    localStorage.setItem('ar_placed', JSON.stringify(placed));
    addMarker(entry);
    renderList();

    // Flash count badge
    const badge = el.querySelector('#ar-count-badge');
    badge.style.background = 'rgba(0,168,60,.5)';
    badge.style.color = '#fff';
    setTimeout(() => { badge.style.background = ''; badge.style.color = ''; }, 600);
  }

  // Restore existing markers
  placed.forEach(addMarker);
  renderList();

  // Click on map → place new cromo
  arLeafMap.on('click', e => {
    const sticker = randomSticker();
    addCromo(e.latlng.lat, e.latlng.lng, sticker);
    // Hide tap hint after first placement
    el.querySelector('#ar-tap-hint').style.opacity = '0';
  });

  // Delete cromo on marker popup click (via map popup)
  // List actions via popup — not needed since list is hidden
  if (false) { // kept for reference
    el.querySelector('#ar-list').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    const cromo = placed[idx];
    if (!cromo) return;

    if (btn.classList.contains('ar-del-btn')) {
      markers[cromo.id]?.remove();
      delete markers[cromo.id];
      placed.splice(idx, 1);
      localStorage.setItem('ar_placed', JSON.stringify(placed));
      renderList();

    } else if (btn.classList.contains('ar-qr-row-btn')) {
      showQRModal(cromo);
    }
  }); } // end if(false)

  // QR modal
  function showQRModal(cromo) {
    document.getElementById('ar-qr-modal')?.remove();
    const base = `${location.origin}/find`;
    const url  = `${base}?lat=${cromo.lat}&lng=${cromo.lng}`
               + `&name=${encodeURIComponent(cromo.name)}`
               + `&img=${encodeURIComponent(cromo.img)}`
               + `&dist=${cromo.dist}`
               + (cromo.countryId ? `&countryId=${encodeURIComponent(cromo.countryId)}&slotIndex=${cromo.slotIndex}` : '');
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&qzone=2&data=${encodeURIComponent(url)}`;

    const modal = document.createElement('div');
    modal.id = 'ar-qr-modal';
    modal.style.cssText = `position:fixed;inset:0;z-index:300;
      background:rgba(0,0,0,.85);display:flex;align-items:center;
      justify-content:center;padding:24px`;
    modal.innerHTML = `
      <div style="background:#0d1422;border-radius:20px;padding:24px;
        max-width:340px;width:100%;border:1px solid rgba(255,255,255,.1);
        display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
        <div style="display:flex;align-items:center;gap:10px;width:100%">
          <img src="${cromo.img}" style="width:44px;height:62px;border-radius:7px;object-fit:cover">
          <div style="text-align:left;flex:1">
            <div style="font-size:14px;font-weight:800;color:#fff">${cromo.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.35);font-family:monospace;margin-top:2px">
              ${cromo.lat.toFixed(5)}, ${cromo.lng.toFixed(5)}
            </div>
          </div>
          <button id="ar-modal-close" style="background:rgba(255,255,255,.1);
            border:none;color:#fff;border-radius:50%;width:30px;height:30px;
            font-size:16px;cursor:pointer;flex-shrink:0">✕</button>
        </div>
        <img src="${qrSrc}" style="width:200px;height:200px;border-radius:10px;background:#fff;padding:4px">
        <div style="font-size:11px;color:rgba(255,255,255,.4)">
          Escanea para ir a buscar este cromo
        </div>
        <div style="font-size:10px;font-family:monospace;color:#00a9bd;
          word-break:break-all;background:rgba(0,169,189,.08);
          border-radius:8px;padding:8px 10px;width:100%;cursor:pointer"
          id="ar-modal-url">${url}</div>
        <div style="display:flex;gap:8px;width:100%">
          <button id="ar-modal-copy" class="ar-btn secondary" style="margin:0;flex:1">📋 Copiar</button>
          <button id="ar-modal-share" class="ar-btn" style="margin:0;flex:1">📤 Compartir</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#ar-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#ar-modal-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText(url);
      modal.querySelector('#ar-modal-copy').textContent = '✅ Copiado';
    });

    modal.querySelector('#ar-modal-share').addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: `¡Hay un cromo escondido!`, text: `Encuentra el cromo ${cromo.name}`, url });
      } else {
        navigator.clipboard?.writeText(url);
        modal.querySelector('#ar-modal-share').textContent = '✅ Link copiado';
      }
    });
  }

  // Save to server
  const SECRET = 'albumcromos2026';
  el.querySelector('#ar-export-btn').addEventListener('click', async () => {
    if (!placed.length) { alert('Todavía no has colocado ningún cromo.'); return; }
    const btn = el.querySelector('#ar-export-btn');
    btn.textContent = '⏳ Guardando…';
    btn.disabled = true;
    try {
      const res = await fetch('/api/save-cromos.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Secret': SECRET },
        body: JSON.stringify(placed)
      });
      const data = await res.json();
      if (data.ok) {
        btn.textContent = '✅ Guardado';
        btn.style.background = 'linear-gradient(135deg,#00a83c,#00d97e)';
        setTimeout(() => {
          btn.textContent = '📤 Guardar lista';
          btn.style.background = '';
          btn.disabled = false;
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      btn.textContent = '❌ Error';
      btn.disabled = false;
      setTimeout(() => { btn.textContent = '📤 Guardar lista'; }, 2000);
      console.error(e);
    }
  });
}
