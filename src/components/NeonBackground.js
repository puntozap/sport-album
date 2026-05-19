const COLORS = [
  '#ff1a1a', '#ff5500', '#ff9900', '#ffdd00',
  '#00cc44', '#00bbff', '#3344ff', '#9900ff', '#ff0088'
];

// Path del slot-decor-bg — misma forma que el álbum
const SHAPE = 'M22 10 H124 C154 10 166 27 166 52 C166 76 151 92 124 93 H176 V128 H0 V92 C0 72 14 58 39 58 H0 C0 28 14 10 22 10 Z';

// Centro del viewBox 176×128
const CX = 88;
const CY = 64;

export function createNeonBackground() {
  const numRings = 16;
  const paths = [];

  for (let i = numRings; i >= 1; i--) {
    const t     = i / numRings;
    const color = COLORS[(i - 1) % COLORS.length];
    const op    = (0.45 + 0.55 * t).toFixed(2);
    const sw    = (0.5 + 1.2 * t).toFixed(1);

    paths.push(
      `<path d="${SHAPE}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${op}" ` +
      `transform="translate(${CX},${CY}) scale(${t.toFixed(3)}) translate(-${CX},-${CY})"/>`
    );
  }

  const div = document.createElement('div');
  div.className = 'neon-bg';
  div.setAttribute('aria-hidden', 'true');
  div.innerHTML = `<svg viewBox="0 0 176 128" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="nb-glow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="0.9" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="176" height="128" fill="#07070e"/>
    <g filter="url(#nb-glow)">
      ${paths.join('\n      ')}
    </g>
  </svg>`;

  document.body.insertBefore(div, document.body.firstChild);
  return div;
}
