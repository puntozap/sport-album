import '../styles/page-background.css';

/**
 * Fondo vectorial SVG editable del álbum.
 * ViewBox: 0 0 1629 907 (aspect-ratio de la página)
 * Todos los fills usan CSS custom properties para que cada país pueda cambiar colores.
 */
export function PageBackgroundSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 1629 907');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'page-bg-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';

  // Gradients
  svg.innerHTML = `
    <defs>
      <linearGradient id="gradTopRed" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:var(--bg-top-red-start)"/>
        <stop offset="58%" style="stop-color:var(--bg-top-red-mid)"/>
        <stop offset="100%" style="stop-color:var(--bg-top-red-end)"/>
      </linearGradient>
      <linearGradient id="gradGreenSwoosh" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:var(--bg-green-swoosh-start)"/>
        <stop offset="42%" style="stop-color:var(--bg-green-swoosh-mid)"/>
        <stop offset="100%" style="stop-color:var(--bg-green-swoosh-end)"/>
      </linearGradient>
      <linearGradient id="gradRightPink" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:var(--bg-right-pink-start)"/>
        <stop offset="100%" style="stop-color:var(--bg-right-pink-end)"/>
      </linearGradient>
      <linearGradient id="gradShapeLeft" x1="0%" y1="0%" x2="100%" y2="70%">
        <stop offset="0%" style="stop-color:var(--bg-shape-left-start)"/>
        <stop offset="46%" style="stop-color:var(--bg-shape-left-mid)"/>
        <stop offset="100%" style="stop-color:var(--bg-shape-left-end)"/>
      </linearGradient>
      <linearGradient id="gradShapeRight" x1="0%" y1="0%" x2="100%" y2="70%">
        <stop offset="0%" style="stop-color:var(--bg-shape-right-start)"/>
        <stop offset="55%" style="stop-color:var(--bg-shape-right-mid)"/>
        <stop offset="100%" style="stop-color:var(--bg-shape-right-end)"/>
      </linearGradient>
    </defs>

    <!-- Base izquierda -->
    <rect x="0" y="0" width="814.5" height="907" fill="var(--bg-left-base)"/>

    <!-- Base derecha -->
    <rect x="814.5" y="0" width="814.5" height="907" fill="var(--bg-right-base)"/>

    <!-- Curva roja superior (solo esquina inferior izquierda redondeada) -->
    <path d="M 360 -223 H 1556 V 166 H 958 A 598 195 0 0 1 360 -29 V -223 Z" fill="url(#gradTopRed)"/>

    <!-- Curva blanca (solo esquina inferior derecha redondeada) -->
    <path d="M -44 -143 H 385 A 429 163 0 0 1 814 20 V 183 H -44 V -143 Z" fill="var(--bg-white-swoosh)"/>

    <!-- Curva crema (solo esquina inferior derecha redondeada) -->
    <path d="M -29 142 H 424 A 454 78 0 0 1 878 220 V 298 H -29 V 142 Z" fill="var(--bg-cream-swoosh)"/>

    <!-- Curva verde grande (esquinas superiores redondeadas, diferentes rx/ry) -->
    <path d="M 852 142 A 753 268 0 0 0 99 409 V 929 H 1605 V 535 A 467 394 0 0 0 1138 142 H 852 Z" fill="url(#gradGreenSwoosh)"/>

    <!-- Bloque verde derecha arriba -->
    <rect x="1552" y="0" width="77" height="167" fill="var(--bg-right-green-block)"/>

    <!-- Bloque rosa derecha abajo -->
    <rect x="1552" y="167" width="77" height="712" fill="url(#gradRightPink)"/>

    <!-- Barra inferior -->
    <rect x="668" y="879" width="912" height="28" fill="var(--bg-bottom-bar)"/>

    <!-- Forma inferior izquierda -->
    <g transform="translate(233, 499) scale(0.842, 0.806)">
      <path fill="url(#gradShapeLeft)" d="M120 22 H430 C540 22 610 82 610 170 C610 250 548 318 448 325 H650 V490 H0 V318 C0 234 60 178 156 178 H0 C0 92 58 22 120 22 Z" />
    </g>

    <!-- Forma inferior derecha -->
    <g transform="translate(855, 570) scale(0.865, 0.788)">
      <path fill="url(#gradShapeRight)" d="M95 18 H460 C565 18 625 86 625 168 H485 C574 176 625 244 625 334 C625 392 582 420 500 420 H104 C42 420 0 370 0 305 V130 C0 62 42 18 95 18 Z" />
    </g>

    <!-- Spark / estrella -->
    <polygon points="1546,855 1554,871 1570,878 1554,885 1546,901 1538,885 1522,878 1538,871" fill="rgba(255,255,255,0.62)"/>
  `;

  return svg;
}
