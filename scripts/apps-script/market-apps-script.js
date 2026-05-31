/**
 * Google Apps Script — Mercado público de cromos WC2026
 * Sheet ID: 1uAahVjhXPptPJW7n1XHVte-iTzCPPLMXmXkLfpVRsgE
 *
 * INSTALACIÓN:
 * 1. Abre el Google Sheet del mercado → Extensiones → Apps Script
 * 2. Pega este código (reemplaza todo)
 * 3. Guarda (Ctrl+S)
 * 4. Desplegar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 5. Copia la URL y ponla en tradeService.js → MARKET_URL
 *
 * Columnas del Sheet (se crean solas la primera vez):
 * A=ID  B=Nombre  C=Telefono  D=Ofrece  E=Busca  F=Estado  G=EmparejadoCon  H=Fecha  I=Ciudad  J=Lat  K=Lng
 */

const SHEET_ID   = '1uAahVjhXPptPJW7n1XHVte-iTzCPPLMXmXkLfpVRsgE';
const SHEET_NAME = 'Mercado';

// ── Entrypoints ──────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const action = e.parameter.action;
    const id     = e.parameter.id;
    let result;
    if      (action === 'list')   result = listTrades();
    else if (action === 'submit') result = submitTrade(JSON.parse(e.parameter.data || '{}'));
    else if (action === 'status') result = getStatus(id);
    else result = { error: 'Acción desconocida' };
    return json(result);
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    const raw  = (e.parameter && e.parameter.data) ? e.parameter.data : e.postData.contents;
    const data = JSON.parse(raw);
    let result;
    if (data.action === 'submit') result = submitTrade(data);
    else result = { error: 'Acción desconocida' };
    return json(result);
  } catch (err) {
    return json({ error: err.message });
  }
}

// ── Acciones ─────────────────────────────────────────────────────────────────

function submitTrade(data) {
  const { nombre, telefono, ofrece, busca, appUrl, ciudad, ubicacion } = data;

  const lat  = (ubicacion && ubicacion.lat)  ? ubicacion.lat  : '';
  const lng  = (ubicacion && ubicacion.lng)  ? ubicacion.lng  : '';
  const city = ciudad || (ubicacion && ubicacion.ciudad) || '';

  const sheet = getSheet();
  const id    = Utilities.getUuid();

  sheet.appendRow([
    id,
    nombre,
    telefono,
    JSON.stringify(ofrece),
    JSON.stringify(busca),
    'pendiente',   // Estado
    '',            // EmparejadoCon
    new Date().toISOString(),
    city,          // Ciudad
    lat,           // Lat
    lng            // Lng
  ]);

  return { success: true, matched: false, id };
}

function listTrades() {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();
  const trades = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[5] !== 'pendiente') continue;
    trades.push({
      id:     row[0],
      nombre: row[1],
      ofrece: safeJson(row[3]),
      busca:  safeJson(row[4]),
      fecha:  row[7],
      ciudad: row[8] || '',
      lat:    row[9] || '',
      lng:    row[10] || ''
    });
  }
  return { trades };
}

function getStatus(id) {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== id) continue;
    return {
      id:     rows[i][0],
      nombre: rows[i][1],
      estado: rows[i][5],
      ofrece: safeJson(rows[i][3]),
      busca:  safeJson(rows[i][4]),
      ciudad: rows[i][8] || '',
      lat:    rows[i][9] || '',
      lng:    rows[i][10] || ''
    };
  }
  return { error: 'No encontrado' };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Nombre', 'Telefono', 'Ofrece', 'Busca', 'Estado', 'EmparejadoCon', 'Fecha', 'Ciudad', 'Lat', 'Lng']);
  }
  return sheet;
}

function safeJson(str) {
  try { return JSON.parse(str); } catch { return []; }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
