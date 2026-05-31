/**
 * Google Apps Script — Intercambiador de cromos WC2026
 * Pegar en: Google Sheet → Extensiones → Apps Script
 * Desplegar como: Aplicación web → Ejecutar como: Yo → Acceso: Cualquier persona
 */

const SHEET_ID   = '1cPoRXI1ElO-4vP_A3A2OGdtZPoMhOmQl8RSl_6w3mCI';
const SHEET_NAME = 'Intercambios';
const WA_URL     = 'https://chanzia.com/zemper/v1/messages';

// OneSignal — push dirigido a usuario específico
const OS_APP_ID  = '9e0cfb0b-799a-43ec-81c8-f15fae46a98b';
const OS_API_KEY = 'os_v2_app_tygpwc3ztjb6zaoi6fp24rvjrp3c2m3gpareavfqk2fjjzvjq2efxykz2kugsqzq5uhgpmakxwicgw6fjqx6hpzuhvvaciajbxf4eci';
const ALBUM_URL  = 'https://sportalbum.chanzia.com';

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
    if      (action === 'status')         result = getStatus(id);
    else if (action === 'list')           result = listTrades();
    else if (action === 'submit')         result = submitTrade(JSON.parse(e.parameter.data || '{}'));
    else if (action === 'accept')         result = acceptTrade({ id });
    else if (action === 'createTransfer') result = createTransfer(JSON.parse(e.parameter.data || '[]'));
    else if (action === 'transferStatus') result = getTransferStatus(id);
    else if (action === 'acceptTransfer') result = acceptTransfer(id);
    else result = { error: 'Acción desconocida' };
    return json(result);
  } catch (err) {
    return json({ error: err.message });
  }
}

// ── Acciones ─────────────────────────────────────────────────────────────────

function submitTrade(data) {
  const { nombre, telefono, ofrece, busca, appUrl, playerId = '' } = data;
  // ofrece / busca: [{ countryId: 'mexico', slotIndex: 3 }, ...]

  const sheet = getSheet();
  const id    = Utilities.getUuid();

  // Columna I = PlayerID de OneSignal (para notificaciones push dirigidas)
  sheet.appendRow([
    id,
    nombre,
    telefono,
    JSON.stringify(ofrece),
    JSON.stringify(busca),
    'pendiente',   // Estado
    '',            // EmparejadoCon
    new Date().toISOString(),
    playerId       // PlayerID OneSignal
  ]);

  // Buscar coincidencia inmediata
  const match = findMatch(sheet, id, telefono, ofrece, busca);

  if (match) {
    updateRow(sheet, id,       { estado: 'emparejado', emparejadoCon: match.id });
    updateRow(sheet, match.id, { estado: 'emparejado', emparejadoCon: id });

    const base          = (appUrl || '').replace(/\/$/, '');
    const myTradeUrl    = `${base}/#/trade/${id}`;
    const matchTradeUrl = `${base}/#/trade/${match.id}`;

    const esPerfecto = match.tipo === 'perfecto';

    // WhatsApp a los dos — mensaje diferente según tipo de match
    if (esPerfecto) {
      sendWA(telefono,       `¡Hola ${nombre}! 🎴 ¡Intercambio perfecto encontrado! *${match.nombre}* tiene exactamente lo que buscas y vos tenés lo que él necesita (${match.puntajeParaMi} cromo${match.puntajeParaMi > 1 ? 's' : ''} en común).\n\nEntra a confirmar: ${myTradeUrl}`);
      sendWA(match.telefono, `¡Hola ${match.nombre}! 🎴 ¡Intercambio perfecto! *${nombre}* tiene lo que buscás y vos tenés lo que él necesita (${match.puntajeParaEllos} cromo${match.puntajeParaEllos > 1 ? 's' : ''} en común).\n\nEntra a confirmar: ${matchTradeUrl}`);
    } else {
      sendWA(telefono,       `¡Hola ${nombre}! 🎴 Encontramos a alguien interesado en tus cromos. *${match.nombre}* quiere lo que vos ofrecés. Puede que lo que él ofrece también te interese.\n\nMiralo acá: ${myTradeUrl}`);
      sendWA(match.telefono, `¡Hola ${match.nombre}! 🎴 *${nombre}* tiene cromos que vos buscás. Entrá a ver si te interesa lo que él ofrece a cambio.\n\nEntra a confirmar: ${matchTradeUrl}`);
    }

    // Push dirigido al usuario que ya tenía la oferta pendiente (match)
    if (match.playerId) {
      sendPushToPlayer(
        match.playerId,
        esPerfecto ? `🎯 ¡Intercambio perfecto!` : `🔄 Alguien quiere tus cromos`,
        esPerfecto
          ? `${nombre} tiene exactamente lo que buscás. ¡${match.puntajeParaEllos} cromo${match.puntajeParaEllos > 1 ? 's' : ''} en común!`
          : `${nombre} tiene lo que buscás. Mirá si su oferta te interesa.`,
        matchTradeUrl
      );
    }
    // Push al usuario que acaba de publicar
    if (playerId) {
      sendPushToPlayer(
        playerId,
        esPerfecto ? `🎯 ¡Intercambio perfecto!` : `🔄 Posible intercambio`,
        esPerfecto
          ? `${match.nombre} tiene lo que buscás. ¡Confirmá ahora!`
          : `${match.nombre} podría intercambiar con vos. Entrá a ver.`,
        myTradeUrl
      );
    }

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
      fecha:  row[7]
    });
  }
  return { trades };
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
//
// Tipos de coincidencia:
//   "perfecto"  — yo tengo algo que él necesita Y él tiene algo que yo necesito
//   "parcial"   — yo tengo algo que él necesita, pero lo que él ofrece
//                 no estaba en mi lista (puede interesarme igual)
//
// Ranking: perfectos primero, luego parciales.
// Dentro de cada grupo, ordenados por puntaje (más figuritas en común = mejor).

function findMatch(sheet, myId, myTelefono, myOfrece, myBusca) {
  const rows       = sheet.getDataRange().getValues();
  const candidatos = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === myId)              continue; // misma oferta
    if (row[2] === myTelefono)        continue; // mismo usuario, otra oferta
    if (row[5] !== 'pendiente')       continue;

    const theirOfrece = safeJson(row[3]);
    const theirBusca  = safeJson(row[4]);
    if (!theirOfrece.length || !theirBusca.length) continue;

    // Cuántas de mis figuritas buscadas tiene él → puntaje "ellos→yo"
    const puntajeParaMi = myBusca.filter(b =>
      theirOfrece.some(o => o.countryId === b.countryId && o.slotIndex === b.slotIndex)
    ).length;

    // Cuántas de las figuritas que él busca tengo yo → puntaje "yo→ellos"
    const puntajeParaEllos = myOfrece.filter(o =>
      theirBusca.some(b => b.countryId === o.countryId && b.slotIndex === o.slotIndex)
    ).length;

    // Descarto si yo no tengo nada que él necesite (no hay razón para intercambiar)
    if (puntajeParaEllos === 0) continue;

    const esPerfecto = puntajeParaMi > 0 && puntajeParaEllos > 0;
    const puntajeTotal = puntajeParaMi + puntajeParaEllos;

    candidatos.push({
      id:           row[0],
      nombre:       row[1],
      telefono:     row[2],
      ofrece:       theirOfrece,
      busca:        theirBusca,
      playerId:     row[8] || '',
      tipo:         esPerfecto ? 'perfecto' : 'parcial',
      puntajeTotal,
      puntajeParaMi,
      puntajeParaEllos,
    });
  }

  if (!candidatos.length) return null;

  // Ordenar: perfectos primero, luego parciales; dentro de cada grupo por puntaje desc
  candidatos.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'perfecto' ? -1 : 1;
    return b.puntajeTotal - a.puntajeTotal;
  });

  return candidatos[0];
}

// ── Transferencias físicas (QR) ───────────────────────────────────────────────

function getTransferSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Transferencias');
  if (!sheet) {
    sheet = ss.insertSheet('Transferencias');
    sheet.appendRow(['ID', 'Stickers', 'Status', 'Fecha', 'Phone', 'Name', 'PlayerID', 'AppUrl']);
  }
  return sheet;
}

function createTransfer(data) {
  // data: { stickers, phone, name, playerId, appUrl }
  const stickers = data.stickers || data; // retrocompat si se pasa array directo
  if (!stickers || !stickers.length) return { error: 'Sin cromos' };
  const sheet = getTransferSheet();
  const id    = Utilities.getUuid();
  sheet.appendRow([
    id,
    JSON.stringify(stickers),
    'pending',
    new Date().toISOString(),
    data.phone    || '',
    data.name     || '',
    data.playerId || '',
    data.appUrl   || ALBUM_URL,
  ]);
  return { id };
}

function getTransferStatus(id) {
  const sheet = getTransferSheet();
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== id) continue;
    return { status: rows[i][2], stickers: safeJson(rows[i][1]) };
  }
  return { error: 'No encontrado' };
}

function acceptTransfer(id) {
  const sheet = getTransferSheet();
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== id) continue;
    if (rows[i][2] === 'accepted') return { ok: true };

    sheet.getRange(i + 1, 3).setValue('accepted');

    const phone    = rows[i][4];
    const name     = rows[i][5] || 'Amigo';
    const playerId = rows[i][6];
    const appUrl   = rows[i][7] || ALBUM_URL;
    const count    = safeJson(rows[i][1]).length;

    // WhatsApp al emisor
    if (phone) {
      sendWA(phone,
        `¡Hola ${name}! 🎴 Tu regalo fue aceptado — ${count} cromo${count !== 1 ? 's' : ''} ya están en el álbum de tu amigo. ` +
        `Abre la app para ver tus recompensas: ${appUrl}`
      );
    }

    // Push al emisor
    if (playerId) {
      sendPushToPlayer(
        playerId,
        '🎁 ¡Regalo aceptado!',
        `${count} cromo${count !== 1 ? 's' : ''} ya están en el álbum de tu amigo.`,
        appUrl
      );
    }

    return { ok: true };
  }
  return { error: 'No encontrado' };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Nombre', 'Telefono', 'Ofrece', 'Busca', 'Estado', 'EmparejadoCon', 'Fecha', 'PlayerID']);
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

function sendPushToPlayer(playerId, heading, contents, url) {
  if (!playerId) return;
  const payload = {
    app_id:             OS_APP_ID,
    include_player_ids: [playerId],
    headings:           { en: heading, es: heading },
    contents:           { en: contents, es: contents },
    url:                url || ALBUM_URL,
  };
  UrlFetchApp.fetch('https://onesignal.com/api/v1/notifications', {
    method:             'post',
    contentType:        'application/json',
    headers:            { Authorization: 'Key ' + OS_API_KEY },
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true,
  });
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
