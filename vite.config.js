import { defineConfig } from 'vite';
import obfuscator from 'vite-plugin-javascript-obfuscator';
import { stickerMapPlugin } from './vite-plugin-sticker-map.js';
import { inlineBuildPlugin } from './vite-plugin-inline-build.js';

export default defineConfig({
  base: './',
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: false,
        passes: 3
      },
      mangle: { toplevel: true }
    },
    cssMinify: true,
    codeSplitting: false
  },
  plugins: [
    stickerMapPlugin(),
    obfuscator({
      apply: 'build',
      include: ['src/**/*.js'],
      exclude: ['node_modules'],
      debugger: false,
      options: {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        reservedNames: ['^#'],
        rotateStringArray: true,
        selfDefending: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: false,
        unicodeEscapeSequence: false
      }
    }),
    inlineBuildPlugin()
  ]
});
