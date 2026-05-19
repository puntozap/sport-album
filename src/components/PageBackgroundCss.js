import '../styles/page-background.css';

export function PageBackgroundCss() {
  const fragment = document.createDocumentFragment();

  const layers = [
    'left-base',
    'right-base',
    'top-red',
    'white-swoosh',
    'cream-swoosh',
    'green-swoosh',
    'right-green-block',
    'right-pink-block',
    'spark-bg'
  ];

  layers.forEach(className => {
    const div = document.createElement('div');
    div.className = className;
    div.setAttribute('aria-hidden', 'true');
    fragment.appendChild(div);
  });

  // SVG shapes con gradientes dinámicos via CSS custom properties
  const shapeLeft = document.createElement('div');
  shapeLeft.className = 'bg-shape bg-shape-left';
  shapeLeft.setAttribute('aria-hidden', 'true');
  shapeLeft.innerHTML = `
    <svg viewBox="0 0 650 500" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pinkShapeGradient" x1="0%" y1="0%" x2="100%" y2="70%">
          <stop offset="0%" style="stop-color:var(--bg-shape-left-start)"/>
          <stop offset="46%" style="stop-color:var(--bg-shape-left-mid)"/>
          <stop offset="100%" style="stop-color:var(--bg-shape-left-end)"/>
        </linearGradient>
      </defs>
      <path fill="url(#pinkShapeGradient)" d="M120 22 H430 C540 22 610 82 610 170 C610 250 548 318 448 325 H650 V490 H0 V318 C0 234 60 178 156 178 H0 C0 92 58 22 120 22 Z" />
    </svg>
  `;
  fragment.appendChild(shapeLeft);

  const shapeRight = document.createElement('div');
  shapeRight.className = 'bg-shape bg-shape-right';
  shapeRight.setAttribute('aria-hidden', 'true');
  shapeRight.innerHTML = `
    <svg viewBox="0 0 650 420" preserveAspectRatio="none">
      <defs>
        <linearGradient id="greenShapeGradient" x1="0%" y1="0%" x2="100%" y2="70%">
          <stop offset="0%" style="stop-color:var(--bg-shape-right-start)"/>
          <stop offset="55%" style="stop-color:var(--bg-shape-right-mid)"/>
          <stop offset="100%" style="stop-color:var(--bg-shape-right-end)"/>
        </linearGradient>
      </defs>
      <path fill="url(#greenShapeGradient)" d="M95 18 H460 C565 18 625 86 625 168 H485 C574 176 625 244 625 334 C625 392 582 420 500 420 H104 C42 420 0 370 0 305 V130 C0 62 42 18 95 18 Z" />
    </svg>
  `;
  fragment.appendChild(shapeRight);

  return fragment;
}
