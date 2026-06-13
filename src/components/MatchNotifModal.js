import { getLang } from '../i18n.js';
import { getAllMatches } from '../data/matchesData.js';

const ASKED_KEY      = 'wc2026_match_notif_asked'; // valor: fecha YYYY-MM-DD
const SUBSCRIBED_KEY = 'wc2026_push_subscribed';   // compartido con NoPacksModal

function todayET() {
  // Fecha actual en Eastern Time (UTC-5)
  const now = new Date();
  const et  = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return et.toISOString().slice(0, 10);
}

function tomorrowET() {
  const now = new Date();
  const et  = new Date(now.getTime() - 5 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
  return et.toISOString().slice(0, 10);
}

function getUpcomingMatches() {
  const today = todayET();
  // Mostrar el modal si hay partidos en los próximos 7 días
  const limitDate = new Date(new Date().getTime() - 5 * 60 * 60 * 1000 + 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const all = getAllMatches().filter(m => m.date >= today && m.date <= limitDate);
  return all.sort((a, b) => {
    const da = new Date(`${a.date}T${a.timeET}:00-05:00`);
    const db = new Date(`${b.date}T${b.timeET}:00-05:00`);
    return da - db;
  });
}

function formatMatchTime(match, es) {
  const today    = todayET();
  const tomorrow = tomorrowET();
  let day;
  if (match.date === today) {
    day = es ? 'Hoy' : 'Today';
  } else if (match.date === tomorrow) {
    day = es ? 'Mañana' : 'Tomorrow';
  } else {
    // Fecha legible: "11 jun"
    const [, m, d] = match.date.split('-');
    const months = es
      ? ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
      : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    day = `${parseInt(d)} ${months[parseInt(m) - 1]}`;
  }
  return `${day} ${match.timeET} ET`;
}

export function subscribeOneSignal(btn, es) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.User.PushSubscription.optIn();
      if (Notification.permission === 'granted') {
        // Etiquetar con el dominio para poder filtrar al enviar notificaciones
        OneSignal.User.addTag('domain', window.location.hostname);
        localStorage.setItem(SUBSCRIBED_KEY, 'true');
        btn.textContent = es ? '✅ ¡Listo! Te avisaremos antes de cada partido' : '✅ Done! We\'ll notify you before each match';
        btn.disabled = true;
      } else {
        btn.textContent = es ? '⚠️ Permiso denegado en el navegador' : '⚠️ Permission denied in browser';
        setTimeout(() => {
          btn.textContent = es ? '🔔 ¡Sí! Avisarme antes de cada partido' : '🔔 Yes! Notify me before each match';
          btn.disabled = false;
        }, 3000);
      }
    } catch {
      btn.textContent = es ? '❌ Error al activar' : '❌ Activation error';
    }
  });
}

export function checkMatchNotifModal() {
  const matches = getUpcomingMatches();
  if (!matches.length) return;

  const today    = todayET();
  const tomorrow = tomorrowET();

  // Saber si hay partidos hoy, mañana o próximamente
  const hasToday    = matches.some(m => m.date === today);
  const hasTomorrow = matches.some(m => m.date === tomorrow);
  // Usar la fecha del primer partido próximo como target para el cooldown
  const targetDate  = hasToday ? today : (hasTomorrow ? tomorrow : matches[0].date);

  // Si ya está suscrito, nunca más preguntar
  if (localStorage.getItem(SUBSCRIBED_KEY) === 'true') return;

  // Solo preguntar una vez por día de partido
  if (localStorage.getItem(ASKED_KEY) === targetDate) return;

  setTimeout(() => showMatchNotifModal(matches, hasToday, hasTomorrow), 3000);
}

function showMatchNotifModal(matches, hasToday, hasTomorrow) {
  if (document.querySelector('.mnm-overlay')) return;

  const es  = getLang() === 'es';
  const today = todayET();

  const tomorrow2       = tomorrowET();
  const todayMatches    = matches.filter(m => m.date === today).slice(0, 3);
  const tomorrowMatches = matches.filter(m => m.date === tomorrow2).slice(0, 3);
  const soonMatches     = matches.filter(m => m.date !== today && m.date !== tomorrow2).slice(0, 3);

  const headline = hasToday
    ? (es ? '⚽ ¡Hay partidos hoy!' : '⚽ Matches today!')
    : hasTomorrow
      ? (es ? '⚽ ¡Mañana hay partidos!' : '⚽ Matches tomorrow!')
      : (es ? '⚽ ¡El Mundial 2026 está por comenzar!' : '⚽ World Cup 2026 is about to start!');

  const renderMatches = list => list.map(m => `
    <div class="mnm-match">
      <span class="mnm-teams">${m.home} vs ${m.away}</span>
      <span class="mnm-time">${formatMatchTime(m, es)}</span>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'mnm-overlay';
  overlay.innerHTML = `
    <div class="mnm-card">
      <div class="mnm-headline">${headline}</div>

      ${todayMatches.length ? `
        ${(hasTomorrow || soonMatches.length) ? `<div class="mnm-day-label">${es ? 'Hoy' : 'Today'}</div>` : ''}
        <div class="mnm-matches">${renderMatches(todayMatches)}</div>
      ` : ''}

      ${tomorrowMatches.length ? `
        <div class="mnm-day-label">${es ? 'Mañana' : 'Tomorrow'}</div>
        <div class="mnm-matches">${renderMatches(tomorrowMatches)}</div>
      ` : ''}

      ${soonMatches.length ? `
        <div class="mnm-day-label">${es ? 'Próximamente' : 'Coming up'}</div>
        <div class="mnm-matches">${renderMatches(soonMatches)}</div>
      ` : ''}

      <div class="mnm-watch">📺 ${es ? 'Puedes verlos en Paramount+' : 'Watch them on Paramount+'}</div>

      <button class="mnm-btn-yes">
        🔔 ${es ? '¡Sí! Avisarme antes de cada partido' : 'Yes! Notify me before each match'}
      </button>
      <button class="mnm-btn-no">${es ? 'No, gracias' : 'No thanks'}</button>
    </div>
  `;

  const btnYes = overlay.querySelector('.mnm-btn-yes');
  const btnNo  = overlay.querySelector('.mnm-btn-no');
  const today2 = todayET();
  const target = hasToday ? today2 : tomorrowET();

  function close() {
    localStorage.setItem(ASKED_KEY, target);
    overlay.classList.remove('mnm-overlay--active');
    setTimeout(() => overlay.remove(), 260);
  }

  btnYes.addEventListener('click', () => {
    subscribeOneSignal(btnYes, es);
    setTimeout(close, 1800);
  });

  btnNo.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('mnm-overlay--active')));
}
