const STORAGE_KEY = 'wc2026_ko_results';
const listeners = new Set();

function read() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function write(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function notify() { listeners.forEach(cb => { try { cb(); } catch {} }); }

export const koResultsStore = {
  save(matchId, homeTeam, awayTeam, homeGoals, awayGoals, penWinner = null) {
    const data = read();
    data[String(matchId)] = { homeTeam, awayTeam, homeGoals, awayGoals, penWinner };
    write(data);
    notify();
  },
  get(matchId) { return read()[String(matchId)] || null; },
  getAll() { return read(); },
  remove(matchId) {
    const data = read();
    delete data[String(matchId)];
    write(data);
    notify();
  },
  clear() { localStorage.removeItem(STORAGE_KEY); notify(); },
  subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
};
