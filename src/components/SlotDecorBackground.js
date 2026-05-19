/**
 * Fondo decorativo con forma de slot (el 2) para el lado izquierdo.
 * Usa el mismo path SVG de la tarjeta superior estirado al contenedor.
 */
const TOP_PATH = 'M22 10 H124 C154 10 166 27 166 52 C166 76 151 92 124 93 H176 V128 H0 V92 C0 72 14 58 39 58 H0 C0 28 14 10 22 10 Z';

export function SlotDecorBackground({ color }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 176 128');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'slot-decor-bg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';

  svg.innerHTML = `
    <path d="${TOP_PATH}" fill="${color || '#9fca8e'}" />
  `;

  return svg;
}
