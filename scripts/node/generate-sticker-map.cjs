/**
 * Escanea cromos_extraidos/grupos y genera src/data/stickerMap.json
 *
 * REGLA DE NOMBRADO:
 * - Los archivos deben nombrarse: 00.png, 01.png, 02.png, ..., 11.png
 * - 00.png → slot 0 (escudo / especial dorado)
 * - 01.png → slot 1 (arquero)
 * - 02.png → slot 2, etc.
 * - Array de 12 posiciones. Numero faltante = null (slot vacio)
 *
 * Estructura de carpetas:
 *   grupos/a/1/ → Mexico (1er equipo grupo A)
 *   grupos/a/2/ → South Africa (2do equipo grupo A)
 *   grupos/b/1/ → Canada (1er equipo grupo B)
 */

const fs = require('fs');
const path = require('path');

const GROUPS_DIR = path.join(__dirname, 'cromos_extraidos', 'grupos');
const OUTPUT_FILE = path.join(__dirname, 'src', 'data', 'stickerMap.json');
const SLOTS_PER_TEAM = 12;

// Orden de equipos por grupo (sacado de teamsData.json)
const groupOrder = {
  a: ['mexico', 'southafrica', 'korearepublic', 'czechia'],
  b: ['canada', 'bosniaandherzegovina', 'qatar', 'switzerland'],
  c: ['brazil', 'morocco', 'haiti', 'scotland'],
  d: ['unitedstates', 'paraguay', 'australia', 'turkiye'],
  e: ['germany', 'curacao', 'cotedivoire', 'ecuador'],
  f: ['netherlands', 'japan', 'sweden', 'tunisia'],
  g: ['belgium', 'egypt', 'iran', 'newzealand'],
  h: ['spain', 'capeverde', 'saudiarabia', 'uruguay'],
  i: ['france', 'senegal', 'iraq', 'norway'],
  j: ['argentina', 'algeria', 'austria', 'jordan'],
  k: ['portugal', 'drcongo', 'uzbekistan', 'colombia'],
  l: ['england', 'croatia', 'ghana', 'panama'],
};

function generate() {
  const stickerMap = {};
  let totalCountries = 0;
  let totalStickers = 0;

  // Siempre genera todos los slots con su URL esperada.
  // Si el archivo no existe en el servidor, el frontend muestra el placeholder via onerror.
  for (const [group, teams] of Object.entries(groupOrder)) {
    for (let i = 0; i < teams.length; i++) {
      const countryId = teams[i];
      const position  = i + 1;
      const slots = [];

      for (let slot = 0; slot < SLOTS_PER_TEAM; slot++) {
        const slotFile = String(slot).padStart(2, '0') + '.png';
        slots.push(`cromos_extraidos/grupos/${group}/${position}/${slotFile}`);
      }

      stickerMap[countryId] = slots;
      totalCountries++;
      totalStickers += SLOTS_PER_TEAM;
    }
  }

  const newContent = JSON.stringify(stickerMap, null, 2);

  // Solo escribir si el contenido cambió realmente.
  // En Windows, fs.watch dispara eventos al LEER archivos (no solo al modificarlos),
  // lo que causaría que Vite hiciera un full-reload cada vez que el browser
  // carga las imágenes de los cromos (por ejemplo al abrir un sobre).
  let currentContent = '';
  try { currentContent = fs.readFileSync(OUTPUT_FILE, 'utf-8'); } catch (_) {}

  if (newContent === currentContent) {
    return { countries: totalCountries, stickers: totalStickers, changed: false };
  }

  fs.writeFileSync(OUTPUT_FILE, newContent);
  return { countries: totalCountries, stickers: totalStickers, changed: true };
}

// Si se ejecuta directamente
if (require.main === module) {
  const result = generate();
  console.log(`\n✅ stickerMap.json → ${result.countries} países, ${result.stickers} cromos`);
}

module.exports = { generate };
