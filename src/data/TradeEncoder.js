function getBaseUrl() {
  if (window.location.protocol === 'file:') {
    return window.location.origin + window.location.pathname + '#';
  }
  return window.location.origin + '/#';
}

// ── Codificación base64 (soporta unicode) ──────────────────────────────────
function encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decode(str) {
  try { return decodeURIComponent(escape(atob(str))); } catch { return str; }
}

// ?n=<base64>  →  need
// ?g=<base64>  →  give
export function needStickerUrl(countryId, slotIndex) {
  return `${getBaseUrl()}/scan?n=${encode(`${countryId}:${slotIndex}`)}`;
}

export function giveStickerUrl(countryId, slotIndex) {
  return `${getBaseUrl()}/scan?g=${encode(`${countryId}:${slotIndex}`)}`;
}

// Parsea tanto URLs completas como paths parciales del router
// Soporta nuevo formato (?n=/?g=) y legado (?need=/?give=)
export function parseScanUrl(input) {
  if (!input) return null;

  let path = input;
  try {
    const url = new URL(input);
    if (url.hash.startsWith('#/')) {
      path = url.hash.slice(1);
    } else {
      path = url.pathname + url.search;
    }
  } catch {
    // ya es un path como /scan?n=...
  }

  const m = path.match(/^\/scan\?(.+)$/);
  if (!m) return null;

  const params = new URLSearchParams(m[1]);

  // Nuevo formato codificado
  const n = params.get('n');
  const g = params.get('g');
  if (n) { const s = _parseSticker(decode(n));  return s ? { action: 'need', ...s } : null; }
  if (g) { const s = _parseSticker(decode(g));  return s ? { action: 'give', ...s } : null; }

  // Legado (compatibilidad hacia atrás)
  const need = params.get('need');
  const give = params.get('give');
  if (need) { const s = _parseSticker(need); return s ? { action: 'need', ...s } : null; }
  if (give) { const s = _parseSticker(give); return s ? { action: 'give', ...s } : null; }

  return null;
}

function _parseSticker(param) {
  const parts    = (param || '').split(':');
  if (parts.length < 2) return null;
  const slotIndex = parseInt(parts[parts.length - 1], 10);
  const countryId = parts.slice(0, -1).join(':');
  if (!countryId || isNaN(slotIndex)) return null;
  return { countryId, slotIndex };
}
