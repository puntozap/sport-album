/**
 * Efecto de "telón" al cambiar de país.
 * Muestra "WE ARE [PAÍS]" + bandera grande + grupo, luego se desvanece.
 */

import { getCountryById } from '../data/countries.js';
import { t } from '../i18n.js';
import { CLIENT, clientLogoHtml } from '../config/client.js';
import { isEmpresaMode } from '../data/albumContext.js';

const SHOW_DURATION = 900;  // ms mínimo mostrando el contenido antes de desvanecer
const MAX_WAIT = 4000;      // nunca esperar más de esto aunque las imágenes no carguen

export function showCountryCurtain(countryId, onComplete, readyPromise = Promise.resolve()) {
  const country = getCountryById(countryId);
  if (!country) {
    onComplete();
    return;
  }

  // Crear el telón
  const curtain = document.createElement('div');
  curtain.className = 'country-curtain';
  
  // Fondo flat con el color primario del país
  const primaryColor = country.colors?.primary || '#006B57';
  const secondaryColor = country.colors?.secondary || '#D71920';
  const accentColor = country.colors?.accent || '#F6D98A';
  
  // Extraer letra del grupo (ej: "GROUP A" → "A")
  const groupLetter = country.group?.name?.replace(/GROUP\s+/i, '') || '';
  
  curtain.innerHTML = `
    <div class="curtain-bg" style="background: ${primaryColor}"></div>
    <div class="curtain-content">
      <div class="curtain-group-badge" style="border-color: ${accentColor}; color: ${accentColor}">
        <span class="curtain-group-label" style="color: #fff">${t('curtain_group_label')}</span>
        <span class="curtain-group-letter" style="color: #fff">${groupLetter}</span>
      </div>
      <div class="curtain-flag">
        <img src="https://flagcdn.com/w320/${country.federation?.flag || 'un'}.png" alt="${country.name}">
      </div>
      <div class="curtain-text">
        <span class="curtain-we" style="color: ${secondaryColor}">${isEmpresaMode() ? t('curtain_we_are_empresa') : t('curtain_we_are')}</span>
        <span class="curtain-name" style="color: #fff">${country.name.toUpperCase()}</span>
      </div>
      <div class="curtain-code" style="color: ${secondaryColor}">${country.code}</div>
      ${CLIENT.active ? `
      <div class="curtain-sponsor">
        <div class="curtain-sponsor-label">Presentado por</div>
        <div class="curtain-sponsor-brand">
          ${clientLogoHtml({ imgClass: 'curtain-sponsor-img', textClass: 'curtain-sponsor-brand-name', heightPx: CLIENT.curtain?.logoHeight })}
        </div>
      </div>` : ''}
    </div>
  `;
  
  document.body.appendChild(curtain);
  
  // Forzar reflow para que la animación funcione
  curtain.offsetHeight;
  
  // Animación de entrada
  requestAnimationFrame(() => {
    curtain.classList.add('curtain-in');
  });
  
  // Esperar mínimo SHOW_DURATION Y que las imágenes estén listas (máx MAX_WAIT)
  const minWait  = new Promise(resolve => setTimeout(resolve, SHOW_DURATION));
  const maxWait  = new Promise(resolve => setTimeout(resolve, MAX_WAIT));
  const safeReady = Promise.race([readyPromise, maxWait]);

  Promise.all([minWait, safeReady]).then(() => {
    curtain.classList.remove('curtain-in');
    curtain.classList.add('curtain-out');

    setTimeout(() => {
      curtain.remove();
      onComplete();
    }, 500);
  });
}
