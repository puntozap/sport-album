/**
 * Plugin de Vite que inyecta JS y CSS inline en el HTML final.
 * Genera un archivo HTML autocontenido que funciona abriendo directo con file://
 */

const fs = require('fs');
const path = require('path');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function inlineBuildPlugin() {
  return {
    name: 'inline-build',
    apply: 'build',
    enforce: 'post',

    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const htmlPath = path.join(distDir, 'index.html');

      if (!fs.existsSync(htmlPath)) {
        console.warn('[inline-build] No se encontró dist/index.html');
        return;
      }

      let html = fs.readFileSync(htmlPath, 'utf-8');

      // 1. Inyectar CSS inline
      const cssMatch = html.match(/<link[^>]+href="\.\/assets\/([^"]+\.css)"[^>]*>/);
      if (cssMatch) {
        const cssFile = cssMatch[1];
        const cssPath = path.join(distDir, 'assets', cssFile);
        if (fs.existsSync(cssPath)) {
          const css = fs.readFileSync(cssPath, 'utf-8');
          html = html.replace(cssMatch[0], () => `<style>${css}</style>`);
          fs.unlinkSync(cssPath);
          console.log(`[inline-build] CSS inline: ${cssFile}`);
        }
      }

      // 2. Inyectar JS inline (quitar type="module" y crossorigin)
      // Mover al final del <body> para que el DOM esté listo
      const jsMatch = html.match(/<script[^>]+src="\.\/assets\/([^"]+\.js)"[^>]*><\/script>/);
      if (jsMatch) {
        const jsFile = jsMatch[1];
        const jsPath = path.join(distDir, 'assets', jsFile);
        if (fs.existsSync(jsPath)) {
          let js = fs.readFileSync(jsPath, 'utf-8');
          // Escapar secuencias que el parser HTML confundiría con etiquetas de cierre
          js = js.replace(/<\/script/gi, '<\\/script').replace(/<\/body/gi, '<\\/body').replace(/<\/html/gi, '<\\/html');
          // Quitar el script del head
          html = html.replace(jsMatch[0], '');
          // Insertar antes de </body>
          // IMPORTANT: use a function to avoid $ pattern substitution in the replacement string
          // (minified JS may contain $& which String.replace() would expand to the matched text)
          html = html.replace('</body>', () => `<script>${js}</script>\n  </body>`);
          fs.unlinkSync(jsPath);
          console.log(`[inline-build] JS inline (al final de <body>): ${jsFile}`);
        }
      }

      // 3. Copiar cromos_extraidos a dist/ para que las rutas relativas funcionen
      const cromosSrc = path.resolve(__dirname, 'cromos_extraidos');
      const cromosDst = path.join(distDir, 'cromos_extraidos');
      if (fs.existsSync(cromosSrc)) {
        copyDir(cromosSrc, cromosDst);
        console.log('[inline-build] Cromos copiados a dist/cromos_extraidos/');
      }

      // 4. Limpiar carpeta assets si quedó vacía
      const assetsDir = path.join(distDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        const remaining = fs.readdirSync(assetsDir);
        if (remaining.length === 0) {
          fs.rmdirSync(assetsDir);
          console.log('[inline-build] Carpeta assets/ eliminada (vacía)');
        } else {
          console.log('[inline-build] Carpeta assets/ conservada (contiene otros archivos)');
        }
      }

      // 5. Agregar meta cache-busting (evita cache del HTML en navegadores)
      const buildTime = Date.now();
      html = html.replace('<head>', `<head>\n    <meta name="build-time" content="${buildTime}">`);

      // 6. Guardar HTML final
      fs.writeFileSync(htmlPath, html);
      console.log('[inline-build] ✅ dist/index.html ahora es autocontenido');
      console.log('[inline-build]    Puedes abrirlo directo con doble click');
    }
  };
}

module.exports = { inlineBuildPlugin };
