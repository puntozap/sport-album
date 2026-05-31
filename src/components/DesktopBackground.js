const STRIPES = [
  '#f5a3b7', // salmon
  '#c8102e', // rojo
  '#f07800', // naranja
  '#6633cc', // morado
  '#00843d', // verde
  '#00a9bd', // cyan
];

const SHAPE_1 = 'M22 10 H124 C154 10 166 27 166 52 C166 76 151 92 124 93 H176 V128 H0 V92 C0 72 14 58 39 58 H0 C0 28 14 10 22 10 Z';
const SHAPE_2 = 'M24 142 H132 C154 142 166 156 166 173 H126 C151 176 166 192 166 214 C166 229 156 237 135 237 H24 C10 237 0 224 0 207 V170 C0 154 10 142 24 142 Z';

export function createDesktopBackground() {
  const stripeHtml = STRIPES.map((color, i) =>
    `<div class="dbg-stripe" style="background:${color};top:${i * 16}px;width:${62 - i * 2}%"></div>`
  ).join('');

  const div = document.createElement('div');
  div.className = 'dbg';
  div.setAttribute('aria-hidden', 'true');
  div.innerHTML = `
    <div class="dbg-logo">
      <div class="dbg-mark">
        <svg class="dbg-shape dbg-shape-top" viewBox="0 0 176 128" preserveAspectRatio="none" aria-hidden="true">
          <path d="${SHAPE_1}" fill="#ffffff"/>
        </svg>
        <div class="dbg-trophy">🏆</div>
        <svg class="dbg-shape dbg-shape-bottom" viewBox="0 142 176 95" preserveAspectRatio="none" aria-hidden="true">
          <path d="${SHAPE_2}" fill="#ffffff"/>
        </svg>
      </div>
      <div class="dbg-title">ÁLBUM DE FIGURITAS</div>
      <div class="dbg-sub">SIN ÁNIMO DE LUCRO</div>
    </div>
  `;

  document.body.insertBefore(div, document.body.firstChild);
  return div;
}
