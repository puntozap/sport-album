/**
 * BLOG + NOTIFICACIONES — Google Sheets → Apps Script
 * ═══════════════════════════════════════════════════════════════
 *
 * INSTALACIÓN (solo una vez):
 * ─────────────────────────────────────────────────────────────
 * 1. Crea un Google Sheet NUEVO (o usa uno existente).
 * 2. Renombra la primera hoja como exactamente: Blog
 * 3. Abre Extensiones → Apps Script, pega este código y guarda.
 * 4. Implementar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién puede acceder: Cualquier usuario (anónimo)
 * 5. Copia la URL y pégala en src/components/BlogPage.js → BLOG_ENDPOINT
 * 6. Ejecuta instalarTrigger() una sola vez para activar los push automáticos.
 *
 * ══════════════════════════════════════════════════════════════
 * HOJA "Blog" — artículos del blog
 * ──────────────────────────────────────────────────────────────
 * | Titulo | Portada | Contenido | Fecha | Activo | Notificado |
 *
 *   Titulo      → Titular del artículo
 *   Portada     → URL de imagen o ID/URL de YouTube
 *   Contenido   → Cuerpo (ver formato abajo)
 *   Fecha       → YYYY-MM-DD  ej: 2026-06-11
 *   Activo      → TRUE = visible y envía push   FALSE = borrador oculto
 *   Notificado  → se rellena automáticamente (evita reenvíos)
 *
 * FORMATO DEL CONTENIDO:
 *   # Título grande       → H2    ## Título mediano → H3
 *   **texto**             → negrita        *texto* → cursiva
 *   [texto](https://url)  → hipervínculo
 *   URL de YouTube sola   → embed de video
 *   Línea vacía           → nuevo párrafo
 *
 * ══════════════════════════════════════════════════════════════
 * HOJAS DE NOTIFICACIONES LIBRES — crea las que quieras
 * ──────────────────────────────────────────────────────────────
 * Cualquier hoja que NO se llame "Blog" y tenga estas columnas
 * funciona como hoja de notificaciones:
 *
 *   | Titulo | Cuerpo | Activo | Notificado |
 *
 *   Titulo     → Título del push  (aparece en negrita en el móvil)
 *   Cuerpo     → Mensaje del push
 *   Activo     → TRUE → envía el push al instante
 *   Notificado → se rellena automáticamente (evita reenvíos)
 *
 * EJEMPLOS DE HOJAS QUE PUEDES CREAR:
 *   "Cromos"    → avisar cuando hay sobres nuevos
 *   "Sorteos"   → avisar sobre concursos
 *   "Noticias"  → noticias del Mundial en tiempo real
 *   "Ofertas"   → promociones de Paramount / Vistrea
 *   "General"   → cualquier mensaje libre
 *
 * Para enviar: escribe el mensaje en una fila nueva y pon Activo = TRUE.
 * Para imágenes de Google Drive: comparte como "Cualquiera con el enlace":
 *   https://drive.google.com/uc?export=view&id=TU_ID_DE_ARCHIVO
 */

const BLOG_SHEET = 'Blog';

// ── OneSignal ─────────────────────────────────────────────────────────────────
// La REST API Key va SOLO aquí (nunca en el frontend).
const ONESIGNAL_APP_ID  = '9e0cfb0b-799a-43ec-81c8-f15fae46a98b';
const ONESIGNAL_API_KEY = 'os_v2_app_tygpwc3ztjb6zaoi6fp24rvjrp3c2m3gpareavfqk2fjjzvjq2efxykz2kugsqzq5uhgpmakxwicgw6fjqx6hpzuhvvaciajbxf4eci';
const ALBUM_URL         = 'https://sportalbum.chanzia.com';

// ── Trigger ───────────────────────────────────────────────────────────────────

/**
 * Ejecuta esta función UNA SOLA VEZ desde el editor:
 *   Ejecutar → instalarTrigger
 * Activa los push automáticos para Blog y todas las hojas de notificaciones.
 */
function instalarTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onSheetEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  Logger.log('Trigger instalado correctamente.');
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function onSheetEdit(e) {
  try {
    const sheet     = e.range.getSheet();
    const sheetName = sheet.getName();

    if (sheetName === BLOG_SHEET) {
      _handleBlogEdit(e, sheet);
    } else {
      _handleNotifEdit(e, sheet);
    }
  } catch (err) {
    Logger.log('onSheetEdit error: ' + err.message);
  }
}

// ── Blog ──────────────────────────────────────────────────────────────────────

function _handleBlogEdit(e, sheet) {
  const row = e.range.getRow();
  if (row < 2) return;

  const headers = _headers(sheet);
  const col     = name => headers.indexOf(name) + 1;

  const colActivo = col('activo');
  if (colActivo < 1 || e.range.getColumn() !== colActivo) return;

  if (!_esActivo(e.range.getValue())) return;
  if (_yaNotificado(sheet, row, col('notificado'))) return;

  const titulo = col('titulo') > 0 ? String(sheet.getRange(row, col('titulo')).getValue()).trim() : '';
  if (!titulo) return;

  const colPushT   = col('push_titulo');
  const colPushB   = col('push_cuerpo');
  const pushTitulo = colPushT > 0 ? String(sheet.getRange(row, colPushT).getValue()).trim() : '';
  const pushCuerpo = colPushB > 0 ? String(sheet.getRange(row, colPushB).getValue()).trim() : '';

  enviarPush(
    pushTitulo || '📰 Nuevo artículo en el Blog',
    pushCuerpo || titulo
  );

  _marcarNotificado(sheet, row, col('notificado'));
}

// ── Hojas de notificaciones libres ────────────────────────────────────────────

function _handleNotifEdit(e, sheet) {
  const row = e.range.getRow();
  if (row < 2) return;

  const headers = _headers(sheet);
  const col     = name => headers.indexOf(name) + 1;

  // Si la hoja no tiene columna "activo" no es una hoja de notificaciones
  const colActivo = col('activo');
  if (colActivo < 1 || e.range.getColumn() !== colActivo) return;

  if (!_esActivo(e.range.getValue())) return;
  if (_yaNotificado(sheet, row, col('notificado'))) return;

  const colTitulo = col('titulo');
  const colCuerpo = col('cuerpo');
  const heading   = colTitulo > 0 ? String(sheet.getRange(row, colTitulo).getValue()).trim() : '';
  const contents  = colCuerpo > 0 ? String(sheet.getRange(row, colCuerpo).getValue()).trim() : '';

  if (!heading) return;

  enviarPush(heading, contents || '¡Hay novedades en el álbum!');
  _marcarNotificado(sheet, row, col('notificado'));
}

// ── OneSignal ─────────────────────────────────────────────────────────────────

function enviarPush(heading, contents) {
  const payload = {
    app_id:            ONESIGNAL_APP_ID,
    included_segments: ['All'],
    headings:          { en: heading, es: heading },
    contents:          { en: contents, es: contents },
    url:               ALBUM_URL,
  };

  const options = {
    method:      'post',
    contentType: 'application/json',
    headers:     { Authorization: 'Key ' + ONESIGNAL_API_KEY },
    payload:     JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const res = UrlFetchApp.fetch('https://onesignal.com/api/v1/notifications', options);
  Logger.log('OneSignal [' + heading + ']: ' + res.getContentText());
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _headers(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
              .map(h => String(h).trim().toLowerCase());
}

function _esActivo(val) {
  const s = String(val).toUpperCase().trim();
  return val === true || s === 'TRUE' || s === 'VERDADERO' || s === '1';
}

function _yaNotificado(sheet, row, colNotif) {
  if (colNotif < 1) return false;
  const v = sheet.getRange(row, colNotif).getValue();
  return v === true || String(v).toUpperCase() === 'TRUE' || String(v).toUpperCase() === 'VERDADERO';
}

function _marcarNotificado(sheet, row, colNotif) {
  if (colNotif > 0) sheet.getRange(row, colNotif).setValue(true);
}

// ── API pública (GET) ─────────────────────────────────────────────────────────

function doGet() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(BLOG_SHEET);

    if (!sheet) return jsonResponse({ error: `Hoja "${BLOG_SHEET}" no encontrada` });

    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return jsonResponse({ posts: [] });

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const col     = name => headers.indexOf(name);

    const posts = rows.slice(1).map((row, i) => {
      if (!_esActivo(row[col('activo')])) return null;
      const titulo = String(row[col('titulo')] || '').trim();
      if (!titulo) return null;
      return {
        id:        String(i + 1),
        titulo,
        portada:   String(row[col('portada')]   || '').trim(),
        contenido: String(row[col('contenido')] || '').trim(),
        fecha:     String(row[col('fecha')]     || '').trim(),
      };
    }).filter(Boolean);

    posts.sort((a, b) => (a.fecha && b.fecha ? b.fecha.localeCompare(a.fecha) : 0));

    return jsonResponse({ posts, updated: timestamp() });

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function timestamp() {
  return Utilities.formatDate(new Date(), 'America/Caracas', "yyyy-MM-dd'T'HH:mm:ss");
}
