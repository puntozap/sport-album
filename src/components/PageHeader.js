import { t } from '../i18n.js';

export function PageHeader({ countryName, federation }) {
  const container = document.createElement('div');

  const title = document.createElement('header');
  title.className = 'title';
  title.innerHTML = `
    <div class="we">${t('curtain_we_are')}</div>
    <div class="mx">${countryName.toUpperCase()}</div>
  `;

  const fed = document.createElement('div');
  fed.className = 'federation';
  fed.innerHTML = `
    <div class="federation-flag">
      <img src="https://flagcdn.com/w80/${federation.flag}.png" alt="${t('flag_of')} ${countryName}">
    </div>
    <div>${federation.name}</div>
  `;

  container.appendChild(title);
  container.appendChild(fed);

  return container;
}
