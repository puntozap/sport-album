import { setEmpresaAlbum } from './albumContext.js';
import { CLIENT } from '../config/client.js';

const IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

// Cache de manifiestos por entidad para evitar multiples fetchs
const manifestCache = new Map();

async function loadManifest(slug, entityId) {
  const key = `${slug}/${entityId}`;
  // No cachear null para permitir reintentos
  if (manifestCache.has(key) && manifestCache.get(key) !== null) {
    return manifestCache.get(key);
  }
  try {
    // Agregar timestamp para evitar cache del navegador
    const ts = Date.now();
    const res = await fetch(`/empresas/${slug}/cromos/${entityId}/manifest.json?t=${ts}`, { cache: 'no-store' });
    if (!res.ok) {
      manifestCache.set(key, null);
      return null;
    }
    const data = await res.json();
    manifestCache.set(key, data);
    return data;
  } catch (_) {
    manifestCache.set(key, null);
    return null;
  }
}

// Devuelve la URL del cromo. Si hay manifest.json, usa la extension correcta.
async function buildStickerUrl(slug, entityId, idx) {
  const manifest = await loadManifest(slug, entityId);
  if (manifest && manifest[String(idx)]) {
    return `/empresas/${slug}/cromos/${entityId}/${manifest[String(idx)]}`;
  }
  // Fallback: intentar webp primero (formato mas comun en empresas)
  const base = `/empresas/${slug}/cromos/${entityId}/${String(idx).padStart(2, '0')}`;
  return `${base}.webp`;
}

// Parcha las URLs al detectar errores de carga: prueba la siguiente extension.
export function tryNextExtension(imgEl, slug, entityId, idx) {
  const base = `/empresas/${slug}/cromos/${entityId}/${String(idx).padStart(2, '0')}`;
  const current = imgEl.src.split('.').pop().split('?')[0].toLowerCase();
  const nextIdx = IMG_EXTS.indexOf(current) + 1;
  if (nextIdx < IMG_EXTS.length) {
    imgEl.src = `${base}.${IMG_EXTS[nextIdx]}`;
  } else {
    imgEl.removeAttribute('src'); // todos fallaron
  }
}

/**
 * Layouts de slots para album empresa.
 *
 * Nomenclatura de zonas (% del alto/ancho del album):
 *   Izquierda : left 0-50%
 *   Derecha   : left 54-95%  (GroupBox ocupa left:54% top:71%)
 *   Zona baja izq.: left 0-50%, top >72% - LIBRE porque GroupBox va a la derecha
 *
 * Regla general: slots en zona baja izq. evitan el GroupBox (z-index 24 > slot 22).
 */

// 12 slots - misma distribucion que FIFA (compatibilidad)
const POSITIONS_12 = [
  { left: '5.5%',  top: '38.0%' },
  { left: '20.0%', top: '38.0%' },
  { left: '35.0%', top: '38.0%' },
  { left: '5.5%',  top: '72.0%', btnCorner: 'top-right' },
  { left: '20.0%', top: '72.0%', btnCorner: 'top-right' },
  { left: '57.0%', top: '7.0%'  },
  { left: '71.0%', top: '7.0%'  },
  { left: '85.0%', top: '7.0%'  },
  { left: '57.0%', top: '38.0%' },
  { left: '71.0%', top: '38.0%' },
  { left: '85.0%', top: '38.0%' },
  { left: '85.0%', top: '72.0%', btnCorner: 'top-left' }
];

// 13 slots - holograma + 12 empleados
// Layout: 3+2 izquierda, 3+3+2 derecha (el slot 12 va al lado del 11)
const POSITIONS_13 = [
  // Izquierda - fila superior (3)
  { left: '5.5%',  top: '38.0%' },
  { left: '20.0%', top: '38.0%' },
  { left: '35.0%', top: '38.0%' },
  // Izquierda - fila inferior (2)
  { left: '5.5%',  top: '72.0%', btnCorner: 'top-right' },
  { left: '20.0%', top: '72.0%', btnCorner: 'top-right' },
  // Derecha - fila superior (3)
  { left: '57.0%', top: '7.0%'  },
  { left: '71.0%', top: '7.0%'  },
  { left: '85.0%', top: '7.0%'  },
  // Derecha - fila media (3)
  { left: '57.0%', top: '38.0%' },
  { left: '71.0%', top: '38.0%' },
  { left: '85.0%', top: '38.0%' },
  // Derecha - fila inferior (2) - slot 11 y 12 juntos
  { left: '71.0%', top: '72.0%', btnCorner: 'top-left' },
  { left: '85.0%', top: '72.0%', btnCorner: 'top-left' }
];

// 15 slots - igual que 13 + 2 extra en zona baja izquierda
const POSITIONS_15 = [
  // Izquierda - fila superior (3)
  { left: '5.5%',  top: '38.0%' },
  { left: '20.0%', top: '38.0%' },
  { left: '35.0%', top: '38.0%' },
  // Izquierda - fila inferior (2)
  { left: '5.5%',  top: '72.0%', btnCorner: 'top-right' },
  { left: '20.0%', top: '72.0%', btnCorner: 'top-right' },
  // Derecha - fila superior (3)
  { left: '57.0%', top: '7.0%'  },
  { left: '71.0%', top: '7.0%'  },
  { left: '85.0%', top: '7.0%'  },
  // Derecha - fila media (3)
  { left: '57.0%', top: '38.0%' },
  { left: '71.0%', top: '38.0%' },
  { left: '85.0%', top: '38.0%' },
  // Derecha - fila inferior (1)
  { left: '71.0%', top: '72.0%', btnCorner: 'top-left' },
  // Zona baja izquierda - 3 slots extra (libre de GroupBox)
  { left: '5.5%',  top: '80.0%', btnCorner: 'top-right' },
  { left: '20.0%', top: '80.0%', btnCorner: 'top-right' },
  { left: '35.0%', top: '80.0%', btnCorner: 'top-right' }
];

function getPositions(count) {
  if (count === 15) return POSITIONS_15;
  if (count === 13) return POSITIONS_13;
  if (count === 12) return POSITIONS_12;
  // Fallback generico
  return Array.from({ length: count }, (_, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const onRight = i >= Math.ceil(count / 2);
    return {
      left: onRight ? `${57 + col * 14}%` : `${5.5 + col * 14.5}%`,
      top:  `${7 + row * 31}%`
    };
  });
}

async function buildEntitySlots(entity, companySlug, stickerCount) {
  const positions = getPositions(stickerCount);
  const stickerMap = new Map((entity.stickers || []).map(s => [s.slot, s]));

  // Si todos los stickers con imageUrl están presentes, saltamos el manifest
  const useSheetsImages = (entity.stickers || []).some(s => s.imageUrl);

  const slots = [];
  for (let idx = 0; idx < positions.length; idx++) {
    const pos = positions[idx];
    const sticker = stickerMap.get(idx);
    const isSpecial = idx === 0;
    const name = sticker?.name || (isSpecial ? entity.name : `${entity.code || '?'} ${idx}`);

    // Prioridad: imageUrl del sheet → archivo local vía manifest
    const stickerUrl = (useSheetsImages && sticker?.imageUrl)
      ? sticker.imageUrl
      : await buildStickerUrl(companySlug, entity.id, idx);

    slots.push({
      number: idx,
      name,
      originalName: name,
      type: isSpecial ? 'gold' : 'normal',
      pos,
      btnCorner: pos.btnCorner || 'bottom-left',
      stickerUrl,
    });
  }
  return slots;
}

function buildEntity(rawEntity, group, companySlug, stickerCount, pageIndex, slots) {
  const id = rawEntity.id;
  const code = rawEntity.code || id.slice(0, 3).toUpperCase();

  // Todos los miembros del grupo (para mostrarse en el GroupBox)
  const groupCountries = (group.entities || []).map(e => ({
    id:   e.id,
    code: e.code || e.id.slice(0, 3).toUpperCase(),
    name: e.name,
    flag: null  // entidades empresa no tienen bandera FIFA
  }));

  return {
    id,
    code,
    name: rawEntity.name,
    pageIndex,
    colors: rawEntity.colors || group.colors || {
      primary:    '#1a56db',
      secondary:  '#ffffff',
      accent:     '#f59e0b',
      sticker:    '#e0e7ff',
      groupBox:   '#1e3a8a'
    },
    slots,
    federation: null,
    group: {
      name: group.name,
      letter: group.letter || group.id.slice(0, 1).toUpperCase(),
      id: group.id,
      countries: groupCountries
    }
  };
}

/**
 * Carga el albumData desde Apps Script (sheetsUrl en CLIENT) o JSON local.
 * CLIENT ya tiene los datos del config.json cargado por loadCompanyConfig.
 */
async function fetchAlbumData(companySlug) {
  const sheetsUrl = CLIENT.sheetsUrl;

  if (sheetsUrl && sheetsUrl.startsWith('https://script.google.com')) {
    try {
      const url = `${sheetsUrl}${sheetsUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.groups)) return data;
      }
    } catch (_) {}
  }

  // Fallback: JSON local
  try {
    const res = await fetch(`/empresas/${companySlug}/albumData.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

export async function loadEmpresaAlbum(companySlug) {
  try {
    const data = await fetchAlbumData(companySlug);
    if (!data) return false;

    // stickerCount puede ser global (album) o por entidad; entidad tiene prioridad
    const defaultCount = data.stickerCount || 15;
    const entities = [];
    const groups = [];
    let pageIndex = 0;

    // Precargar todos los manifests en paralelo para evitar delays
    const entityIds = [];
    for (const group of (data.groups || [])) {
      for (const rawEntity of (group.entities || [])) {
        entityIds.push(rawEntity.id);
      }
    }
    await Promise.all(entityIds.map(id => loadManifest(companySlug, id)));

    for (const group of (data.groups || [])) {
      groups.push(group);
      for (const rawEntity of (group.entities || [])) {
        const count = rawEntity.stickerCount || defaultCount;
        const slots = await buildEntitySlots(rawEntity, companySlug, count);
        entities.push(buildEntity(rawEntity, group, companySlug, count, pageIndex++, slots));
      }
    }

    // Aplicar campos extra del Sheet a CLIENT (shareUrl, freePlay, etc.)
    if (data.shareUrl) CLIENT.shareUrl = data.shareUrl;

    setEmpresaAlbum({ meta: data, entities, groups });
    return true;
  } catch (_) {
    return false;
  }
}
