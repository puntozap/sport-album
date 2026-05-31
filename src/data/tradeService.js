/**
 * Servicio que conecta con el Apps Script de intercambio de cromos.
 * Configura APPS_SCRIPT_URL tras desplegar el script en Google Sheets.
 */

const APPS_SCRIPT_URL = localStorage.getItem('trade_api_url') ||
  'https://script.google.com/macros/s/AKfycby3bnn3fKccrPithMpDtuRN0tJa-69rbDtB6EOLAUXt0zr2hvfEExSrnDH3w_GMWHj8qA/exec';

// URL del mercado público de intercambios (Sheet separado)
const MARKET_URL = 'https://script.google.com/macros/s/AKfycbyms3u3G2BeJt6HBxcuBZOZWvB8xP6-YgtoMh-9dGkmD5Vl8_qY2bELeH8MQwrlVgk/exec';

// Google Apps Script redirige los POST y genera errores CORS.
// Usamos siempre GET con los datos en la URL para evitarlo.
function call(params) {
  if (!APPS_SCRIPT_URL) return Promise.reject(new Error('Apps Script URL no configurada'));
  const url = APPS_SCRIPT_URL + '?' + new URLSearchParams(params).toString();
  return fetch(url, { redirect: 'follow' }).then(r => r.json());
}

function callMarket(params) {
  const url = MARKET_URL + '?' + new URLSearchParams(params).toString();
  return fetch(url, { redirect: 'follow' }).then(r => r.json());
}

export const tradeService = {
  isConfigured() {
    return !!APPS_SCRIPT_URL;
  },

  setUrl(url) {
    localStorage.setItem('trade_api_url', url);
    location.reload();
  },

  // Envía solicitud de intercambio
  // ofrece/busca: [{ countryId, slotIndex }]
  submit({ nombre, telefono, ofrece, busca }) {
    const appUrl  = window.location.origin + window.location.pathname;
    const playerId = localStorage.getItem('onesignal_player_id') || '';
    return call({ action: 'submit', data: JSON.stringify({ nombre, telefono, ofrece, busca, appUrl, playerId }) });
  },

  // Consulta el estado de un intercambio por ID
  status(id) {
    return call({ action: 'status', id });
  },

  // Lista todos los intercambios activos (pendiente)
  list() {
    return call({ action: 'list' });
  },

  // ── Mercado público (Sheet separado) ───────────────────────
  marketList() {
    return callMarket({ action: 'list' });
  },

  marketSubmit({ nombre, telefono, ofrece, busca, ubicacion }) {
    const appUrl = window.location.origin + window.location.pathname;
    const data = { nombre, telefono, ofrece, busca, appUrl };
    if (ubicacion) {
      data.ubicacion = ubicacion;
      if (ubicacion.ciudad) data.ciudad = ubicacion.ciudad;
    }
    return callMarket({ action: 'submit', data: JSON.stringify(data) });
  },

  // Acepta el intercambio (tú confirmas)
  accept(id) {
    return call({ action: 'accept', id });
  }
};
