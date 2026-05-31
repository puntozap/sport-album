import { t } from '../i18n.js';
import { isEmpresaMode } from '../data/albumContext.js';

export function PageHeader({ countryName, federation }) {
  const container = document.createElement('div');

  const title = document.createElement('header');
  title.className = 'title';
  // En modo empresa mostrar texto alternativo
  const weText = isEmpresaMode() ? t('curtain_we_are_empresa') : t('curtain_we_are');
  title.innerHTML = `
    <div class="we">${weText}</div>
    <div class="mx">${countryName.toUpperCase()}</div>
  `;

  container.appendChild(title);

  // En modo empresa federation es null: no se renderiza la sección
  if (federation) {
    const fed = document.createElement('div');
    fed.className = 'federation';
    fed.innerHTML = `
      <div class="federation-flag">
        <img src="https://flagcdn.com/w80/${federation?.flag || 'un'}.png" alt="${t('flag_of')} ${countryName}">
      </div>
      <div>${federation.name}</div>
    `;
    container.appendChild(fed);
  }

  return container;
}
