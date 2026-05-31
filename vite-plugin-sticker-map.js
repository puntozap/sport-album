/**
 * Plugin de Vite que vigila cromos_extraidos/grupos/
 * y regenera src/data/stickerMap.json automaticamente.
 */

const fs = require('fs');
const path = require('path');
const { generate } = require('./scripts/node/generate-sticker-map.cjs');

const WATCH_DIR = path.resolve(__dirname, 'cromos_extraidos', 'grupos');
const OUTPUT_FILE = path.resolve(__dirname, 'src', 'data', 'stickerMap.json');

function stickerMapPlugin() {
  let server = null;
  let watcher = null;
  let debounceTimer = null;

  function regenerate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        const result = generate();

        // Si el contenido no cambió (Windows dispara fs.watch al leer archivos),
        // no notificar a Vite para evitar un full-reload innecesario.
        if (!result.changed) return;

        console.log(`[sticker-map] Auto-regenerado: ${result.countries} países, ${result.stickers} cromos`);

        // Notificar a Vite que el JSON cambió para HMR
        if (server) {
          const mod = server.moduleGraph.getModulesByFile(OUTPUT_FILE);
          if (mod) {
            mod.forEach(m => server.reloadModule(m));
          }
        }
      } catch (err) {
        console.error('[sticker-map] Error al regenerar:', err.message);
      }
    }, 300);
  }

  return {
    name: 'sticker-map',
    
    configureServer(viteServer) {
      server = viteServer;
      
      // Generar al iniciar
      if (fs.existsSync(WATCH_DIR)) {
        const result = generate();
        console.log(`[sticker-map] Inicial: ${result.countries} países, ${result.stickers} cromos`);
        
        // Vigilar cambios recursivamente
        watcher = fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
          if (filename && filename.toLowerCase().endsWith('.png')) {
            console.log(`[sticker-map] Cambio detectado: ${filename}`);
            regenerate();
          }
        });
      }
    },

    buildStart() {
      // También regenerar al hacer build
      const result = generate();
      console.log(`[sticker-map] Build: ${result.countries} países, ${result.stickers} cromos`);
    },

    closeBundle() {
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    }
  };
}

module.exports = { stickerMapPlugin };
