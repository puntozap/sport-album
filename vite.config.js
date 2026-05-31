import { defineConfig } from 'vite';
import { stickerMapPlugin } from './vite-plugin-sticker-map.js';
import { inlineBuildPlugin } from './vite-plugin-inline-build.js';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: false,
        passes: 2
      },
      mangle: {
        toplevel: false,
        keep_classnames: true,
        keep_fnames: false
      }
    },
    cssMinify: true,
    codeSplitting: false
  },
  plugins: [
    stickerMapPlugin(),
    inlineBuildPlugin()
  ]
});
