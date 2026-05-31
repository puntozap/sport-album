import { countries } from '../data/countries.js';
import { router } from '../router.js';
import '../styles/country-nav.css';
import { t } from '../i18n.js';

export function CountryNav({ currentId, entities = null }) {
  const nav = document.createElement('nav');
  nav.className = 'country-nav';
  nav.setAttribute('aria-label', t('country_nav_aria'));

  // Si se pasan entidades empresa, se usan en lugar de países FIFA
  const items = entities || countries;
  const isEmpresa = !!entities;

  items.forEach(item => {
    const btn = document.createElement('div');
    btn.className = 'country-nav-item' + (item.id === currentId ? ' active' : '');
    btn.dataset.id = item.id;
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', item.name);

    if (isEmpresa) {
      // Sin banderas: mostrar iniciales o código de la entidad
      btn.innerHTML = `
        <div class="country-nav-circle country-nav-circle--text">
          <span>${item.code}</span>
        </div>
        <span class="country-nav-code">${item.code}</span>
      `;
    } else {
      btn.innerHTML = `
        <div class="country-nav-circle">
          <img src="https://flagcdn.com/w80/${item.federation?.flag || 'un'}.png" alt="${item.name}" loading="lazy">
        </div>
        <span class="country-nav-code">${item.code}</span>
      `;
    }
    nav.appendChild(btn);
  });

  // Manual touch scroll — parent has touch-action: none so native scroll is blocked
  let dragStartX = 0;
  let scrollStart = 0;
  let dragging = false;
  let moved = false;
  let tapId = null;

  nav.addEventListener('touchstart', e => {
    e.stopPropagation(); // prevent PageSwipe from receiving this touch
    dragging = true;
    moved = false;
    dragStartX = e.touches[0].clientX;
    scrollStart = nav.scrollLeft;
    const item = e.target.closest('.country-nav-item');
    tapId = item ? item.dataset.id : null;
  }, { passive: true });

  nav.addEventListener('touchmove', e => {
    e.stopPropagation();
    if (!dragging) return;
    const dx = dragStartX - e.touches[0].clientX;
    if (Math.abs(dx) > 5) moved = true;
    nav.scrollLeft = scrollStart + dx;
  }, { passive: true });

  nav.addEventListener('touchend', e => {
    e.stopPropagation();
    dragging = false;
    if (!moved && tapId) {
      router.navigate('/' + tapId);
    }
    tapId = null;
  }, { passive: true });

  // Desktop click
  nav.addEventListener('click', e => {
    const item = e.target.closest('.country-nav-item');
    if (item && item.dataset.id) {
      router.navigate('/' + item.dataset.id);
    }
  });

  // Scroll active item into center after mount
  requestAnimationFrame(() => {
    const active = nav.querySelector('.country-nav-item.active');
    if (active) {
      nav.scrollLeft = active.offsetLeft - (nav.offsetWidth / 2) + (active.offsetWidth / 2);
    }
  });

  return nav;
}
