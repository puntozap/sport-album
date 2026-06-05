import { CLIENT } from '../config/client.js';
import { isEmpresaMode } from '../data/albumContext.js';

const STRIPES = [
  '#f5a3b7', '#c8102e', '#f07800',
  '#6633cc', '#00843d', '#00a9bd',
];

const SHAPE_1 = 'M22 10 H124 C154 10 166 27 166 52 C166 76 151 92 124 93 H176 V128 H0 V92 C0 72 14 58 39 58 H0 C0 28 14 10 22 10 Z';
const SHAPE_2 = 'M24 142 H132 C154 142 166 156 166 173 H126 C151 176 166 192 166 214 C166 229 156 237 135 237 H24 C10 237 0 224 0 207 V170 C0 154 10 142 24 142 Z';

let _bgEl = null;

export function createDesktopBackground() {
  const div = document.createElement('div');
  div.className = 'dbg';
  div.setAttribute('aria-hidden', 'true');

  _bgEl = div;
  _renderBackground();

  document.body.insertBefore(div, document.body.firstChild);
  return div;
}

// Llamar desde main.js después de cargar la config de empresa
export function updateDesktopBackground() {
  if (_bgEl) _renderBackground();
}

function _renderBackground() {
  if (!_bgEl) return;

  if (isEmpresaMode() && CLIENT.active) {
    _renderEmpresa();
  } else {
    _renderFifa();
  }
}

function _renderFifa() {
  _bgEl.innerHTML = `
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
      <div class="dbg-title">${CLIENT.active ? 'ÁLBUM DE FIGURITAS EMPRESARIAL' : 'ÁLBUM DE FIGURITAS EMPRESARIAL'}</div>
      <div class="dbg-sub">${CLIENT.active ? 'Creado por zempercodes.com' : 'Creado por zempercodes.com'}</div>
    </div>
  `;
}

function _renderEmpresa() {
  const name    = CLIENT.name    || '';
  const tagline = CLIENT.tagline || '';
  const logo    = CLIENT.logoUrl || '';
  const color   = CLIENT.primaryColor || '#1a56db';
  const wa      = CLIENT.whatsapp || '';

  _bgEl.innerHTML = `
    <div class="dbg-logo dbg-empresa">
      <div class="dbg-empresa-logo">
        ${logo
          ? `<img src="${logo}" alt="${name}" class="dbg-empresa-img">`
          : `<div class="dbg-empresa-name-big" style="color:${color}">${name.toUpperCase()}</div>`
        }
      </div>
      ${tagline ? `<div class="dbg-empresa-tagline">${tagline}</div>` : ''}

      <div class="dbg-marketing">
        <div class="dbg-marketing-title">¿Quieres un álbum así?</div>
        <div class="dbg-marketing-sub">Álbumes digitales personalizados para tu empresa</div>
        ${wa ? `
        <a class="dbg-marketing-btn"
           href="https://wa.me/${wa.replace(/\D/g,'')}?text=Hola,%20quiero%20información%20sobre%20el%20álbum%20empresarial"
           target="_blank" rel="noopener">
          💬 Contáctanos por WhatsApp
        </a>` : ''}
      </div>
    </div>
  `;
}
