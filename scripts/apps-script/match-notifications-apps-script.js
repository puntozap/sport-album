/**
 * NOTIFICACIONES DE PARTIDOS — Apps Script
 * ═══════════════════════════════════════════════════════════════
 *
 * Envía push automáticos 30 minutos antes de cada partido del Mundial 2026.
 * También envía un resumen a las 8:00 AM ET en días de partido.
 *
 * INSTALACIÓN (solo una vez):
 * ─────────────────────────────────────────────────────────────
 * 1. Pega este código en el mismo Apps Script que el Blog.
 * 2. Ejecuta instalarTriggerPartidos() UNA SOLA VEZ:
 *    Ejecutar → instalarTriggerPartidos
 * 3. Acepta los permisos de Google.
 *
 * HOJA "Partidos" (opcional — para marcar los que ya se notificaron):
 * ─────────────────────────────────────────────────────────────
 * | ID | Fecha | HoraET | Local | Visitante | Previo | Resumen |
 *
 *   Si la hoja no existe, el script la crea automáticamente.
 *   Previo  → TRUE cuando ya se envió el push de "30 min para el partido"
 *   Resumen → TRUE cuando ya se incluyó en el resumen del día
 *
 * DÓNDE VER LOS LOGS:
 *   Apps Script → Ejecuciones → clic en cualquier fila → Ver registros
 */

// ── Credenciales OneSignal ────────────────────────────────────────────────────
const OS_APP_ID  = '9e0cfb0b-799a-43ec-81c8-f15fae46a98b';
const OS_API_KEY = 'os_v2_app_tygpwc3ztjb6zaoi6fp24rvjrp3c2m3gpareavfqk2fjjzvjq2efxykz2kugsqzq5uhgpmakxwicgw6fjqx6hpzuhvvaciajbxf4eci';
const ALBUM_URL  = 'https://sportalbum.chanzia.com';

// Partidos del Mundial 2026 — Fase de Grupos (ET = UTC-5)
// Formato: [id, fecha YYYY-MM-DD, horaET HH:MM, local, visitante]
const MATCHES = [
  [1,'2026-06-11','15:00','Mexico','South Africa'],
  [2,'2026-06-11','18:00','USA','New Zealand'],
  [3,'2026-06-11','21:00','Canada','Honduras'],
  [4,'2026-06-12','12:00','Argentina','Ivory Coast'],
  [5,'2026-06-12','15:00','Spain','DR Congo'],
  [6,'2026-06-12','18:00','Germany','Indonesia'],
  [7,'2026-06-12','21:00','Portugal','Kenya'],
  [8,'2026-06-13','12:00','France','Saudi Arabia'],
  [9,'2026-06-13','15:00','Brazil','Ecuador'],
  [10,'2026-06-13','18:00','England','Serbia'],
  [11,'2026-06-13','21:00','Netherlands','Senegal'],
  [12,'2026-06-14','12:00','Colombia','Bulgaria'],
  [13,'2026-06-14','15:00','Japan','Cameroon'],
  [14,'2026-06-14','18:00','Morocco','South Korea'],
  [15,'2026-06-14','21:00','Egypt','Australia'],
  [16,'2026-06-15','12:00','Uruguay','Czech Republic'],
  [17,'2026-06-15','15:00','Belgium','Slovakia'],
  [18,'2026-06-15','18:00','Switzerland','Qatar'],
  [19,'2026-06-15','21:00','Croatia','Albania'],
  [20,'2026-06-16','12:00','Turkey','Chile'],
  [21,'2026-06-16','15:00','Austria','Venezuela'],
  [22,'2026-06-16','18:00','Denmark','Guatemala'],
  [23,'2026-06-16','21:00','Mexico','Jamaica'],
  [24,'2026-06-17','12:00','USA','Panama'],
  [25,'2026-06-17','15:00','Canada','Bolivia'],
  [26,'2026-06-17','18:00','Argentina','Romania'],
  [27,'2026-06-17','21:00','Spain','Thailand'],
  [28,'2026-06-18','12:00','Germany','Greece'],
  [29,'2026-06-18','15:00','Portugal','Costa Rica'],
  [30,'2026-06-18','18:00','France','Nigeria'],
  [31,'2026-06-18','21:00','Brazil','Costa Rica'],
  [32,'2026-06-19','12:00','England','El Salvador'],
  [33,'2026-06-19','15:00','Netherlands','Togo'],
  [34,'2026-06-19','18:00','Colombia','Peru'],
  [35,'2026-06-19','21:00','Japan','Malaysia'],
  [36,'2026-06-20','12:00','Morocco','Nicaragua'],
  [37,'2026-06-20','15:00','Egypt','Ireland'],
  [38,'2026-06-20','18:00','Uruguay','Paraguay'],
  [39,'2026-06-20','21:00','Belgium','Wales'],
  [40,'2026-06-21','12:00','Switzerland','Tanzania'],
  [41,'2026-06-21','15:00','Croatia','Nigeria'],
  [42,'2026-06-21','18:00','Turkey','Cuba'],
  [43,'2026-06-21','21:00','Austria','OFC1'],
  [44,'2026-06-22','12:00','Denmark','Uzbekistan'],
  [45,'2026-06-22','15:00','South Africa','New Zealand'],
  [46,'2026-06-22','18:00','Honduras','Jamaica'],
  [47,'2026-06-22','21:00','Ivory Coast','Romania'],
  [48,'2026-06-23','12:00','DR Congo','Thailand'],
  [49,'2026-06-23','15:00','Indonesia','Greece'],
  [50,'2026-06-23','18:00','Kenya','Costa Rica'],
  [51,'2026-06-23','21:00','Saudi Arabia','Nigeria'],
  [52,'2026-06-24','12:00','Ecuador','Costa Rica'],
  [53,'2026-06-24','15:00','Serbia','El Salvador'],
  [54,'2026-06-24','18:00','Senegal','Togo'],
  [55,'2026-06-24','21:00','Bulgaria','Peru'],
  [56,'2026-06-25','12:00','Cameroon','Malaysia'],
  [57,'2026-06-25','15:00','South Korea','Nicaragua'],
  [58,'2026-06-25','18:00','Australia','Ireland'],
  [59,'2026-06-25','21:00','Czech Republic','Paraguay'],
  [60,'2026-06-26','12:00','Slovakia','Wales'],
  [61,'2026-06-26','15:00','Qatar','Tanzania'],
  [62,'2026-06-26','18:00','Albania','Nigeria'],
  [63,'2026-06-26','21:00','Chile','Cuba'],
  [64,'2026-06-27','12:00','Venezuela','OFC1'],
  [65,'2026-06-27','15:00','Guatemala','Uzbekistan'],
  [66,'2026-06-27','18:00','Mexico','South Africa'],
  [67,'2026-06-27','21:00','USA','Honduras'],
  [68,'2026-06-28','12:00','New Zealand','Jamaica'],
  [69,'2026-06-28','15:00','Canada','Panama'],
  [70,'2026-06-28','18:00','Bolivia','Bolivia'],
  [71,'2026-06-28','21:00','Argentina','Ivory Coast'],
  [72,'2026-06-28','21:00','Romania','Thailand'],
];

const PARTIDOS_SHEET = 'Partidos';
const MINUTOS_PREVIO = 30; // minutos antes del partido para enviar el push

// ── Instalación del trigger de tiempo ────────────────────────────────────────

/**
 * Ejecuta UNA SOLA VEZ: Ejecutar → instalarTriggerPartidos
 * Crea un trigger que corre cada 30 minutos para verificar partidos próximos.
 */
function instalarTriggerPartidos() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'verificarPartidos') ScriptApp.deleteTrigger(t);
    if (t.getHandlerFunction() === 'resumenDiario') ScriptApp.deleteTrigger(t);
  });

  // Trigger cada 30 minutos para notificar antes del partido
  ScriptApp.newTrigger('verificarPartidos')
    .timeBased()
    .everyMinutes(30)
    .create();

  // Trigger diario a las 8 AM ET para el resumen del día
  ScriptApp.newTrigger('resumenDiario')
    .timeBased()
    .atHour(13) // 13:00 UTC = 8:00 AM ET (UTC-5)
    .everyDays(1)
    .create();

  _asegurarHojaPartidos();
  Logger.log('Triggers de partidos instalados correctamente.');
}

// ── Verificación de partidos próximos (cada 30 min) ──────────────────────────

function verificarPartidos() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getSheetByName(PARTIDOS_SHEET) || _asegurarHojaPartidos();
  const estado = _cargarEstado(sheet);

  const ahora   = new Date();
  const limite  = new Date(ahora.getTime() + (MINUTOS_PREVIO + 30) * 60 * 1000);

  MATCHES.forEach(([id, fecha, horaET, local, visitante]) => {
    const inicio = new Date(`${fecha}T${horaET}:00-05:00`);
    const minRestantes = (inicio - ahora) / 60000;

    // Ventana: entre MINUTOS_PREVIO+30 y MINUTOS_PREVIO antes del partido
    if (minRestantes > MINUTOS_PREVIO + 30 || minRestantes < MINUTOS_PREVIO - 5) return;

    const key = `previo_${id}`;
    if (estado[key]) return; // ya notificado

    const heading  = `⚽ ¡En ${MINUTOS_PREVIO} min! ${local} vs ${visitante}`;
    const contents = `🕐 ${horaET} ET · 📺 Paramount+ · ¡Que empiece el partido!`;

    _enviarPush(heading, contents);
    _marcarEstado(sheet, estado, key, id, 'previo');
    Logger.log(`Push partido ${id} enviado: ${heading}`);
  });
}

// ── Resumen diario (8 AM ET) ─────────────────────────────────────────────────

function resumenDiario() {
  const hoy = _fechaHoyET();
  const partidos = MATCHES.filter(([, fecha]) => fecha === hoy);
  if (!partidos.length) return;

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PARTIDOS_SHEET) || _asegurarHojaPartidos();
  const estado = _cargarEstado(sheet);

  const key = `resumen_${hoy}`;
  if (estado[key]) return;

  const cantidad = partidos.length;
  const heading  = `⚽ ¡Hoy hay ${cantidad} partido${cantidad > 1 ? 's' : ''} del Mundial!`;

  const lineas = partidos.slice(0, 3).map(([, , horaET, local, visitante]) =>
    `${local} vs ${visitante} (${horaET} ET)`
  );
  if (partidos.length > 3) lineas.push(`+${partidos.length - 3} más`);
  const contents = lineas.join(' · ') + ' · 📺 Paramount+';

  _enviarPush(heading, contents);
  _marcarEstado(sheet, estado, key, null, 'resumen');
  Logger.log(`Resumen diario enviado: ${heading}`);
}

// ── OneSignal ────────────────────────────────────────────────────────────────

function _enviarPush(heading, contents) {
  const payload = {
    app_id:            OS_APP_ID,
    included_segments: ['All'],
    headings:          { en: heading, es: heading },
    contents:          { en: contents, es: contents },
    url:               ALBUM_URL,
  };
  const options = {
    method:      'post',
    contentType: 'application/json',
    headers:     { Authorization: 'Key ' + OS_API_KEY },
    payload:     JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  const res = UrlFetchApp.fetch('https://onesignal.com/api/v1/notifications', options);
  Logger.log('OneSignal: ' + res.getContentText());
}

// ── Helpers de estado ────────────────────────────────────────────────────────

function _asegurarHojaPartidos() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(PARTIDOS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PARTIDOS_SHEET);
    sheet.appendRow(['Key', 'MatchID', 'Tipo', 'FechaEnvio']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _cargarEstado(sheet) {
  const rows  = sheet.getDataRange().getValues();
  const estado = {};
  rows.slice(1).forEach(row => { if (row[0]) estado[String(row[0])] = true; });
  return estado;
}

function _marcarEstado(sheet, estado, key, matchId, tipo) {
  if (estado[key]) return;
  estado[key] = true;
  sheet.appendRow([key, matchId || '', tipo, new Date().toISOString()]);
}

function _fechaHoyET() {
  const now = new Date();
  const et  = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return et.toISOString().slice(0, 10);
}
