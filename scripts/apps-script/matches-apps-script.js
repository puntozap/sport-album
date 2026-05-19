/**
 * Google Apps Script — Resultados de partidos WC2026
 * Reemplaza el workflow de n8n.
 *
 * INSTALACIÓN:
 * 1. Abre el Google Sheet → Extensiones → Apps Script
 * 2. Pega este código
 * 3. Guarda (Ctrl+S)
 * 4. Ejecuta `instalarTrigger` UNA VEZ manualmente (botón ▶)
 *    (esto crea el trigger onEdit automático)
 * 5. Autoriza los permisos cuando te lo pida
 *
 * DESDE ESE MOMENTO:
 * Cada vez que edites home_score, away_score o status en la hoja
 * "Partidos", el servidor se actualiza automáticamente.
 */

const SERVER_URL   = 'https://albumfifa2026.chanzia.com/api/manage-matches';
const UPLOAD_TOKEN = 'xK9#mP2$qR7nL4vT8wY1';
const SHEET_NAME   = 'Partidos';

// ── Trigger: se ejecuta al editar cualquier celda ────────────────────────────

function onSheetEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  // Leer cabeceras para saber qué columna es cada campo
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col     = (name) => headers.indexOf(name); // índice 0-based

  const COL_ID    = col('match_id');
  const COL_HOME  = col('home_score');
  const COL_AWAY  = col('away_score');
  const COL_STATUS = col('status');

  if (COL_ID < 0 || COL_HOME < 0 || COL_AWAY < 0) {
    Logger.log('Columnas no encontradas — verifica los nombres en la hoja');
    return;
  }

  // Fila editada (e.range puede ser varias celdas; tomamos la primera fila)
  const row     = e.range.getRow();
  if (row < 2) return; // ignorar la cabecera

  const rowData  = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const matchId  = rowData[COL_ID];
  const homeScore = rowData[COL_HOME];
  const awayScore = rowData[COL_AWAY];
  const status    = rowData[COL_STATUS];

  if (!matchId) return;

  const id = String(matchId).replace(/\.0$/, '');
  const homeEmpty = homeScore === '' || homeScore === null;
  const awayEmpty = awayScore === '' || awayScore === null;

  // Si borraron los marcadores → resetear en el servidor y limpiar status en el Sheet
  if (homeEmpty || awayEmpty) {
    resetarPartido(id);
    // Actualizar la celda status a "pending" automáticamente
    if (COL_STATUS >= 0) {
      sheet.getRange(row, COL_STATUS + 1).setValue('pending');
    }
    return;
  }

  // Si los marcadores no son numéricos → ignorar
  if (isNaN(Number(homeScore)) || isNaN(Number(awayScore))) {
    Logger.log(`Fila ${row}: valor no numérico, se omite`);
    return;
  }

  const match = {
    match_id:   id,
    home_score: Number(homeScore),
    away_score: Number(awayScore),
    status:     (status && status !== 'pending') ? status : 'played'
  };

  enviarAlServidor([match]);
}

// ── Sincronización completa (ejecutar manualmente cuando quieras) ─────────────

function sincronizarTodo() {
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) { Logger.log('Hoja "Partidos" no encontrada'); return; }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];

  const idx = (name) => headers.indexOf(name);
  const COL_ID     = idx('match_id');
  const COL_HOME   = idx('home_score');
  const COL_AWAY   = idx('away_score');
  const COL_STATUS = idx('status');

  const matches = [];

  for (let i = 1; i < data.length; i++) {
    const row       = data[i];
    const matchId   = row[COL_ID];
    const homeScore = row[COL_HOME];
    const awayScore = row[COL_AWAY];
    const status    = row[COL_STATUS];

    if (!matchId || homeScore === '' || awayScore === '' ||
        isNaN(Number(homeScore)) || isNaN(Number(awayScore))) continue;

    matches.push({
      match_id:   String(matchId).replace(/\.0$/, ''),
      home_score: Number(homeScore),
      away_score: Number(awayScore),
      status:     (status && status !== 'pending') ? status : 'played'
    });
  }

  if (matches.length === 0) {
    Logger.log('No hay partidos con marcadores para sincronizar');
    return;
  }

  Logger.log(`Sincronizando ${matches.length} partidos…`);
  enviarAlServidor(matches);
}

// ── HTTP POST al servidor ─────────────────────────────────────────────────────

function enviarAlServidor(matches) {
  const payload = {
    action:  'set-matches',
    matches: JSON.stringify(matches)
  };

  const options = {
    method:             'POST',
    contentType:        'application/x-www-form-urlencoded',
    payload:            payload,
    headers:            { 'X-Upload-Token': UPLOAD_TOKEN },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(SERVER_URL, options);
    const code     = response.getResponseCode();
    const body     = response.getContentText();
    Logger.log(`Respuesta ${code}: ${body}`);

    if (code !== 200) {
      Logger.log('⚠️ Error al actualizar el servidor');
    } else {
      Logger.log(`✅ ${matches.length} partido(s) actualizado(s)`);
    }
  } catch (err) {
    Logger.log(`❌ Error de conexión: ${err.message}`);
  }
}

// ── Resetear un partido (borrar su resultado del servidor) ────────────────────

function resetarPartido(matchId) {
  const options = {
    method:             'POST',
    contentType:        'application/x-www-form-urlencoded',
    payload:            { action: 'reset-match', match_id: matchId },
    headers:            { 'X-Upload-Token': UPLOAD_TOKEN },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(SERVER_URL, options);
    Logger.log(`Reset partido ${matchId} → ${response.getResponseCode()}: ${response.getContentText()}`);
  } catch (err) {
    Logger.log(`❌ Error reseteando partido ${matchId}: ${err.message}`);
  }
}

// ── Instalar trigger (ejecutar UNA VEZ manualmente) ──────────────────────────

function instalarTrigger() {
  // Eliminar triggers anteriores para evitar duplicados
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onSheetEdit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  Logger.log('✅ Trigger instalado. Cada edición en "Partidos" actualizará el servidor.');
}
