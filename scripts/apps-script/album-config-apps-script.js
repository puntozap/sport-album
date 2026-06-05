/**
 * Google Apps Script — Configuración de Álbum Empresa desde Spreadsheet
 *
 * INSTALACIÓN:
 * 1. Abre el Google Sheet creado por create_empresa_sheet.py
 * 2. Extensiones → Apps Script
 * 3. Pega este código completo y guarda (Ctrl+S)
 * 4. Implementar → Nueva implementación
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 5. Copia la URL generada y pégala en:
 *    public/empresas/{slug}/config.json → campo "sheetsUrl"
 *
 * ENDPOINTS:
 *   GET ?action=album   → albumData.json completo (grupos, países, slots, colores)
 *   GET ?action=stickers → stickerMap { countryId: [url0, url1, ...] }
 *   GET (sin acción)    → igual que ?action=album
 *
 * HOJAS ESPERADAS:
 *   Config  → Clave | Valor
 *   Grupos  → group_id | name | letter | color_primary | color_secondary | color_accent | color_sticker | color_groupBox
 *   Paises  → group_id | country_id | name | code | color_primary | ... (mismas columnas de color, opcionales)
 *   Slots   → country_id | slot | player_name | image_url | type
 */

// ── Entrypoint ────────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'album';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let result;

    if (action === 'stickers') {
      result = buildStickerMap(ss);
    } else {
      result = buildAlbumData(ss);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Leer hojas ────────────────────────────────────────────────────────────────

function leerHoja(ss, nombre) {
  const sheet = ss.getSheetByName(nombre);
  if (!sheet) throw new Error(`Hoja "${nombre}" no encontrada`);

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/ /g, '_'));
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Saltar filas completamente vacías
    if (row.every(cell => cell === '' || cell === null)) continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = String(row[j] ?? '').trim(); });
    rows.push(obj);
  }
  return rows;
}

function leerConfig(ss) {
  const sheet = ss.getSheetByName('Config');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0] ?? '').trim();
    const val = String(data[i][1] ?? '').trim();
    if (key) config[key] = val;
  }
  return config;
}

// ── Construir albumData.json ──────────────────────────────────────────────────

function buildAlbumData(ss) {
  const config  = leerConfig(ss);
  const grupos  = leerHoja(ss, 'Grupos');
  const paises  = leerHoja(ss, 'Paises');
  const slots   = leerHoja(ss, 'Slots');

  const defaultStickerCount = parseInt(config.stickercount || '12') || 12;

  // Índice de slots por country_id
  const slotsPorPais = {};
  for (const s of slots) {
    const cid = s.country_id;
    if (!cid) continue;
    if (!slotsPorPais[cid]) slotsPorPais[cid] = [];
    slotsPorPais[cid].push({
      slot: parseInt(s.slot) || 0,
      name: s.player_name || '',
      ...(s.image_url && { imageUrl: s.image_url }),
      ...(s.type && s.type !== '' && { type: s.type }),
    });
  }

  // Índice de paises por group_id
  const paisesPorGrupo = {};
  for (const p of paises) {
    const gid = p.group_id;
    if (!gid) continue;
    if (!paisesPorGrupo[gid]) paisesPorGrupo[gid] = [];
    paisesPorGrupo[gid].push(p);
  }

  const groups = grupos.map(g => {
    const grupoColors = {
      primary:   g.color_primary   || '#1a56db',
      secondary: g.color_secondary || '#ffffff',
      accent:    g.color_accent    || '#f59e0b',
      sticker:   g.color_sticker   || '#e0e7ff',
      groupBox:  g.color_groupbox  || '#1e3a8a',
    };

    const entities = (paisesPorGrupo[g.group_id] || []).map(p => {
      const entityColors = {
        primary:   p.color_primary   || grupoColors.primary,
        secondary: p.color_secondary || grupoColors.secondary,
        accent:    p.color_accent    || grupoColors.accent,
        sticker:   p.color_sticker   || grupoColors.sticker,
        groupBox:  p.color_groupbox  || grupoColors.groupBox,
      };

      const stickers = (slotsPorPais[p.country_id] || [])
        .sort((a, b) => a.slot - b.slot);

      return {
        id:           p.country_id,
        name:         p.name,
        code:         p.code || p.country_id.slice(0, 3).toUpperCase(),
        colors:       entityColors,
        stickers,
      };
    });

    return {
      id:       g.group_id,
      name:     g.name,
      letter:   g.letter || g.group_id.slice(-1).toUpperCase(),
      colors:   grupoColors,
      entities,
    };
  });

  const freePlayVal = (config.freePlay || config.freeplay || config.freeplay || '').toString().trim().toLowerCase();

  return {
    albumId:      config.albumid      || 'empresa',
    name:         config.name         || 'Álbum Empresa',
    stickerCount: defaultStickerCount,
    freePlay:     freePlayVal === 'true' || freePlayVal === 'si' || freePlayVal === 'yes',
    shareUrl:     config.shareurl || '',
    _source:      'sheets',
    _updated:     new Date().toISOString(),
    groups,
  };
}

// ── Construir stickerMap (compatible con stickerLoader.js) ────────────────────

function buildStickerMap(ss) {
  const config = leerConfig(ss);
  const slots  = leerHoja(ss, 'Slots');
  const paises = leerHoja(ss, 'Paises');
  const defaultCount = parseInt(config.stickercount || '12') || 12;

  // Obtener todos los country_ids
  const countryIds = [...new Set(paises.map(p => p.country_id).filter(Boolean))];

  const map = {};
  for (const cid of countryIds) {
    const paisSlots = slots
      .filter(s => s.country_id === cid)
      .sort((a, b) => (parseInt(a.slot) || 0) - (parseInt(b.slot) || 0));

    const urls = Array(defaultCount).fill(null);
    for (const s of paisSlots) {
      const idx = parseInt(s.slot);
      if (idx >= 0 && idx < urls.length) {
        urls[idx] = s.image_url || null;
      }
    }
    map[cid] = urls;
  }

  return map;
}

// ── Trigger: actualiza al editar el sheet ─────────────────────────────────────
// Opcional: instalar con instalarTrigger() una sola vez.
// Cuando se edita cualquier hoja, invalida el caché del navegador
// incrementando un contador en Config.

function onSheetEdit(e) {
  const sheet = e.range.getSheet();
  const nombre = sheet.getName();
  if (!['Config', 'Grupos', 'Paises', 'Slots'].includes(nombre)) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('Config');
  if (!configSheet) return;

  // Buscar o crear fila _version
  const data = configSheet.getDataRange().getValues();
  let versionRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === '_version') {
      versionRow = i + 1; // 1-based
      break;
    }
  }

  const now = new Date().toISOString();
  if (versionRow > 0) {
    configSheet.getRange(versionRow, 2).setValue(now);
  } else {
    configSheet.appendRow(['_version', now]);
  }
}

function instalarTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Eliminar triggers duplicados
  ScriptApp.getUserTriggers(ss).forEach(t => {
    if (t.getHandlerFunction() === 'onSheetEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  Logger.log('Trigger instalado: onSheetEdit');
}
