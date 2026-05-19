import { router } from '../router.js';
import { getCountryById } from '../data/countries.js';

export function Navigation({ currentId, allIds }) {
  const nav = document.createElement('nav');
  nav.className = 'album-nav';

  const currentIndex = allIds.indexOf(currentId);
  const prevId = currentIndex > 0 ? allIds[currentIndex - 1] : null;
  const nextId = currentIndex < allIds.length - 1 ? allIds[currentIndex + 1] : null;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '◀ Anterior';
  prevBtn.disabled = !prevId;
  prevBtn.onclick = () => prevId && router.navigate(`/${prevId}`);

  const info = document.createElement('span');
  const current = getCountryById(currentId);
  info.textContent = current ? `${current.code} — ${current.name}` : '';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Siguiente ▶';
  nextBtn.disabled = !nextId;
  nextBtn.onclick = () => nextId && router.navigate(`/${nextId}`);

  nav.appendChild(prevBtn);
  nav.appendChild(info);
  nav.appendChild(nextBtn);

  return nav;
}
