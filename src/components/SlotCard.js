/**
 * Tarjeta reutilizable con forma de slot (estilo album Panini).
 * Basada en las formas originales del 2 (superior) y 6 (inferior).
 * Soporta variantes: top, bottom, full
 */

const TOP_PATH = 'M22 10 H124 C154 10 166 27 166 52 C166 76 151 92 124 93 H176 V128 H0 V92 C0 72 14 58 39 58 H0 C0 28 14 10 22 10 Z';
const BOTTOM_PATH = 'M24 142 H132 C154 142 166 156 166 173 H126 C151 176 166 192 166 214 C166 229 156 237 135 237 H24 C10 237 0 224 0 207 V170 C0 154 10 142 24 142 Z';

const VIEWBOX = {
  top: '0 0 176 128',
  bottom: '0 142 176 95',
  full: '0 0 176 237',
};

export function SlotCard({ variant, color, children, className = '' }) {
  const el = document.createElement('div');
  el.className = `slot-card slot-card-${variant} ${className}`;

  let svgContent = '';
  if (variant === 'full') {
    svgContent = `
      <path d="${TOP_PATH}" fill="${color || '#e8e8e8'}" />
      <path d="${BOTTOM_PATH}" fill="${color || '#e8e8e8'}" />
    `;
  } else {
    const path = variant === 'top' ? TOP_PATH : BOTTOM_PATH;
    svgContent = `<path d="${path}" fill="${color || '#e8e8e8'}" />`;
  }

  const viewBox = VIEWBOX[variant] || VIEWBOX.bottom;

  el.innerHTML = `
    <svg class="slot-card-shape" viewBox="${viewBox}" preserveAspectRatio="none" aria-hidden="true">
      ${svgContent}
    </svg>
    <div class="slot-card-content slot-card-content-${variant}">
      ${children}
    </div>
  `;

  return el;
}
