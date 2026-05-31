import { getLang } from '../i18n.js';
import { collectionStore } from '../data/collectionStore.js';

const SUBSCRIBED_KEY = 'wc2026_push_subscribed'; // true = ya suscrito, nunca más preguntar

function isAlreadySubscribed() {
  return localStorage.getItem(SUBSCRIBED_KEY) === 'true';
}

function markSubscribed() {
  localStorage.setItem(SUBSCRIBED_KEY, 'true');
}

export function showNoPacksModal() {
  // Si ya está suscrito, nunca mostrar el modal
  if (isAlreadySubscribed()) return;
  if (document.querySelector('.nopacks-overlay')) return;

  const es = getLang() === 'es';

  const overlay = document.createElement('div');
  overlay.className = 'nopacks-overlay';

  overlay.innerHTML = `
    <div class="nopacks-card">
      <div class="nopacks-icon">🎴</div>
      <div class="nopacks-title">${es ? '¡Se acabaron tus sobres!' : 'No more packs!'}</div>
      <div class="nopacks-sub">${es ? '¿Te avisamos cuando abran los próximos en' : 'Want us to notify you when they\'re back in'}</div>
      <div class="nopacks-timer">--:--:--</div>
      <button class="nopacks-btn-notif">
        🔔 ${es ? 'Sí, avisarme' : 'Yes, notify me'}
      </button>
      <button class="nopacks-btn-close">${es ? 'No, gracias' : 'No thanks'}</button>
    </div>
  `;

  const timerEl  = overlay.querySelector('.nopacks-timer');
  const btnNotif = overlay.querySelector('.nopacks-btn-notif');
  const btnClose = overlay.querySelector('.nopacks-btn-close');

  function formatMs(ms) {
    const s  = Math.max(0, Math.floor(ms / 1000));
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  timerEl.textContent = formatMs(collectionStore.msUntilNextPack());
  const tick = setInterval(() => {
    timerEl.textContent = formatMs(collectionStore.msUntilNextPack());
  }, 1000);

  function close() {
    clearInterval(tick);
    overlay.classList.remove('nopacks-overlay--active');
    setTimeout(() => overlay.remove(), 260);
  }

  btnClose.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  btnNotif.addEventListener('click', () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
      OneSignal.User.PushSubscription.optIn();
    });
    markSubscribed();
    btnNotif.textContent = es ? '✅ ¡Listo! Te avisaremos' : '✅ Done! We\'ll notify you';
    btnNotif.disabled = true;
    setTimeout(close, 1600);
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('nopacks-overlay--active')));
}
