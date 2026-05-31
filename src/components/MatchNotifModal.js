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
  const today    = todayET();
  const tomorrow = tomorrowET();
  const all      = getAllMatches().filter(m => m.date === today || m.date === tomorrow);
  // Ordenar por fecha y hora
  return all.sort((a, b) => {
    const da = new Date(`${a.date}T${a.timeET}:00-05:00`);
    const db = new Date(`${b.date}T${b.timeET}:00-05:00`);
    return da - db;
  });
}

function formatMatchTime(match, es) {
  const isToday = match.date === todayET();
  const day  = es ? (isToday ? 'Hoy' : 'Mañana') : (isToday ? 'Today' : 'Tomorrow');
  return `${day} ${match.timeET} ET`;
}

function subscribeOneSignal(btn, es) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function (OneSignal) {
    OneSignal.User.PushSubscription.optIn();
  });
  localStorage.setItem(SUBSCRIBED_KEY, 'true');
  btn.textContent = es ? '✅ ¡Listo! Te avisaremos antes de cada partido' : '✅ Done! We\'ll notify you before each match';
  btn.disabled = true;
}

export function checkMatchNotifModal() {
  const matches = getUpcomingMatches();
  if (!matches.length) return;

  const today    = todayET();
  const tomorrow = tomorrowET();

  // Saber si hay partidos hoy o mañana
  const hasToday    = matches.some(m => m.date === today);
  const hasTomorrow = matches.some(m => m.date === tomorrow);
  const targetDate  = hasToday ? today : tomorrow;

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

  const todayMatches    = matches.filter(m => m.date === today).slice(0, 3);
  const tomorrowMatches = matches.filter(m => m.date !== today).slice(0, 3);

  const headline = hasToday
    ? (es ? '⚽ ¡Hay partidos hoy!' : '⚽ Matches today!')
    : (es ? '⚽ ¡Mañana hay partidos!' : '⚽ Matches tomorrow!');

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
        ${hasTomorrow ? `<div class="mnm-day-label">${es ? 'Hoy' : 'Today'}</div>` : ''}
        <div class="mnm-matches">${renderMatches(todayMatches)}</div>
      ` : ''}

      ${tomorrowMatches.length ? `
        <div class="mnm-day-label">${es ? 'Mañana' : 'Tomorrow'}</div>
        <div class="mnm-matches">${renderMatches(tomorrowMatches)}</div>
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
