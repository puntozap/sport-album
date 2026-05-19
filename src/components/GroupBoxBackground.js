/**
 * Fondo SVG orgánico para el GroupBox.
 * Forma ancha con curvas suaves que se adapta al contenedor.
 */
export function GroupBoxBackground({ color }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 60');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'group-box-bg-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';

  svg.innerHTML = `
    <path
      d="
        M 8 12
        C 8 4, 16 2, 24 3
        C 36 5, 48 5, 60 3
        C 72 1, 84 1, 90 6
        C 96 10, 97 18, 95 26
        C 93 36, 94 44, 92 50
        C 90 56, 84 58, 74 57
        C 60 55, 48 56, 36 57
        C 24 58, 14 58, 10 54
        C 4 50, 3 42, 4 34
        C 5 26, 6 18, 8 12
        Z
      "
      fill="${color || '#73b165'}"
    />
  `;

  return svg;
}
