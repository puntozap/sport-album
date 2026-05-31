/**
 * VISTREA — Precios Paramount+ desde Google Sheets
 * ═══════════════════════════════════════════════════════════════
 *
 * INSTALACIÓN (solo una vez):
 * ─────────────────────────────────────────────────────────────
 * 1. Abre tu Google Sheet → Extensiones → Apps Script
 * 2. Pega TODO este código (reemplaza lo que haya)
 * 3. Guarda (Ctrl+S)
 * 4. Clic en "Implementar" → "Nueva implementación"
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién puede acceder: Cualquier usuario (anónimo)
 * 5. Copia la URL que aparece ("URL de la aplicación web")
 * 6. Pégala en src/components/ParamountPage.js
 *    en la constante PRICES_ENDPOINT
 *
 * ESTRUCTURA DEL SHEET:
 * ─────────────────────────────────────────────────────────────
 * Crea una hoja llamada exactamente "Precios" con estas columnas:
 *
 * | Plan            | USD  | Bs  | Descripcion               | Activo |
 * |-----------------|------|-----|---------------------------|--------|
 * | Esencial        | 7.99 | 38  | 1 pantalla · Full HD      | TRUE   |
 * | Showtime        |12.99 | 62  | 3 pantallas · 4K          | TRUE   |
 *
 * - "Activo" = TRUE muestra el plan, FALSE lo oculta sin borrarlo
 * - Cambia USD y Bs libremente; se refleja en la app en segundos
 * - Puedes agregar más filas (más planes)
 *
 * ACTUALIZAR PRECIOS:
 * ─────────────────────────────────────────────────────────────
 * Solo edita las celdas del Sheet y guarda.
 * La app lee los precios en cada apertura del modal.
 * No hace falta redesplegar el script.
 */

const SHEET_NAME = 'Precios';

function doGet() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return jsonResponse({ error: `Hoja "${SHEET_NAME}" no encontrada` }, 404);
    }

    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) {
      return jsonResponse({ plans: [], updated: timestamp() });
    }

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const colIdx  = name => headers.indexOf(name);

    const iCol    = colIdx('plan');
    const usdCol  = colIdx('usd');
    const bsCol   = colIdx('bs');
    const descCol = colIdx('descripcion');
    const actCol  = colIdx('activo');

    const plans = rows.slice(1)
      .filter(row => {
        const activo = row[actCol];
        const s = String(activo).toUpperCase().trim();
        return activo === true || s === 'TRUE' || s === 'VERDADERO' || s === '1';
      })
      .map(row => ({
        name:        String(row[iCol]   || '').trim(),
        usd:         Number(row[usdCol] || 0),
        bs:          Number(row[bsCol]  || 0),
        description: String(row[descCol] || '').trim(),
      }))
      .filter(p => p.name);

    return jsonResponse({ plans, updated: timestamp() });

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(data, status) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function timestamp() {
  return Utilities.formatDate(new Date(), 'America/Caracas', "yyyy-MM-dd'T'HH:mm:ss");
}
