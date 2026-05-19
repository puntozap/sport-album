import staticMap from './stickerMap.json';
import { REMOTE } from '../config/remote.js';

// Mapa activo — empieza con el JSON estático, se sobreescribe si n8n responde
let resolvedMap = staticMap;

const failedUrls = new Set();

export function markStickerFailed(url) {
  failedUrls.add(url.split('?')[0]);
}

export function getStickerUrl(countryId, slotIndex) {
  const list = resolvedMap[countryId];
  if (!list || slotIndex < 0 || slotIndex >= list.length) return null;
  const raw = list[slotIndex] ?? null;
  if (!raw) return null;
  const url = (!raw.startsWith('http') && !raw.startsWith('/')) ? '/' + raw : raw;
  if (failedUrls.has(url)) return `${url}?t=${Date.now()}`;
  return url;
}

export function hasStickers(countryId) {
  return !!resolvedMap[countryId];
}

/**
 * Descarga el manifiesto de cromos desde n8n.
 * Devuelve el mapa JSON si tuvo éxito, null si falla o está desactivado.
 * No lanza errores — fallo silencioso con fallback al JSON local.
 */
export async function fetchStickerMap() {
  if (!REMOTE.n8nBase) return null;

  const url = `${REMOTE.n8nBase}/webhook/album-manifest`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REMOTE.timeout),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === 'object') {
      resolvedMap = data;
      return data;
    }
  } catch (_) {}
  return null;
}

/**
 * Construye la URL de imagen via proxy n8n (para usar en el workflow de imagen).
 * Si no hay n8n configurado devuelve null.
 */
export function n8nImgUrl(driveFileId) {
  if (!REMOTE.n8nBase || !driveFileId) return null;
  return `${REMOTE.n8nBase}/webhook/album-img?id=${driveFileId}`;
}
