/**
 * Configuración del cliente.
 *
 * LOGO: pon el archivo en /public/assets/client/ y apunta logoUrl a él.
 *
 * TOGGLE EN URL:
 *   ?brand=off  → desactiva el branding aunque active sea true  (demo limpio)
 *   ?brand=on   → activa el branding aunque active sea false    (preview forzado)
 */

function resolveBrandActive(configActive) {
  const param = new URLSearchParams(window.location.search).get('brand');
  if (param === 'off') return false;
  if (param === 'on')  return true;
  return configActive;
}

const _config = {
  active: false,

  name:    'Distribuidora Isacell',
  tagline: 'Tecnologia a tu alcance',

  logoUrl: '/assets/client/Phs1DKe5w8sY7wX9yP27.png',

  primaryColor: '#1a56db',

  whatsapp: null,
  website:  null,

  // ── Stamp en el cromo expandido ──────────────────────────────
  stamp: {
    // Esquina: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    corner: 'bottom-right',

    logoHeight:   68,          // px — alto del logo
    padding:      '0px 0px',  // espaciado interno
    borderRadius: '10px',

    // Cuánto sale fuera del cromo (negativo = más afuera, positivo = adentro)
    offsetV: -40,  // desplazamiento vertical  (abajo si bottom-*, arriba si top-*)
    offsetH:   2,  // desplazamiento horizontal (derecha si *-right, izquierda si *-left)

    rotate: -2,    // grados de inclinación del stamp
  },

  // ── Badge esquina del álbum — DESACTIVADO ────────────────────
  albumBadge: {
    show: false,   // ← true para mostrarlo, false para ocultarlo
    logoHeight:   20,
    padding:      '4px 9px',
    borderRadius: '20px',
  },

  // ── Logo en el hueco central del álbum ───────────────────────
  // Usa left/top o right/bottom para posicionarlo
  // El círculo rojo está aprox. en left:44% top:38%
  albumLogo: {
    show:         true,
    logoHeight:   90,          // px — tamaño del logo
    left:         '51%',       // ← mueve izq/der
    top:          '50%',       // ← mueve arriba/abajo

    // Transparencia: 0.0 = invisible, 1.0 = sólido
    opacity:      0.28,

    // Cómo se mezcla con el fondo:
    // 'luminosity' → se integra suavemente con cualquier color
    // 'multiply'   → se oscurece con el fondo
    // 'screen'     → se aclara con el fondo (bueno para logos oscuros)
    // 'normal'     → sin mezcla, solo opacidad
    blendMode:    'luminosity',
  },

  // ── "Presentado por" en el telón de país ─────────────────────
  curtain: {
    logoHeight: 90,    // px — alto del logo
    padding:    '3px 10px',
  },

  // ── Logo en el loading splash (debajo del trofeo) ────────────
  splash: {
    logoHeight: 30,    // px — alto del logo
    padding:    '8px 20px',
  },

  // ── Logo en el modal de Info ──────────────────────────────────
  modal: {
    logoHeight: 50,    // px — alto del logo
  },
};

export const CLIENT = {
  ..._config,
  active: resolveBrandActive(_config.active),
};

/**
 * Carga la configuración de una empresa desde /empresas/{slug}/config.json
 * y aplica su logo desde /empresas/{slug}/logo.png.
 * Retorna true si la empresa existe, false si no.
 */
export async function loadCompanyConfig(slug) {
  if (!slug) return false;
  const base = `/empresas/${slug}`;
  try {
    const res = await fetch(`${base}/config.json`, { cache: 'no-store' });
    if (!res.ok) return false;
    const cfg = await res.json();
    Object.assign(CLIENT, cfg);
    if (!cfg.logoUrl) CLIENT.logoUrl = `${base}/logo.png`;
    CLIENT.active = resolveBrandActive(true);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Devuelve el HTML del logo: imagen si hay logoUrl, texto si no.
 */
export function clientLogoHtml({ imgClass = '', textClass = '', heightPx = null } = {}) {
  if (!CLIENT.active) return '';
  const sizeAttr = heightPx ? `style="height:${heightPx}px"` : '';
  if (CLIENT.logoUrl) {
    return `<img class="${imgClass}" ${sizeAttr} src="${CLIENT.logoUrl}" alt="${CLIENT.name}" onerror="this.style.display='none'">`;
  }
  return `<span class="${textClass || imgClass} client-logo-text">${CLIENT.name.toUpperCase()}</span>`;
}

/**
 * Construye el style inline del stamp según la esquina configurada.
 */
export function stampStyle() {
  const s = CLIENT.stamp || {};
  const corner  = s.corner || 'bottom-right';
  const offsetV = s.offsetV ?? -20;
  const offsetH = s.offsetH ?? -14;

  const vProp = corner.startsWith('bottom') ? 'bottom' : 'top';
  const hProp = corner.endsWith('right')    ? 'right'  : 'left';

  return [
    `--client-color:${CLIENT.primaryColor}`,
    `${vProp}:${offsetV}px`,
    `${hProp}:${offsetH}px`,
    s.padding       ? `padding:${s.padding}`           : '',
    s.borderRadius  ? `border-radius:${s.borderRadius}` : '',
    s.rotate != null ? `transform:rotate(${s.rotate}deg)` : '',
  ].filter(Boolean).join(';');
}
