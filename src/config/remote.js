/**
 * Configuración de fuentes remotas.
 *
 * n8nBase: URL base de tu instancia de n8n (sin barra final).
 *          null = desactivado, usa siempre el stickerMap.json local.
 *
 * Endpoints que debe tener n8n:
 *   GET  {n8nBase}/webhook/album-manifest  → JSON con el mapa de cromos
 *   GET  {n8nBase}/webhook/album-img?id=DRIVE_ID → imagen (proxy de Drive)
 *
 * Naming de archivos en Google Drive (todos en UNA carpeta):
 *   {countryId}-{slot:02d}.png
 *   Ejemplo: mexico-00.png, mexico-01.png, southafrica-01.png
 */
export const REMOTE = {
  n8nBase: null,           // ← pon aquí tu URL: 'https://mi-n8n.app'
  timeout: 6000,           // ms máximos para esperar la respuesta
};
