import { AlbumPage } from './AlbumPage.js';
import { SlotGrid } from './SlotGrid.js';
import { PageHeader } from './PageHeader.js';
import { GroupBox } from './GroupBox.js';
import { CountryNav } from './CountryNav.js';
import { AlbumBookBackground } from './AlbumBookBackground.js';
import { SlotDecorBackground } from './SlotDecorBackground.js';
import { buildThemeFromAlbumColors, applyTheme } from '../data/themes.js';
import { initStickerReveal } from './StickerReveal.js';
import { GroupFixturePanel } from './GroupFixturePanel.js';
import { router } from '../router.js';
import { showSimulatorCurtain } from './SimulatorCurtain.js';
import { createFloatingActions } from './FloatingActions.js';
import { collectionStore } from '../data/collectionStore.js';

export function CountryPage({ country, allCountryIds }) {
  const theme = buildThemeFromAlbumColors(country.colors);

  // Aplicar variables CSS del tema al root
  applyTheme(document.documentElement, theme);

  const fragment = document.createDocumentFragment();

  // Inicializar el reveal de cromos
  const stickerReveal = initStickerReveal();

  // Nuevo fondo de libro con capas
  const bg = AlbumBookBackground();
  fragment.appendChild(bg);

  // Titulo y federacion
  const header = PageHeader({
    countryName: country.name,
    federation: country.federation
  });
  fragment.appendChild(header);

  // Fondo decorativo con forma de 2 detras de los slots izquierda
  const decorLeft = document.createElement('div');
  decorLeft.className = 'slot-decor-left';
  const decorSvg = SlotDecorBackground({ color: 'var(--decoration-color, #f5a3b7)' });
  decorLeft.appendChild(decorSvg);
  fragment.appendChild(decorLeft);

  // Filtrar slots: solo mostrar imagen si el cromo está en la colección
  const visibleSlots = country.slots.map(slot => ({
    ...slot,
    stickerUrl: collectionStore.has(country.id, slot.number) ? slot.stickerUrl : null
  }));

  const slots = SlotGrid({
    countryCode: country.code,
    countryId: country.id,
    slots: visibleSlots,
    countryName: country.name,
    flag: country.federation.flag,
    onStickerClick: (data) => stickerReveal.show(data)
  });
  fragment.appendChild(slots);

  // Caja del grupo con las banderas + botón fixture
  const groupBox = GroupBox({
    group: country.group,
    onFixtureClick: () => {
      const panel = GroupFixturePanel({
        groupName: country.group.name,
        teamName: country.name,
        groupCountries: country.group.countries
      });
      panel.open();
      document.addEventListener('keydown', panel.onKeydown, { once: true });
    },
    onSimulatorClick: () => {
      showSimulatorCurtain(() => router.navigate('/simulation'));
    }
  });
  fragment.appendChild(groupBox);

  // Tira de navegación por países (parte superior)
  const countryNav = CountryNav({ currentId: country.id });
  fragment.appendChild(countryNav);

  // Botones flotantes (idioma + créditos) — van dentro de la página para moverse con ella
  fragment.appendChild(createFloatingActions());

  return AlbumPage({ backgroundUrl: null, children: fragment });
}
