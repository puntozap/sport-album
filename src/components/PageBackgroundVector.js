export async function PageBackgroundVector(svgUrl) {
  const response = await fetch(svgUrl);
  const svgText = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg) {
    console.error('No se pudo parsear el SVG:', svgUrl);
    return null;
  }

  // Asegurar que ocupe todo el contenedor
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.removeAttribute('width');
  svg.removeAttribute('height');

  return svg;
}
