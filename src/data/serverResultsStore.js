/**
 * Resultados oficiales que vienen del servidor (spreadsheet via n8n).
 * En memoria solamente — se recarga con cada polling.
 * Tienen prioridad sobre resultsStore (simulaciones del usuario).
 */

const listeners = new Set();
let store = {};

function notify() {
  listeners.forEach(cb => { try { cb(); } catch {} });
}

export const serverResultsStore = {
  setAll(data) {
    store = { ...data };
    notify();
  },

  get(matchId) {
    return store[String(matchId)] || null;
  },

  getAll() {
    return { ...store };
  },

  subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }
};

/**
 * Fusiona resultados: el oficial tiene prioridad sobre la simulación del usuario.
 * @param {Object} serverResults  - serverResultsStore.getAll()
 * @param {Object} userResults    - resultsStore.getAll()
 * @returns {Object} resultado combinado en formato { matchId: { homeGoals, awayGoals } }
 */
export function mergeResults(serverResults, userResults) {
  const merged = {};
  // Primero las simulaciones del usuario
  Object.entries(userResults).forEach(([id, r]) => {
    merged[id] = { homeGoals: r.homeGoals, awayGoals: r.awayGoals };
  });
  // Los oficiales sobreescriben
  Object.entries(serverResults).forEach(([id, r]) => {
    merged[id] = { homeGoals: r.homeGoals, awayGoals: r.awayGoals };
  });
  return merged;
}
