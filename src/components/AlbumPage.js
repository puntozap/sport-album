import '../styles/album-page.css';
import { CLIENT, clientLogoHtml } from '../config/client.js';

export function AlbumPage({ backgroundUrl, children, showClientBadge = true }) {
  const shell = document.createElement('main');
  shell.className = 'album-shell';

  const page = document.createElement('section');
  page.className = 'album-page';
  page.setAttribute('aria-label', 'Album page');

  if (backgroundUrl) {
    page.style.backgroundImage = `url("${backgroundUrl}")`;
  }

  if (children instanceof DocumentFragment) {
    page.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach(c => page.appendChild(c));
  } else if (children) {
    page.appendChild(children);
  }

  if (CLIENT.active && showClientBadge) {
    page.style.setProperty('--client-color', CLIENT.primaryColor);

    // Badge pequeño esquina (solo si show:true)
    const ab = CLIENT.albumBadge || {};
    if (ab.show) {
      const badge = document.createElement('div');
      badge.className = 'client-corner-badge';
      badge.innerHTML = `
        <div class="client-corner-badge-dot"></div>
        ${clientLogoHtml({ imgClass: 'client-corner-badge-img', textClass: 'client-corner-badge-name', heightPx: ab.logoHeight })}
      `;
      if (ab.padding)      badge.style.padding      = ab.padding;
      if (ab.borderRadius) badge.style.borderRadius = ab.borderRadius;
      page.appendChild(badge);
    }

    // Logo flotante en el cuerpo del álbum
    const al = CLIENT.albumLogo || {};
    if (al.show) {
      const logo = document.createElement('div');
      logo.className = 'client-album-logo';
      logo.innerHTML = clientLogoHtml({ imgClass: 'client-album-logo-img', textClass: 'client-album-logo-text', heightPx: al.logoHeight });
      if (al.bottom)    logo.style.bottom    = al.bottom;
      if (al.right)     logo.style.right     = al.right;
      if (al.top)       logo.style.top       = al.top;
      if (al.left)      logo.style.left      = al.left;
      if (al.opacity   != null) logo.style.setProperty('--album-logo-opacity', al.opacity);
      if (al.blendMode)         logo.style.setProperty('--album-logo-blend',   al.blendMode);
      page.appendChild(logo);
    }
  }

  shell.appendChild(page);
  return shell;
}
