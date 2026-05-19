import { defaultTheme } from './countryThemes.js';

export { defaultTheme };

function toKebabCase(str) {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

export function applyTheme(element, theme) {
  Object.entries(theme).forEach(([key, value]) => {
    element.style.setProperty(`--${toKebabCase(key)}`, value);
  });
}

/**
 * Genera un tema CSS completo a partir de los colores del álbum Panini.
 * @param {object} colors - { primary, secondary, accent, sticker, groupBox }
 */
export function buildThemeFromAlbumColors(colors) {
  if (!colors) return defaultTheme;

  const c = colors;

  return {
    // Texto
    ink: darken(c.primary, 10),
    red: c.secondary,
    textLight: '#ffffff',

    // Slots
    slotGreen: c.sticker,
    slotGold: '#f1d66a',

    // Fondo del libro
    bookDarkGreen: c.primary,
    bookRed: c.secondary,
    bookPink: lighten(c.accent, 20),
    bookLightGreen: c.accent,

    // Título
    titleWe: darken(c.primary, 5),
    titleMx: c.secondary,

    // Decoración
    decorationColor: c.accent,

    // GroupBox
    groupBg: c.groupBox,

    // Legacy / compat
    bgGreen: c.primary,
    bgGreenDark: darken(c.primary, 12),
    bgPink: lighten(c.accent, 20),
    bodyBg: lighten(c.primary, 55),
    albumBg: '#1a1d24',
    bgLeft: '#f8f7f3',
    bgCream: '#f4f0ea',

    // Legacy SVG vectorial
    bgLeftBase: '#f8f7f3',
    bgRightBase: c.primary,
    bgTopRedStart: darken(c.secondary, 22),
    bgTopRedMid: darken(c.secondary, 12),
    bgTopRedEnd: darken(c.secondary, 28),
    bgWhiteSwoosh: '#f8f7f3',
    bgCreamSwoosh: '#f4f0ea',
    bgGreenSwooshStart: c.primary,
    bgGreenSwooshMid: c.primary,
    bgGreenSwooshEnd: darken(c.primary, 8),
    bgRightGreenBlock: c.sticker,
    bgRightPinkStart: lighten(c.accent, 20),
    bgRightPinkEnd: lighten(c.accent, 20),
    bgBottomBar: c.primary,
    bgShapeLeftStart: lighten(c.accent, 20),
    bgShapeLeftMid: darken(c.secondary, 12),
    bgShapeLeftEnd: lighten(c.accent, 20),
    bgShapeRightStart: c.accent,
    bgShapeRightMid: c.sticker,
    bgShapeRightEnd: darken(c.sticker, 15)
  };
}

// Helpers de color simples
function darken(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function lighten(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min((num >> 16) + amt, 255);
  const G = Math.min((num >> 8 & 0x00FF) + amt, 255);
  const B = Math.min((num & 0x0000FF) + amt, 255);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
