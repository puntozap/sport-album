/**
 * Almacenamiento de resultados en localStorage.
 * Persiste goles de cada partido y notifica cambios.
 */

const STORAGE_KEY = 'wc2026_results';

const listeners = new Set();

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function notify() {
  listeners.forEach(cb => {
    try { cb(); } catch (e) { /* ignore */ }
  });
}

export const resultsStore = {
  /**
   * Guarda el resultado de un partido.
   * @param {number|string} matchId
   * @param {number} homeGoals
   * @param {number} awayGoals
   */
  save(matchId, homeGoals, awayGoals) {
    const data = readStorage();
    data[String(matchId)] = {
      homeGoals: Number(homeGoals),
      awayGoals: Number(awayGoals),
      savedAt: new Date().toISOString()
    };
    writeStorage(data);
    notify();
  },

  /**
   * Obtiene el resultado de un partido.
   * @param {number|string} matchId
   * @returns {{homeGoals:number, awayGoals:number, savedAt:string}|null}
   */
  get(matchId) {
    const data = readStorage();
    return data[String(matchId)] || null;
  },

  /**
   * Obtiene todos los resultados.
   * @returns {Object} { matchId: { homeGoals, awayGoals, savedAt } }
   */
  getAll() {
    return readStorage();
  },

  /**
   * Elimina un resultado específico.
   */
  remove(matchId) {
    const data = readStorage();
    delete data[String(matchId)];
    writeStorage(data);
    notify();
  },

  /**
   * Limpia todos los resultados.
   */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    notify();
  },

  /**
   * Suscribe un callback a cambios en los resultados.
   * Retorna función para desuscribirse.
   */
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
};
