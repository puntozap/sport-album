import '../styles/ar-page.css';
import { collectionStore } from '../data/collectionStore.js';
import { refreshStickerTray } from './StickerTray.js';
import { router } from '../router.js';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js';

function loadLeaflet() {
  return new Promise(resolve => {
    if (window.L) { resolve(); return; }
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    const s = document.createElement('script'); s.src = LEAFLET_JS; s.onload = resolve;
    document.head.appendChild(s);
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function bearingTo(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180)
           - Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function angleDiff(a, b) {
  let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d;
}

export async function FindPage() {
  document.getElementById('find-page')?.remove();

  // pushState: params in window.location.search; hash fallback for file:// mode
  const allParams = new URLSearchParams(
    window.location.search.slice(1) ||
    (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '')
  );

  const SLAT       = parseFloat(allParams.get('lat')  || '0');
  const SLNG       = parseFloat(allParams.get('lng')  || '0');
  const SIMG       = allParams.get('img')  || '';
  const SNAME      = allParams.get('name') || 'Cromo especial';
  const SDIST      = parseFloat(allParams.get('dist') || '3');
  const SCOUNTRY   = allParams.get('countryId') || '';
  const SSLOT      = parseInt(allParams.get('slotIndex') ?? '-1', 10);

  const el = document.createElement('div');
  el.id = 'find-page';
  el.className = 'ar-overlay';

  const imgHtml = SIMG
    ? `<img class="find-sticker-img" src="${SIMG}" alt="${SNAME}">`
    : `<div class="find-sticker-img placeholder">⭐</div>`;

  // SVG circle progress (circumference = 2π×34 ≈ 213.6)
  const CIRC = 213.6;

  el.innerHTML = `
    <div class="ar-topbar">
      <button class="ar-topbar-back" id="find-back">←</button>
      <div class="ar-topbar-title">
        ${SNAME}
        <span class="ar-topbar-sub">Ve a la ubicación marcada en el mapa</span>
      </div>
    </div>

    <!-- Sticker header -->
    <div class="find-sticker-header">
      ${imgHtml}
      <div class="find-sticker-info">
        <div class="find-sticker-name">${SNAME}</div>
        <div class="find-sticker-tag">📍 Cromo escondido en la ciudad</div>
      </div>
    </div>

    <!-- Map -->
    <div class="ar-map-wrap" style="flex:1;min-height:0">
      <div id="find-lmap" style="width:100%;height:100%"></div>
      <div class="find-dist-pill" id="find-dist-pill">
        <div class="dist-dot"></div>
        <span id="find-dist-text">Calculando…</span>
      </div>
    </div>

    <!-- Proximity detector + actions -->
    <div class="find-panel">

      <!-- Real-time proximity ring -->
      <div id="prox-detector" style="
        display:flex;align-items:center;gap:16px;
        background:rgba(255,255,255,.04);border-radius:14px;
        padding:14px;border:1px solid rgba(255,255,255,.08)">

        <!-- Circular progress -->
        <div style="position:relative;width:72px;height:72px;flex-shrink:0">
          <svg width="72" height="72" style="transform:rotate(-90deg)">
            <circle cx="36" cy="36" r="34" fill="none"
              stroke="rgba(255,255,255,.08)" stroke-width="5"/>
            <circle id="prox-ring" cx="36" cy="36" r="34" fill="none"
              stroke="#6633cc" stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray="${CIRC}"
              stroke-dashoffset="${CIRC}"
              style="transition:stroke-dashoffset .6s ease,stroke .4s"/>
          </svg>
          <div id="prox-icon" style="
            position:absolute;inset:0;display:flex;
            align-items:center;justify-content:center;
            font-size:26px">🔒</div>
        </div>

        <!-- Text info -->
        <div style="flex:1">
          <div id="prox-title" style="
            font-size:15px;font-weight:800;color:#fff;margin-bottom:4px">
            Buscando tu ubicación…
          </div>
          <div id="prox-sub" style="
            font-size:12px;color:rgba(255,255,255,.5);line-height:1.5">
            Activa el GPS y acércate al pin del mapa
          </div>
          <!-- Mini distance bar -->
          <div style="
            margin-top:8px;height:4px;border-radius:2px;
            background:rgba(255,255,255,.08);overflow:hidden">
            <div id="prox-bar" style="
              height:100%;width:0%;border-radius:2px;
              background:linear-gradient(to right,#6633cc,#00a9bd);
              transition:width .6s ease"></div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="find-btn-row">
        <button class="ar-btn secondary" id="find-nav-btn" style="margin:0">
          🗺 Cómo llegar
        </button>
        <button class="ar-btn" id="find-ar-btn" style="margin:0;opacity:.4;cursor:not-allowed" disabled>
          🔒 Acércate más
        </button>
      </div>
    </div>

    <!-- AR Camera overlay -->
    <div class="ar-camera-overlay" id="ar-cam">
      <video id="ar-video" autoplay playsinline muted></video>
      <div class="ar-scan-line"></div>
      <div id="ar-cromo-wrap">
        <div class="ar-cromo-glow"></div>
        <img id="ar-cromo-img" src="${SIMG}" alt="${SNAME}">
        <div class="ar-cromo-holo"></div>
      </div>
      <div class="ar-cam-hud">
        <span class="ar-cam-name">${SNAME}</span>
        <button class="ar-cam-close" id="ar-cam-close">✕</button>
      </div>
      <div class="ar-compass-wrap" id="ar-compass-wrap">
        <div class="ar-compass-ring" id="ar-compass-arrow">🧭</div>
        <div class="ar-compass-label">Gira para encontrar el cromo</div>
      </div>
      <button id="ar-collect-btn">⭐ ¡Recoger cromo!</button>
      <div class="ar-celebration" id="ar-celebration">
        <div class="cel-stars">⭐⭐⭐</div>
        <img class="cel-sticker" src="${SIMG || ''}" alt="">
        <div class="cel-title">¡Cromo encontrado!</div>
        <div class="cel-sub">${SNAME}</div>
        <button class="ar-btn" id="ar-cel-grab-btn" style="margin-top:8px;background:linear-gradient(135deg,#00a83c,#00d97e)">
          📌 Guardar para pegar en el álbum
        </button>
        <button class="ar-btn secondary" id="ar-cel-btn" style="margin-top:4px">
          Ver mi álbum
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(el);

  if (!SIMG) {
    el.querySelector('#ar-cromo-img').src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="140" height="196"%3E%3Crect width="140" height="196" rx="12" fill="%231a1a3e"/%3E%3Ctext x="70" y="108" text-anchor="middle" font-size="48"%3E⭐%3C/text%3E%3C/svg%3E';
  }

  el.querySelector('#find-back').addEventListener('click', () => {
    stopCamera(); el.remove(); history.back();
  });

  // ── Load map ─────────────────────────────────────────────────────────────
  await loadLeaflet();
  const L = window.L;

  const leafMap = window.L['map']('find-lmap', { zoomControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(leafMap);

  // Cromo pin
  const cromoIcon = L.divIcon({
    html: `<div style="width:44px;height:44px;border-radius:50%;
      background:linear-gradient(135deg,#6633cc,#00a9bd);
      border:3px solid #fff;overflow:hidden;
      box-shadow:0 4px 16px rgba(102,51,204,.7);
      display:flex;align-items:center;justify-content:center">
      <img src="${SIMG}" style="width:100%;height:100%;object-fit:cover"
        onerror="this.parentElement.innerHTML='⭐'">
    </div>`,
    iconSize: [44, 44], iconAnchor: [22, 22], className: ''
  });
  L.marker([SLAT, SLNG], { icon: cromoIcon }).addTo(leafMap)
   .bindPopup(`<b>${SNAME}</b>`);

  // Collect zone circle
  L.circle([SLAT, SLNG], {
    radius: SDIST, color: '#6633cc', fillColor: '#6633cc',
    fillOpacity: .12, weight: 2, dashArray: '6,4'
  }).addTo(leafMap);

  leafMap.setView([SLAT, SLNG], 17);

  // User marker
  const userIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;
      background:#00a9bd;border:2px solid #fff;
      box-shadow:0 0 0 6px rgba(0,169,189,.25)"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7], className: ''
  });
  let userMarker = null;

  // ── Proximity UI helpers ─────────────────────────────────────────────────
  const ring     = el.querySelector('#prox-ring');
  const bar      = el.querySelector('#prox-bar');
  const icon     = el.querySelector('#prox-icon');
  const title    = el.querySelector('#prox-title');
  const sub      = el.querySelector('#prox-sub');
  const pill     = el.querySelector('#find-dist-pill');
  const pillTxt  = el.querySelector('#find-dist-text');
  const arBtn    = el.querySelector('#find-ar-btn');
  let unlocked   = false;

  function updateProximity(dist) {
    const distStr = dist < 1000
      ? `${Math.round(dist)} m`
      : `${(dist / 1000).toFixed(1)} km`;

    pillTxt.textContent = `📍 ${distStr}`;

    // Progress: 0% when far (500m+), 100% when at SDIST
    const maxDist = Math.max(dist, SDIST);
    const far = 500;
    const pct = Math.max(0, Math.min(1, (far - dist) / (far - SDIST)));

    // Ring stroke
    ring.style.strokeDashoffset = CIRC * (1 - pct);
    bar.style.width = `${pct * 100}%`;

    if (dist <= SDIST) {
      // UNLOCKED
      if (!unlocked) {
        unlocked = true;
        ring.style.stroke = '#00a83c';
        icon.textContent = '✅';
        title.textContent = '¡Estás en el lugar!';
        title.style.color = '#00ff88';
        sub.textContent = 'Pulsa el botón para abrir la cámara AR';
        pill.classList.add('near');
        // Unlock button
        arBtn.disabled = false;
        arBtn.style.opacity = '1';
        arBtn.style.cursor = 'pointer';
        arBtn.textContent = '📷 Escanear cromo';
        // Vibrate if supported
        navigator.vibrate?.([100, 50, 100, 50, 200]);
      }
    } else {
      if (unlocked) {
        unlocked = false;
        ring.style.stroke = '#6633cc';
        icon.textContent = '🔒';
        title.style.color = '#fff';
        arBtn.disabled = true;
        arBtn.style.opacity = '.4';
        arBtn.style.cursor = 'not-allowed';
        arBtn.textContent = '🔒 Acércate más';
        pill.classList.remove('near');
      }

      // Color ring by proximity
      const hue = Math.round(pct * 120); // 0=red, 120=green
      ring.style.stroke = `hsl(${hue + 280},70%,60%)`; // purple→cyan→green

      if (dist > 200) {
        title.textContent = `A ${distStr} del cromo`;
        sub.textContent = 'Sigue caminando hacia el pin del mapa';
      } else if (dist > 50) {
        title.textContent = `¡Casi! ${distStr}`;
        sub.textContent = 'Estás cerca, sigue acercándote';
        title.style.color = '#f07800';
      } else {
        title.textContent = `Muy cerca — ${distStr}`;
        sub.textContent = `Necesitas estar a menos de ${SDIST}m`;
        title.style.color = '#fbbf24';
      }
    }
  }

  // ── GPS ───────────────────────────────────────────────────────────────────
  let userLat = null, userLng = null;

  function onPosition(pos) {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;

    if (userMarker) userMarker.setLatLng([userLat, userLng]);
    else userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(leafMap);

    const dist = haversine(userLat, userLng, SLAT, SLNG);
    updateProximity(dist);

    // Fit both points
    const bounds = L.latLngBounds([[userLat, userLng], [SLAT, SLNG]]);
    leafMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });

    if (arCameraOpen) updateARView(dist);
  }

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(onPosition,
      err => {
        title.textContent = 'GPS no disponible';
        sub.textContent = err.code === 1
          ? 'Permite el acceso a la ubicación en el navegador'
          : 'No se pudo obtener tu ubicación';
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  } else {
    title.textContent = 'GPS no soportado';
  }

  // ── Navigate ──────────────────────────────────────────────────────────────
  el.querySelector('#find-nav-btn').addEventListener('click', () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${SLAT},${SLNG}`, '_blank');
  });

  // ── AR camera ─────────────────────────────────────────────────────────────
  let arCameraOpen = false, arStream = null, arHeading = null;
  const camOverlay     = el.querySelector('#ar-cam');
  const arCromoWrap    = el.querySelector('#ar-cromo-wrap');
  const arCompassWrap  = el.querySelector('#ar-compass-wrap');
  const arCompassArrow = el.querySelector('#ar-compass-arrow');
  const collectBtn     = el.querySelector('#ar-collect-btn');

  arBtn.addEventListener('click', () => { if (!arBtn.disabled) openAR(); });
  el.querySelector('#ar-cam-close').addEventListener('click', closeAR);

  const mapWrap = el.querySelector('.ar-map-wrap');

  async function openAR() {
    camOverlay.classList.add('show');
    mapWrap.style.visibility = 'hidden';
    arCameraOpen = true;

    // Show cromo centered immediately — compass will reposition it if available
    arCromoWrap.style.left      = `${window.innerWidth / 2}px`;
    arCromoWrap.style.top       = `${window.innerHeight / 2}px`;
    arCromoWrap.style.transform = 'translate(-50%,-50%) scale(1)';
    arCromoWrap.style.display   = 'block';
    arCompassWrap.style.display = 'none';

    // Show collect button if already close enough
    if (userLat !== null) {
      const d = haversine(userLat, userLng, SLAT, SLNG);
      collectBtn.style.display = d <= SDIST * 2 ? 'block' : 'none';
    }

    try {
      arStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'environment' } }, audio: false
      });
      el.querySelector('#ar-video').srcObject = arStream;
    } catch {
      try {
        arStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        el.querySelector('#ar-video').srcObject = arStream;
      } catch (e) { console.warn('Camera error', e); }
    }
    startCompass();
  }

  function closeAR() {
    stopCamera();
    camOverlay.classList.remove('show');
    mapWrap.style.visibility = '';
    arCameraOpen = false;
  }

  function stopCamera() {
    arStream?.getTracks().forEach(t => t.stop());
    arStream = null;
  }

  function startCompass() {
    const handler = e => {
      if (e.webkitCompassHeading != null) arHeading = e.webkitCompassHeading;
      else if (e.alpha != null) arHeading = (360 - e.alpha) % 360;
      if (userLat !== null) updateARView(haversine(userLat, userLng, SLAT, SLNG));
    };
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(s => { if (s === 'granted') window.addEventListener('deviceorientationabsolute', handler, true); });
    } else {
      window.addEventListener('deviceorientationabsolute', handler, true);
      window.addEventListener('deviceorientation', handler, true);
    }
  }

  const FOV = 62;
  function updateARView(dist) {
    collectBtn.style.display = dist <= SDIST * 2 ? 'block' : 'none';

    // Without compass, cromo stays centered (already placed in openAR)
    if (arHeading === null || userLat === null) return;

    const bear = bearingTo(userLat, userLng, SLAT, SLNG);
    const diff = angleDiff(bear, arHeading);

    if (Math.abs(diff) < FOV / 2) {
      const x = window.innerWidth  / 2 + (diff / (FOV / 2)) * (window.innerWidth / 2);
      const y = window.innerHeight / 2;
      const scale = Math.min(1.6, Math.max(0.3, 25 / Math.max(dist, 5)));
      arCromoWrap.style.left      = `${x}px`;
      arCromoWrap.style.top       = `${y}px`;
      arCromoWrap.style.transform = `translate(-50%,-50%) scale(${scale})`;
      arCromoWrap.style.display   = 'block';
      arCompassWrap.style.display = 'none';
    } else {
      arCromoWrap.style.display   = 'none';
      arCompassWrap.style.display = 'flex';
      arCompassArrow.style.transform = `rotate(${diff}deg)`;
    }
  }

  collectBtn.addEventListener('click', () => {
    collectBtn.style.display = 'none';
    el.querySelector('#ar-celebration').classList.add('show');
  });

  // Green button: save to pending and close camera
  el.querySelector('#ar-cel-grab-btn').addEventListener('click', () => {
    if (SCOUNTRY && SSLOT >= 0) {
      collectionStore.savePendingPack([{ countryId: SCOUNTRY, slotIndex: SSLOT }]);
    }
    stopCamera();
    el.remove();
    refreshStickerTray();
    router.navigate('/');
  });

  // Secondary button: go to album (without saving to pending again)
  el.querySelector('#ar-cel-btn').addEventListener('click', () => {
    stopCamera();
    el.remove();
    router.navigate('/');
  });
}
