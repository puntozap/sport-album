import { getAllMatches } from '../data/matchesData.js';
import teamsData from '../data/teamsData.json';

// name → ISO flag code
const flagByName = {};
teamsData.teams.forEach(t => { flagByName[t.name] = t.flag; });


const PARAMOUNT_URL = 'https://www.paramountplus.com';
const VISTREA_WA    = '584121844455';

// ─── PEGA AQUÍ la URL de tu Apps Script una vez que lo publiques ────────────
// Instrucciones: scripts/apps-script/paramount-prices-apps-script.js
const PRICES_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxL34t1jCMcOAQn3JMBENajGOLTnRQMv0PoxOPqKCZBZnxn89F2bjzmGhJGonBCc8jWgw/exec';
// ────────────────────────────────────────────────────────────────────────────

// Precios de respaldo si el sheet no está configurado o falla la red
const FALLBACK_PLANS = [
  { name: 'Esencial',  usd: 7.99,  bs: 38, description: '1 pantalla · Full HD · Sin descargas' },
  { name: 'Showtime',  usd: 12.99, bs: 62, description: '3 pantallas · 4K · Con descargas' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function flagImg(name) {
  const code = flagByName[name];
  if (!code) return '<span class="pp-flag-placeholder">🏳</span>';
  return `<img class="pp-flag" src="https://flagcdn.com/w40/${code}.png" alt="${name}" loading="lazy">`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

async function fetchPrices() {
  if (!PRICES_ENDPOINT) return FALLBACK_PLANS;
  try {
    const r = await fetch(PRICES_ENDPOINT, { cache: 'no-store' });
    if (!r.ok) return FALLBACK_PLANS;
    const data = await r.json();
    return Array.isArray(data.plans) && data.plans.length ? data.plans : FALLBACK_PLANS;
  } catch {
    return FALLBACK_PLANS;
  }
}

// ── Builders de contenido ────────────────────────────────────────────────────

function buildGroupTab(groupLetter, matches) {
  const groupMatches = matches.filter(m => m.stage === 'group' && m.group === groupLetter);
  if (!groupMatches.length) return '';

  const rows = groupMatches.map(m => `
    <div class="pp-match-row">
      <div class="pp-match-date">${formatDate(m.date)}<span class="pp-match-time">${m.timeET} ET</span></div>
      <div class="pp-match-teams">
        <div class="pp-team">
          ${flagImg(m.home)}
          <span class="pp-team-name">${m.home}</span>
        </div>
        <span class="pp-match-vs">vs</span>
        <div class="pp-team pp-team--away">
          <span class="pp-team-name">${m.away}</span>
          ${flagImg(m.away)}
        </div>
      </div>
      <div class="pp-match-venue">${m.stadium}, ${m.city}</div>
    </div>
  `).join('');

  return `<div class="pp-group-section" data-group="${groupLetter}">${rows}</div>`;
}


function buildPlanCard(plan) {
  const waMsg = encodeURIComponent(
    `¡Hola Vistrea! 👋 Quiero contratar Paramount+ *${plan.name}* por *${plan.bs} Bs* ($${plan.usd}). ¿Cómo procedo?`
  );
  const waLink = `https://wa.me/${VISTREA_WA}?text=${waMsg}`;

  return `
    <div class="vt-plan-card">
      <div class="vt-plan-name">${plan.name}</div>
      <div class="vt-plan-price">
        <span class="vt-price-bs">${plan.bs} Bs</span>
        <span class="vt-price-usd">$${Number(plan.usd).toFixed(2)}</span>
      </div>
      ${plan.description ? `<div class="vt-plan-desc">${plan.description}</div>` : ''}
      <a class="vt-plan-btn" href="${waLink}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Contratar por WhatsApp
      </a>
    </div>
  `;
}

function buildVistreaPanelContent(plans) {
  const waGeneral = `https://wa.me/${VISTREA_WA}?text=${encodeURIComponent('¡Hola Vistrea! 👋 Quiero suscribirme a Paramount+ pagando en bolívares. ¿Cómo funciona?')}`;

  return `
    <!-- Encabezado: 2 opciones -->
    <div class="vt-intro-header">
      <div class="vt-intro-title">2 formas de ver el Mundial</div>
      <div class="vt-intro-sub">Elige la que más te convenga</div>
    </div>

    <!-- Opciones de suscripción -->
    <div class="vt-options-banner">
      <div class="vt-option vt-option--direct">
        <div class="vt-option-num">1</div>
        <div class="vt-option-body">
          <div class="vt-option-title">Compra directo en Paramount+</div>
          <div class="vt-option-desc">Entra a <strong>paramountplus.com</strong>, crea tu cuenta y paga con tarjeta internacional. Cobro mensual automático.</div>
        </div>
        <a class="vt-option-btn vt-option-btn--outline" href="${PARAMOUNT_URL}" target="_blank" rel="noopener noreferrer">Ir →</a>
      </div>
      <div class="vt-options-divider"><span>o</span></div>
      <div class="vt-option vt-option--vistrea">
        <div class="vt-option-num vt-option-num--alt">2</div>
        <div class="vt-option-body">
          <div class="vt-option-title">Compra con Vistrea · Paga en Bs</div>
          <div class="vt-option-desc">Nosotros te damos acceso a Paramount+. Pagas en bolívares, <strong>por mes</strong>, sin tarjeta internacional ni cuenta propia.</div>
        </div>
      </div>
    </div>

    <!-- Branding Vistrea -->
    <div class="vt-brand-header">
      <div class="vt-logo-wrap">
        <div class="vt-logo-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <rect width="40" height="40" rx="10" fill="url(#vt-grad)"/>
            <rect x="8" y="10" width="24" height="16" rx="3" stroke="#fff" stroke-width="2.2" fill="none"/>
            <polyline points="14,14 20,19 26,14" stroke="#0ff" stroke-width="2" fill="none" stroke-linecap="round"/>
            <rect x="15" y="28" width="10" height="3" rx="1.5" fill="#fff" opacity="0.4"/>
            <defs>
              <linearGradient id="vt-grad" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stop-color="#0a0a2e"/>
                <stop offset="100%" stop-color="#1a0040"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <div class="vt-logo-name">VISTREA</div>
          <div class="vt-logo-sub">Tu aliado de streaming en Venezuela</div>
        </div>
      </div>
    </div>

    <!-- Planes -->
    <div class="vt-plans-label">Elige tu plan — precios en Bs</div>
    <div class="vt-plans-grid">
      ${plans.map(buildPlanCard).join('')}
    </div>

    <!-- Cómo funciona -->
    <div class="vt-how">
      <div class="vt-how-title">¿Cómo funciona con Vistrea?</div>
      <div class="vt-how-steps">
        <div class="vt-step"><span class="vt-step-n">1</span><span>Escríbenos y elige tu plan</span></div>
        <div class="vt-step"><span class="vt-step-n">2</span><span>Pagas en bolívares, sin tarjeta</span></div>
        <div class="vt-step"><span class="vt-step-n">3</span><span>Activamos tu cuenta en minutos</span></div>
      </div>
    </div>

    <!-- CTA general -->
    <div class="vt-footer-cta">
      <a class="vt-wa-general" href="${waGeneral}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Contratar con Vistrea por WhatsApp
      </a>
      <div class="vt-footer-note">Precios fijos en Bs · Sin conversión de moneda · Venezuela</div>
    </div>
  `;
}

// ── Modal principal ──────────────────────────────────────────────────────────

export function showParamountModal() {
  const allMatches = getAllMatches();
  const groups     = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  const overlay = document.createElement('div');
  overlay.className = 'pp-overlay';

  overlay.innerHTML = `
    <div class="pp-modal" role="dialog" aria-modal="true" aria-label="Ver partidos en Paramount+">

      <button class="pp-close" aria-label="Cerrar">✕</button>

      <!-- HEADER PARAMOUNT -->
      <div class="pp-header">
        <div class="pp-brand">
          <svg class="pp-star" viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <span class="pp-brand-name">Paramount<sup>+</sup></span>
        </div>
        <div class="pp-headline">104 partidos del Mundial 2026</div>
        <div class="pp-sub">Todos los partidos, en vivo y sin cortes</div>
      </div>

      <!-- TABS -->
      <div class="pp-tabs" role="tablist">
        <button class="pp-tab pp-tab--active" data-tab="grupos" role="tab" aria-selected="true">Fase de Grupos</button>
        <button class="pp-tab pp-tab--vistrea" data-tab="vistrea" role="tab" aria-selected="false">
          📺 Contratar
        </button>
      </div>

      <!-- PANEL GRUPOS -->
      <div class="pp-panel pp-panel--active" data-panel="grupos">
        <div class="pp-group-tabs">
          ${groups.map((g, i) => `
            <button class="pp-gtab${i === 0 ? ' pp-gtab--active' : ''}" data-group="${g}">Grupo ${g}</button>
          `).join('')}
        </div>
        <div class="pp-group-content">
          ${groups.map(g => buildGroupTab(g, allMatches)).join('')}
        </div>
      </div>

      <!-- PANEL VISTREA (se rellena async) -->
      <div class="pp-panel" data-panel="vistrea">
        <div class="vt-loading">
          <div class="vt-spinner"></div>
          <span>Cargando planes...</span>
        </div>
      </div>


    </div>
  `;

  function close() {
    overlay.classList.remove('pp-overlay--active');
    setTimeout(() => overlay.remove(), 280);
  }

  overlay.querySelector('.pp-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });

  // Tabs principales
  overlay.querySelectorAll('.pp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.pp-tab').forEach(t => {
        t.classList.remove('pp-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      overlay.querySelectorAll('.pp-panel').forEach(p => p.classList.remove('pp-panel--active'));
      tab.classList.add('pp-tab--active');
      tab.setAttribute('aria-selected', 'true');
      const panel = overlay.querySelector(`[data-panel="${tab.dataset.tab}"]`);
      panel.classList.add('pp-panel--active');

      // Siempre recarga precios al entrar al tab Contratar
      if (tab.dataset.tab === 'vistrea') {
        panel.innerHTML = `<div class="vt-loading"><div class="vt-spinner"></div><span>Actualizando precios...</span></div>`;
        fetchPrices().then(plans => {
          panel.innerHTML = buildVistreaPanelContent(plans);
        });
      }
    });
  });

  // Sub-tabs de grupos
  function activateGroup(letter) {
    overlay.querySelectorAll('.pp-gtab').forEach(t => t.classList.toggle('pp-gtab--active', t.dataset.group === letter));
    overlay.querySelectorAll('.pp-group-section').forEach(s => {
      s.style.display = s.dataset.group === letter ? '' : 'none';
    });
  }

  overlay.querySelectorAll('.pp-group-section').forEach((s, i) => {
    if (i > 0) s.style.display = 'none';
  });

  overlay.querySelectorAll('.pp-gtab').forEach(tab => {
    tab.addEventListener('click', () => activateGroup(tab.dataset.group));
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('pp-overlay--active')));
}
