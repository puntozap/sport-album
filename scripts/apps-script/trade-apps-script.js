/**
 * Google Apps Script — Intercambiador de cromos WC2026
 * Pegar en: Google Sheet → Extensiones → Apps Script
 * Desplegar como: Aplicación web → Ejecutar como: Yo → Acceso: Cualquier persona
 */

const SHEET_ID   = '1cPoRXI1ElO-4vP_A3A2OGdtZPoMhOmQl8RSl_6w3mCI';
const SHEET_NAME = 'Intercambios';
const WA_URL     = 'https://chanzia.com/zemper/v1/messages';

// ── Entrypoints ──────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const raw  = (e.parameter && e.parameter.data) ? e.parameter.data : e.postData.contents;
    const data = JSON.parse(raw);
    let result;
    if      (data.action === 'submit') result = submitTrade(data);
    else if (data.action === 'accept') result = acceptTrade(data);
    else result = { error: 'Acción desconocida' };
    return json(result);
  } catch (err) {
    return json({ error: err.message });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const id     = e.parameter.id;
    let result;
    if      (action === 'status') result = getStatus(id);
    else if (action === 'submit') result = submitTrade(JSON.parse(e.parameter.data || '{}'));
    else if (action === 'accept') result = acceptTrade({ id });
    else result = { error: 'Acción desconocida' };
    return json(result);
  } catch (err) {
    return json({ error: err.message });
  }
}

// ── Acciones ─────────────────────────────────────────────────────────────────

function submitTrade(data) {
  const { nombre, telefono, ofrece, busca, appUrl } = data;
  // ofrece / busca: [{ countryId: 'mexico', slotIndex: 3 }, ...]

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
    new Date().toISOString()
  ]);

  // Buscar coincidencia inmediata
  const match = findMatch(sheet, id, ofrece, busca);

  if (match) {
    updateRow(sheet, id,       { estado: 'emparejado', emparejadoCon: match.id });
    updateRow(sheet, match.id, { estado: 'emparejado', emparejadoCon: id });

    const base         = (appUrl || '').replace(/\/$/, '');
    const myTradeUrl   = `${base}/#/trade/${id}`;
    const matchTradeUrl = `${base}/#/trade/${match.id}`;

    sendWA(telefono,       `¡Hola ${nombre}! 🎴 Encontramos un intercambio de cromos. *${match.nombre}* tiene lo que buscas y tú tienes lo que ${match.nombre} necesita.\n\nEntra aquí para confirmar: ${myTradeUrl}`);
    sendWA(match.telefono, `¡Hola ${match.nombre}! 🎴 Encontramos un intercambio de cromos. *${nombre}* tiene lo que buscas y tú tienes lo que ${nombre} necesita.\n\nEntra aquí para confirmar: ${matchTradeUrl}`);

    return {
      success: true,
      matched: true,
      id,
      tradeUrl: myTradeUrl,
      match: { nombre: match.nombre, ofrece: match.ofrece, busca: match.busca }
    };
  }

  return { success: true, matched: false, id };
}

function getStatus(id) {
  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== id) continue;

    const matchId  = rows[i][6];
    let matchData  = null;

    if (matchId) {
      for (let j = 1; j < rows.length; j++) {
        if (rows[j][0] !== matchId) continue;
        matchData = {
          nombre: rows[j][1],
          ofrece: safeJson(rows[j][3]),
          busca:  safeJson(rows[j][4]),
          estado: rows[j][5]
        };
        break;
      }
    }

    return {
      id:     rows[i][0],
      nombre: rows[i][1],
      estado: rows[i][5],
      ofrece: safeJson(rows[i][3]),
      busca:  safeJson(rows[i][4]),
      match:  matchData
    };
  }

  return { error: 'No encontrado' };
}

function acceptTrade(data) {
  const { id } = data;
  const sheet  = getSheet();
  const rows   = sheet.getDataRange().getValues();

  let myRow = null, matchRow = null;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id)          myRow   = { i, r: rows[i] };
  }
  if (!myRow) return { error: 'No encontrado' };

  const matchId = myRow.r[6];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === matchId) matchRow = { i, r: rows[i] };
  }

  // Si ya está completado (el otro ya aceptó antes), solo devolver los cromos
  if (myRow.r[5] === 'completado') {
    return {
      success:     true,
      bothAccepted: true,
      newStickers:  safeJson(matchRow?.r[3])
    };
  }

  // El primero en aceptar completa el intercambio para los dos
  updateRow(sheet, id,      { estado: 'completado' });
  if (matchId) updateRow(sheet, matchId, { estado: 'completado' });

  // Cancelar otras solicitudes pendientes que ofrezcan los mismos cromos
  const myPhone    = myRow.r[2];
  const matchPhone = matchRow?.r[2];
  const myOfrece   = safeJson(myRow.r[3]);
  const matchOfrece = safeJson(matchRow?.r[3]);

  cancelConflictingRequests(sheet, id,      myPhone,    myOfrece);
  cancelConflictingRequests(sheet, matchId, matchPhone, matchOfrece);

  sendWA(myRow.r[2], `¡Intercambio completado! 🎉 Los cromos ya están en tu álbum. ¡Disfrútalos!`);
  if (matchRow) sendWA(matchRow.r[2], `¡Intercambio completado! 🎉 Los cromos ya están en tu álbum. Entra al álbum para verlos.`);

  return {
    success:      true,
    bothAccepted: true,
    newStickers:  safeJson(matchRow?.r[3])
  };
}

// ── Cancelar solicitudes duplicadas ──────────────────────────────────────────

function cancelConflictingRequests(sheet, completedId, phone, tradedStickers) {
  if (!phone || !tradedStickers || !tradedStickers.length) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === completedId)  continue; // la misma solicitud completada
    if (row[5] !== 'pendiente')  continue; // solo las pendientes
    if (row[2] !== phone)        continue; // solo del mismo usuario

    const theirOfrece = safeJson(row[3]);
    const hasConflict = tradedStickers.some(traded =>
      theirOfrece.some(o => o.countryId === traded.countryId && o.slotIndex === traded.slotIndex)
    );
    if (hasConflict) {
      updateRow(sheet, row[0], { estado: 'cancelada' });
    }
  }
}

// ── Matching ─────────────────────────────────────────────────────────────────

function findMatch(sheet, myId, myOfrece, myBusca) {
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === myId)        continue;
    if (row[5] !== 'pendiente') continue;

    const theirOfrece = safeJson(row[3]);
    const theirBusca  = safeJson(row[4]);
    if (!theirOfrece || !theirBusca) continue;

    const theyHaveWhatINeed = myBusca.some(b =>
      theirOfrece.some(o => o.countryId === b.countryId && o.slotIndex === b.slotIndex)
    );
    const iHaveWhatTheyNeed = myOfrece.some(o =>
      theirBusca.some(b => b.countryId === o.countryId && b.slotIndex === o.slotIndex)
    );

    if (theyHaveWhatINeed && iHaveWhatTheyNeed) {
      return { id: row[0], nombre: row[1], telefono: row[2], ofrece: theirOfrece, busca: theirBusca };
    }
  }
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Nombre', 'Telefono', 'Ofrece', 'Busca', 'Estado', 'EmparejadoCon', 'Fecha']);
  }
  return sheet;
}

function updateRow(sheet, id, updates) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== id) continue;
    const r = i + 1;
    // A=1 ID | B=2 Nombre | C=3 Tel | D=4 Ofrece | E=5 Busca | F=6 Estado | G=7 EmparejadoCon | H=8 Fecha
    if (updates.estado        !== undefined) sheet.getRange(r, 6).setValue(updates.estado);
    if (updates.emparejadoCon !== undefined) sheet.getRange(r, 7).setValue(updates.emparejadoCon);
    break;
  }
}

function sendWA(number, message) {
  UrlFetchApp.fetch(WA_URL, {
    method:          'POST',
    contentType:     'application/json',
    payload:         JSON.stringify({ message, number }),
    muteHttpExceptions: true
  });
}

function safeJson(str) {
  try { return JSON.parse(str); } catch { return []; }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
