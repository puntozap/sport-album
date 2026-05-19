// ── "¿Qué hay de nuevo?" modal ────────────────────────────────────────────────
// Para mostrar algo nuevo: cambia WHATS_NEW_ID (usa la fecha + número)
// y edita WHATS_NEW_ITEMS con las novedades.
// Todos los usuarios verán el modal de nuevo aunque lo hayan cerrado antes.

const WHATS_NEW_ID = '2026-05-19-v1';

const WHATS_NEW_ITEMS = [
  { icon: '🔄', text: 'Intercambio de cromos mejorado — selecciona varios a la vez' },
  { icon: '📱', text: 'Desliza las listas con el dedo en móvil' },
  { icon: '🃏', text: 'Tus cromos repetidos ahora aparecen individualmente' },
  { icon: '🌍', text: 'Nuevo sistema de emparejamiento automático de intercambios' },
];

const STORAGE_KEY = 'wc2026_whats_new_seen';

export function showWhatsNewIfNeeded() {
  if (localStorage.getItem(STORAGE_KEY) === WHATS_NEW_ID) return;
  renderModal();
}

function renderModal() {
  const overlay = document.createElement('div');
  overlay.className = 'wn-overlay';

  overlay.innerHTML = `
    <div class="wn-card">
      <div class="wn-icon">🎉</div>
      <div class="wn-title">¿Qué hay de nuevo?</div>
      <ul class="wn-list">
        ${WHATS_NEW_ITEMS.map(i => `
          <li class="wn-item">
            <span class="wn-item-icon">${i.icon}</span>
            <span class="wn-item-text">${i.text}</span>
          </li>
        `).join('')}
      </ul>
      <button class="wn-btn">¡Entendido!</button>
    </div>
  `;

  function close() {
    localStorage.setItem(STORAGE_KEY, WHATS_NEW_ID);
    overlay.classList.remove('wn-overlay--open');
    setTimeout(() => overlay.remove(), 260);
  }

  overlay.querySelector('.wn-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('wn-overlay--open'));
}
