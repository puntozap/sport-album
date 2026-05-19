/**
 * Paletas de colores por país para el álbum.
 * Cada paleta define 4-5 colores base y el generador
 * produce el tema completo con sombras, slots, etc.
 */

const palettes = {
  // === CONCACAF ===
  mexico: {
    primary: '#0d6354',
    accent: '#ba0e16',
    warm: '#942e17',
    highlight: '#89957a',
    slot: '#88bc4b'
  },
  usa: {
    primary: '#1a2b4a',
    accent: '#b22234',
    warm: '#d4a5a5',
    highlight: '#3c3b6e',
    slot: '#6b7db3'
  },
  canada: {
    primary: '#a6192e',
    accent: '#1a1a1a',
    warm: '#e8c4c4',
    highlight: '#ff6b6b',
    slot: '#d46a7e'
  },

  // === CONMEBOL ===
  argentina: {
    primary: '#1e3a5f',
    accent: '#6da9d2',
    warm: '#b8d4e8',
    highlight: '#f6b40e',
    slot: '#75aadb'
  },
  brazil: {
    primary: '#004d26',
    accent: '#002776',
    warm: '#fff3b0',
    highlight: '#ffdf00',
    slot: '#4caf7c'
  },
  colombia: {
    primary: '#1a3a6e',
    accent: '#ce1126',
    warm: '#fff5c2',
    highlight: '#fcdd09',
    slot: '#6b9bd1'
  },
  ecuador: {
    primary: '#1e4d2b',
    accent: '#fcda2e',
    warm: '#d4e8d4',
    highlight: '#3d5c9a',
    slot: '#5a9e6b'
  },
  paraguay: {
    primary: '#8b1e3f',
    accent: '#0038a8',
    warm: '#e8d4a2',
    highlight: '#ffffff',
    slot: '#b85c7a'
  },
  uruguay: {
    primary: '#0038a8',
    accent: '#1a1a1a',
    warm: '#c4d4e8',
    highlight: '#6da9d2',
    slot: '#5a7ec4'
  },

  // === UEFA ===
  france: {
    primary: '#0d2644',
    accent: '#ef4135',
    warm: '#b8c8d8',
    highlight: '#0055a4',
    slot: '#6b8db3'
  },
  germany: {
    primary: '#1a1a1a',
    accent: '#dd0000',
    warm: '#e8dcc8',
    highlight: '#ffce00',
    slot: '#8a8a8a'
  },
  spain: {
    primary: '#8a1c1c',
    accent: '#f1bf00',
    warm: '#e8d4a2',
    highlight: '#aa151b',
    slot: '#c46a6a'
  },
  england: {
    primary: '#5a1018',
    accent: '#ce1124',
    warm: '#d4c4c4',
    highlight: '#ffffff',
    slot: '#8a9eb8'
  },
  portugal: {
    primary: '#0d4d1a',
    accent: '#b22222',
    warm: '#d4e8c4',
    highlight: '#ff0000',
    slot: '#4a9e5e'
  },
  netherlands: {
    primary: '#a6192e',
    accent: '#1a3a6e',
    warm: '#e8d4a2',
    highlight: '#ff6b00',
    slot: '#d46a7e'
  },
  italy: {  // por si acaso
    primary: '#0d3d6e',
    accent: '#ce1126',
    warm: '#c4d4c4',
    highlight: '#009246',
    slot: '#6b9ec4'
  },
  belgium: {
    primary: '#1a1a1a',
    accent: '#fcda2e',
    warm: '#e8c4b8',
    highlight: '#ed2939',
    slot: '#8a7a6a'
  },
  croatia: {
    primary: '#1a2b6e',
    accent: '#b22234',
    warm: '#d4c4c4',
    highlight: '#ffffff',
    slot: '#6b7db3'
  },

  // === CAF ===
  morocco: {
    primary: '#8a1c1c',
    accent: '#006d33',
    warm: '#d4e8c4',
    highlight: '#c41e3a',
    slot: '#b85c5c'
  },
  senegal: {
    primary: '#1a3a1a',
    accent: '#fcda2e',
    warm: '#c4d4e8',
    highlight: '#00853f',
    slot: '#5a9e5a'
  },
  ghana: {
    primary: '#1a3a1a',
    accent: '#fcda2e',
    warm: '#d4c4b8',
    highlight: '#ce1126',
    slot: '#5a8a5a'
  },

  // === AFC ===
  japan: {
    primary: '#6e0d1a',
    accent: '#1a1a1a',
    warm: '#e8c4c4',
    highlight: '#bc002d',
    slot: '#b85c6a'
  },
  korearepublic: {
    primary: '#0d2644',
    accent: '#c41e3a',
    warm: '#d4c4c4',
    highlight: '#0047a0',
    slot: '#6b8ab3'
  },
  saudiarabia: {
    primary: '#0d4d1a',
    accent: '#1a1a1a',
    warm: '#d4e8c4',
    highlight: '#006c35',
    slot: '#4a9e5a'
  },

  // === Otros ===
  australia: {
    primary: '#1a3a6e',
    accent: '#c41e3a',
    warm: '#d4c4c4',
    highlight: '#ffd700',
    slot: '#6b7db3'
  }
};

/**
 * Genera un tema completo a partir de una paleta de 5 colores.
 */
function buildThemeFromPalette(p) {
  return {
    // Texto
    ink: darken(p.primary, 15),
    red: p.accent,
    textLight: '#ffffff',

    // Slots
    slotGreen: p.slot,
    slotGold: '#f1d66a',

    // Fondo del libro
    bookDarkGreen: p.primary,
    bookRed: p.accent,
    bookPink: p.warm,
    bookLightGreen: p.highlight,

    // Título
    titleWe: darken(p.primary, 10),
    titleMx: p.accent,

    // Decoración
    decorationColor: p.warm,

    // Legacy / compat
    bgGreen: p.primary,
    bgGreenDark: darken(p.primary, 12),
    bgPink: p.warm,
    bodyBg: lighten(p.primary, 55),
    albumBg: '#1a1d24',
    bgLeft: '#f8f7f3',
    bgCream: '#f4f0ea',

    // Legacy SVG vectorial (para compat con código antiguo)
    bgLeftBase: '#f8f7f3',
    bgRightBase: p.primary,
    bgTopRedStart: darken(p.accent, 22),
    bgTopRedMid: darken(p.accent, 12),
    bgTopRedEnd: darken(p.accent, 28),
    bgWhiteSwoosh: '#f8f7f3',
    bgCreamSwoosh: '#f4f0ea',
    bgGreenSwooshStart: p.primary,
    bgGreenSwooshMid: p.primary,
    bgGreenSwooshEnd: darken(p.primary, 8),
    bgRightGreenBlock: p.slot,
    bgRightPinkStart: p.warm,
    bgRightPinkEnd: p.warm,
    bgBottomBar: p.primary,
    bgShapeLeftStart: p.warm,
    bgShapeLeftMid: darken(p.accent, 12),
    bgShapeLeftEnd: p.warm,
    bgShapeRightStart: p.highlight,
    bgShapeRightMid: p.slot,
    bgShapeRightEnd: darken(p.slot, 15)
  };
}

// Helpers de color simples (no necesitamos una librería completa)
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

// Generar todos los temas
export const countryThemes = {};
Object.entries(palettes).forEach(([id, palette]) => {
  countryThemes[id] = buildThemeFromPalette(palette);
});

// Tema por defecto (México)
export const defaultTheme = countryThemes.mexico;
