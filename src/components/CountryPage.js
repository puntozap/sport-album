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
import { openPackModal } from './PackOpener.js';
import { refreshStickerTray } from './StickerTray.js';
import { openMusicManager, isMusicActive, stopMusic } from './MusicPlayer.js';
import { getLang } from '../i18n.js';
import { isEmpresaMode, getEmpresaEntities } from '../data/albumContext.js';
import { showStickerRequestModal } from './StickerRequestModal.js';
import { openStickerScanner } from './StickerScanner.js';

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

  // Encabezado — en modo empresa no hay federación
  const header = PageHeader({
    countryName: country.name,
    federation: isEmpresaMode() ? null : country.federation
  });

  // Botón "Abrir sobre" inline — solo mobile
  const canOpen   = collectionStore.canOpenPack();
  const remaining = collectionStore.packsRemaining();
  const es        = getLang() === 'es';
  const mobilePackBtn = document.createElement('button');
  mobilePackBtn.className = 'cp-mobile-pack-btn' + (canOpen ? '' : ' cp-mobile-pack-btn--disabled');
  mobilePackBtn.disabled  = !canOpen;
  mobilePackBtn.innerHTML = canOpen
    ? `🎴 ${es ? 'Abrir sobre' : 'Open pack'} <span class="cp-mobile-pack-count">${remaining}</span>`
    : `🎴 ${es ? 'Sin sobres' : 'No packs'}`;
  mobilePackBtn.addEventListener('click', () => {
    if (!collectionStore.canOpenPack()) return;
    collectionStore.markPackOpened();
    openPackModal({ onClose: () => refreshStickerTray() });
  });
  // Botón 🎵 música al lado del sobre
  const musicBtn = document.createElement('button');
  musicBtn.className = 'cp-mobile-music-btn';
  musicBtn.innerHTML = '🎵';
  musicBtn.title = es ? 'Música' : 'Music';
  const updateMusicBtn = () => {
    const active = isMusicActive();
    musicBtn.innerHTML = active ? '⏹' : '🎵';
    musicBtn.title     = active ? (es ? 'Detener música' : 'Stop music') : (es ? 'Música' : 'Music');
    musicBtn.style.borderColor = active ? 'rgba(239,68,68,0.7)' : '';
  };
  updateMusicBtn();

  musicBtn.addEventListener('click', () => {
    if (isMusicActive()) {
      stopMusic();
      updateMusicBtn();
    } else {
      openMusicManager();
    }
  });

  const scanBtn = document.createElement('button');
  scanBtn.className = 'cp-mobile-scan-btn';
  scanBtn.innerHTML = `📷 ${es ? 'Escanear QR' : 'Scan QR'}`;
  scanBtn.title = es ? 'Dar o recibir un cromo' : 'Give or receive a sticker';
  scanBtn.addEventListener('click', () => openStickerScanner());

  const btnWrap = document.createElement('div');
  btnWrap.className = 'cp-mobile-btn-row';
  btnWrap.appendChild(mobilePackBtn);
  btnWrap.appendChild(scanBtn);
  btnWrap.appendChild(musicBtn);

  const fedEl = header.querySelector('.federation');
  header.insertBefore(btnWrap, fedEl);

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
    flag: country.federation?.flag || null,
    onStickerClick: (data) => stickerReveal.show(data),
    onMissingClick: ({ countryId, slotIndex, name, code, type }) => {
      showStickerRequestModal({ countryId, slotIndex, name, code, type, country });
    }
  });
  fragment.appendChild(slots);

  // GroupBox: siempre se muestra, pero en empresa sin botones de fixture ni simulador
  const groupBox = GroupBox({
    group: country.group,
    onFixtureClick: isEmpresaMode() ? null : () => {
      const panel = GroupFixturePanel({
        groupName: country.group.name,
        teamName: country.name,
        groupCountries: country.group.countries
      });
      panel.open();
      document.addEventListener('keydown', panel.onKeydown, { once: true });
    },
    onSimulatorClick: isEmpresaMode() ? null : () => {
      showSimulatorCurtain(() => router.navigate('/simulation'));
    }
  });
  fragment.appendChild(groupBox);

  // Navegación: en empresa usa entidades; en FIFA usa países
  const navEntities = isEmpresaMode() ? getEmpresaEntities() : null;
  const countryNav = CountryNav({ currentId: country.id, entities: navEntities });
  fragment.appendChild(countryNav);

  // Botones flotantes (idioma + créditos) — van dentro de la página para moverse con ella
  fragment.appendChild(createFloatingActions());

  return AlbumPage({ backgroundUrl: null, children: fragment });
}
