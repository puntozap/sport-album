import '../styles/ar-page.css';
import { router } from '../router.js';
import { collectionStore } from '../data/collectionStore.js';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js';

function loadLeaflet() {
  return new Promise(resolve => {
    if (window.L) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = LEAFLET_JS; s.onload = resolve;
    document.head.appendChild(s);
  });
}

function cleanup() {
  window._userMapMarker = null;
  if (window._mapGpsWatchId != null) {
    navigator.geolocation.clearWatch(window._mapGpsWatchId);
    window._mapGpsWatchId = null;
  }
}

export async function MapPage() {
  document.getElementById('map-page')?.remove();
  cleanup();

  const el = document.createElement('div');
  el.id = 'map-page';
  el.className = 'ar-overlay';
  el.innerHTML = `
    <div class="ar-topbar">
      <button class="ar-topbar-back" id="map-back">←</button>
      <div class="ar-topbar-title">
        Cromoses escondidos
        <span class="ar-topbar-sub">Toca un pin para ir a buscarlo</span>
      </div>
    </div>

    <div class="ar-map-wrap" style="flex:1;min-height:0;position:relative">
      <div id="lmap-main" style="width:100%;height:100%"></div>

      <!-- Locate me button -->
      <button id="map-locate-btn" style="
        position:absolute;bottom:80px;right:12px;z-index:1000;
        width:46px;height:46px;border-radius:50%;
        background:rgba(13,20,34,.95);border:1px solid rgba(255,255,255,.15);
        font-size:22px;cursor:pointer;
        box-shadow:0 4px 14px rgba(0,0,0,.5);
        display:flex;align-items:center;justify-content:center">
        📍
      </button>

      <div id="map-loading" style="
        position:absolute;inset:0;display:flex;align-items:center;
        justify-content:center;background:#060b14;z-index:500;
        flex-direction:column;gap:14px;color:rgba(255,255,255,.6);font-size:14px">
        <div style="font-size:36px">🗺</div>
        Cargando cromoses…
      </div>
    </div>

    <!-- Bottom sheet for selected cromo -->
    <div id="map-sheet" style="
      position:fixed;bottom:0;left:0;right:0;z-index:500;
      background:#0d1422;border-top:1px solid rgba(255,255,255,.1);
      border-radius:20px 20px 0 0;padding:20px 16px;
      transform:translateY(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);
      display:flex;flex-direction:column;gap:12px">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);
        border-radius:2px;margin:0 auto 4px"></div>
      <div style="display:flex;align-items:center;gap:14px">
        <img id="sheet-img" src="" style="width:54px;height:76px;
          border-radius:8px;object-fit:cover;
          box-shadow:0 4px 14px rgba(102,51,204,.5)">
        <div>
          <div id="sheet-name" style="font-size:17px;font-weight:800;color:#fff"></div>
          <div id="sheet-dist" style="font-size:12px;color:rgba(255,255,255,.45);margin-top:4px"></div>
          <div style="font-size:11px;color:#6633cc;font-weight:700;margin-top:3px">
            📍 Cromo escondido en la ciudad
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button id="sheet-nav-btn" class="ar-btn secondary" style="margin:0">🗺 Cómo llegar</button>
        <button id="sheet-find-btn" class="ar-btn" style="margin:0">🔍 Ir a buscarlo</button>
      </div>
    </div>

    <!-- Empty state -->
    <div id="map-empty" style="
      display:none;position:fixed;inset:0;
      align-items:center;justify-content:center;
      flex-direction:column;gap:16px;text-align:center;padding:40px;
      background:#060b14;z-index:5">
      <div style="font-size:52px">🏙</div>
      <div style="font-size:18px;font-weight:800;color:#fff">No hay cromoses activos</div>
      <div style="font-size:13px;color:rgba(255,255,255,.45);max-width:260px">
        El administrador del álbum todavía no ha escondido ningún cromo en tu ciudad.
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('#map-back').addEventListener('click', () => {
    cleanup();
    el.remove();
    history.back();
  });

  await loadLeaflet();
  const L = window.L;

  const leafMap = window.L['map']('lmap-main', { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(leafMap);

  // Blue dot icon — Google Maps style
  const userIcon = L.divIcon({
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#4285f4;border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(66,133,244,.3),0 2px 8px rgba(0,0,0,.4)">
    </div>`,
    iconSize: [20, 20], iconAnchor: [10, 10], className: ''
  });

  let userLat = null, userLng = null;
  let firstFix = true;
  let boundsSet = false;

  if (navigator.geolocation) {
    window._mapGpsWatchId = navigator.geolocation.watchPosition(pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      if (!window._userMapMarker) {
        window._userMapMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(leafMap);
      } else {
        window._userMapMarker.setLatLng([userLat, userLng]);
      }

      // Pan to user on first fix, but only after fitBounds has already run
      if (firstFix && boundsSet) {
        firstFix = false;
        leafMap.setView([userLat, userLng], 19);
      }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 0 });
  }

  // Locate me button
  el.querySelector('#map-locate-btn').addEventListener('click', () => {
    if (userLat !== null) {
      leafMap.setView([userLat, userLng], 19);
    }
  });

  // Load cromoses
  let cromoses = [];
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('/api/ar-cromos.json', { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(tid);
    if (res.ok) cromoses = await res.json();
    else throw new Error('not ok');
  } catch {
    cromoses = JSON.parse(localStorage.getItem('ar_placed') || '[]');
  }

  el.querySelector('#map-loading').style.display = 'none';

  // Only show cromoses the user is missing
  const active = cromoses.filter(c => {
    if (c.active === false) return false;
    if (c.countryId != null && c.slotIndex != null) {
      return !collectionStore.has(c.countryId, c.slotIndex);
    }
    return true;
  });

  if (!active.length) {
    el.querySelector('#map-empty').style.display = 'flex';
    el.querySelector('#map-empty').innerHTML = `
      <div style="font-size:52px">🏆</div>
      <div style="font-size:18px;font-weight:800;color:#fff">¡Ya tienes todos!</div>
      <div style="font-size:13px;color:rgba(255,255,255,.45);max-width:260px;text-align:center">
        No hay cromoses escondidos que te falten en este momento.
      </div>`;
    leafMap.setView([7.754, -72.224], 14);
    boundsSet = true;
    if (userLat !== null) leafMap.setView([userLat, userLng], 19);
    return;
  }

  // Add cromo markers
  let selectedCromo = null;
  const sheet = el.querySelector('#map-sheet');

  active.forEach(cromo => {
    const pinIcon = L.divIcon({
      html: `<div style="
        width:44px;height:44px;border-radius:50%;
        background:linear-gradient(135deg,#6633cc,#00a9bd);
        border:3px solid #fff;overflow:hidden;
        box-shadow:0 4px 16px rgba(102,51,204,.65);
        display:flex;align-items:center;justify-content:center">
        <img src="${cromo.img}" style="width:100%;height:100%;object-fit:cover"
          onerror="this.style.display='none';this.parentElement.innerHTML='⭐'">
      </div>`,
      iconSize: [44, 44], iconAnchor: [22, 22], className: ''
    });

    const marker = L.marker([cromo.lat, cromo.lng], { icon: pinIcon }).addTo(leafMap);
    marker.on('click', e => {
      L.DomEvent.stopPropagation(e);
      selectedCromo = cromo;

      el.querySelector('#sheet-img').src = cromo.img;
      el.querySelector('#sheet-name').textContent = cromo.name;

      if (userLat !== null) {
        const R = 6371000;
        const dLat = (cromo.lat - userLat) * Math.PI / 180;
        const dLon = (cromo.lng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 +
          Math.cos(userLat*Math.PI/180)*Math.cos(cromo.lat*Math.PI/180)*Math.sin(dLon/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        el.querySelector('#sheet-dist').textContent =
          dist < 1000 ? `A ${Math.round(dist)} metros de ti` : `A ${(dist/1000).toFixed(1)} km de ti`;
      } else {
        el.querySelector('#sheet-dist').textContent = 'Activa el GPS para ver la distancia';
      }

      sheet.style.transform = 'translateY(0)';
      leafMap.panTo([cromo.lat, cromo.lng]);
    });
  });

  // Fit all cromoses in view first
  const bounds = L.latLngBounds(active.map(c => [c.lat, c.lng]));
  leafMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  boundsSet = true;
  // If GPS already fired before the fetch completed, pan to user now
  if (userLat !== null && firstFix) {
    firstFix = false;
    leafMap.setView([userLat, userLng], 17);
  }

  leafMap.on('click', () => { sheet.style.transform = 'translateY(100%)'; });

  el.querySelector('#sheet-nav-btn').addEventListener('click', () => {
    if (!selectedCromo) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedCromo.lat},${selectedCromo.lng}`, '_blank');
  });

  el.querySelector('#sheet-find-btn').addEventListener('click', () => {
    if (!selectedCromo) return;
    el.remove();
    router.navigate(`/find?lat=${selectedCromo.lat}&lng=${selectedCromo.lng}`
      + `&name=${encodeURIComponent(selectedCromo.name)}`
      + `&img=${encodeURIComponent(selectedCromo.img)}`
      + `&dist=${selectedCromo.dist || 20}`
      + (selectedCromo.countryId ? `&countryId=${encodeURIComponent(selectedCromo.countryId)}&slotIndex=${selectedCromo.slotIndex}` : ''));
  });
}
