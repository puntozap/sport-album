import '../styles/trade.css';
import { tradeService } from '../data/tradeService.js';
import { collectionStore } from '../data/collectionStore.js';
import { countries } from '../data/countries.js';
import { router } from '../router.js';
import { refreshStickerTray, armSticker } from './StickerTray.js';
import { releaseStickersInFlight } from './TradePage.js';

const countryMap = {};
countries.forEach(c => { countryMap[c.id] = c; });

const POLL_INTERVAL = 4000; // 4 segundos

// ── Sala de intercambio ──────────────────────────────────────────────────────

export function TradeRoom({ tradeId }) {
  const page = document.createElement('div');
  page.className = 'trade-overlay trade-room-page';

  let pollTimer = null;
  let accepted  = false;

  function close() {
    clearInterval(pollTimer);
    page.classList.remove('trade-overlay--open');
    setTimeout(() => { page.remove(); router.navigate('/mexico'); }, 260);
  }

  // Header
  const header = document.createElement('div');
  header.className = 'trade-header';
  header.innerHTML = `
    <button class="trade-close-btn">←</button>
    <div class="trade-header-title">🤝 Sala de intercambio</div>
  `;
  header.querySelector('.trade-close-btn').addEventListener('click', close);

  const body = document.createElement('div');
  body.className = 'trade-room-body';
  body.innerHTML = `<div class="trade-room-loading">Cargando intercambio…</div>`;

  page.appendChild(header);
  page.appendChild(body);

  document.body.appendChild(page);
  requestAnimationFrame(() => page.classList.add('trade-overlay--open'));

  // Limpiar al salir de la página
  window.addEventListener('routechange', () => { clearInterval(pollTimer); page.remove(); }, { once: true });

  // Cargar estado inicial
  loadStatus();

  async function loadStatus() {
    try {
      const data = await tradeService.status(tradeId);
      if (data.error) {
        body.innerHTML = `<div class="trade-room-error">No se encontró el intercambio.<br><small>${data.error}</small></div>`;
        return;
      }
      renderRoom(data);
    } catch (err) {
      body.innerHTML = `<div class="trade-room-error">Error de conexión: ${err.message}</div>`;
    }
  }

  function renderRoom(data) {
    const myName   = localStorage.getItem('trade_my_name') || 'Tú';
    const match    = data.match;
    const estado   = data.estado;

    body.innerHTML = '';

    // ── Estado del intercambio ──────────────────────────────────────────────
    const statusBanner = document.createElement('div');
    statusBanner.className = `trade-room-status trade-room-status--${estado}`;

    if (estado === 'completado') {
      statusBanner.textContent = '🎉 ¡Intercambio completado!';
    } else if (estado === 'aceptado') {
      statusBanner.textContent = '⏳ Esperando que el otro confirme…';
    } else if (estado === 'emparejado' && match) {
      statusBanner.textContent = `🔗 Coincidencia encontrada con ${match.nombre}`;
    } else {
      statusBanner.textContent = '⏳ Buscando coincidencia…';
    }
    body.appendChild(statusBanner);

    // Si ya está completado al abrir el link → enviar cromos a la bandeja para pegar
    if (estado === 'completado' && match) {
      const received = match.ofrece || [];
      collectionStore.savePendingPack(received);
      refreshStickerTray();
      // Quitar de duplicados los cromos que yo entregué
      (data.ofrece || []).forEach(s => collectionStore.removeDuplicate(s.countryId, s.slotIndex));
      showCompletionCelebration(received);
      return;
    }

    if (!match) {
      const waiting = document.createElement('div');
      waiting.className = 'trade-room-waiting';
      waiting.innerHTML = `
        <div class="trade-room-wait-icon">🔍</div>
        <div>Buscando a alguien que tenga lo que necesitas…</div>
        <div class="trade-room-wait-sub">Te avisaremos por WhatsApp cuando encontremos una coincidencia.</div>
      `;
      body.appendChild(waiting);

      // Seguir consultando
      pollTimer = setInterval(async () => {
        const updated = await tradeService.status(tradeId).catch(() => null);
        if (updated && updated.match) {
          clearInterval(pollTimer);
          renderRoom(updated);
        }
      }, POLL_INTERVAL);

      return;
    }

    // ── Tarjetas de los dos usuarios ────────────────────────────────────────
    const users = document.createElement('div');
    users.className = 'trade-room-users';

    users.appendChild(buildUserCard({
      name:   myName,
      isMe:   true,
      ofrece: data.ofrece,
      recibe: match.ofrece,
    }));

    const vs = document.createElement('div');
    vs.className = 'trade-room-vs';
    vs.textContent = '⇄';
    users.appendChild(vs);

    users.appendChild(buildUserCard({
      name:   match.nombre,
      isMe:   false,
      ofrece: match.ofrece,
      recibe: data.ofrece,
    }));

    body.appendChild(users);

    // ── Botón aceptar ───────────────────────────────────────────────────────
    if (estado !== 'completado') {
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'trade-accept-btn';
      acceptBtn.textContent = accepted ? 'Esperando al otro…' : '✅ Aceptar intercambio';
      acceptBtn.disabled = accepted;

      acceptBtn.addEventListener('click', async () => {
        acceptBtn.disabled = true;
        acceptBtn.textContent = 'Confirmando…';
        accepted = true;

        try {
          const res = await tradeService.accept(tradeId);

          if (res.bothAccepted) {
            clearInterval(pollTimer);
            // Enviar cromos recibidos a la bandeja para pegar
            collectionStore.savePendingPack(res.newStickers || []);
            refreshStickerTray();
            // Quitar los cromos entregados de la lista de duplicados
            (data.ofrece || []).forEach(s => {
              collectionStore.removeDuplicate(s.countryId, s.slotIndex);
            });
            releaseStickersInFlight(tradeId);
            renderRoom({ ...data, estado: 'completado', match });
            showCompletionCelebration(res.newStickers || []);
          }
        } catch (err) {
          acceptBtn.disabled  = false;
          acceptBtn.textContent = '✅ Aceptar intercambio';
          accepted = false;
          alert('Error al confirmar: ' + err.message);
        }
      });

      body.appendChild(acceptBtn);
    } else {
      // Intercambio completado — botón para ir al álbum
      const doneBtn = document.createElement('button');
      doneBtn.className = 'trade-done-btn';
      doneBtn.textContent = '🎴 Ver mi álbum';
      doneBtn.addEventListener('click', () => {
        clearInterval(pollTimer);
        router.navigate('/mexico');
      });
      body.appendChild(doneBtn);
    }
  }

  function buildUserCard({ name, isMe, ofrece, recibe }) {
    const card = document.createElement('div');
    card.className = `trade-user-card${isMe ? ' trade-user-card--me' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'trade-user-avatar';
    avatar.textContent = name[0]?.toUpperCase() || '?';

    const nameEl = document.createElement('div');
    nameEl.className = 'trade-user-name';
    nameEl.textContent = isMe ? `${name} (tú)` : name;

    const offerLabel = document.createElement('div');
    offerLabel.className = 'trade-user-section-label';
    offerLabel.textContent = 'Ofrece:';

    const offerRow = buildStickerRow(ofrece);

    const receiveLabel = document.createElement('div');
    receiveLabel.className = 'trade-user-section-label';
    receiveLabel.textContent = 'Recibe:';

    const receiveRow = buildStickerRow(recibe);

    card.appendChild(avatar);
    card.appendChild(nameEl);
    card.appendChild(offerLabel);
    card.appendChild(offerRow);
    card.appendChild(receiveLabel);
    card.appendChild(receiveRow);
    return card;
  }

  function buildStickerRow(stickers) {
    const row = document.createElement('div');
    row.className = 'trade-sticker-row';

    (stickers || []).forEach(({ countryId, slotIndex }) => {
      const country = countryMap[countryId];
      const slot    = country?.slots.find(s => s.number === slotIndex);
      if (!slot?.stickerUrl) return;

      const thumb = document.createElement('div');
      thumb.className = 'trade-sticker-thumb';
      thumb.innerHTML = `
        <img src="${slot.stickerUrl}" alt="${slot.name}">
        <div class="trade-sticker-code">${country.code} ${slotIndex}</div>
      `;
      row.appendChild(thumb);
    });

    if (row.children.length === 0) {
      row.textContent = '—';
    }

    return row;
  }

  function showCompletionCelebration(newStickers) {
    const firstCountryId = newStickers[0]?.countryId || 'mexico';

    const cel = document.createElement('div');
    cel.className = 'trade-celebration';
    cel.innerHTML = `
      <div class="trade-cel-content">
        <div class="trade-cel-icon">🎉</div>
        <div class="trade-cel-title">¡Intercambio completado!</div>
        <div class="trade-cel-desc">Tus cromos te esperan en la bandeja — ¡pégalos en tu álbum!</div>
        <div class="trade-cel-stickers"></div>
        <button class="trade-done-btn">🎴 Pegar en mi álbum</button>
      </div>
    `;

    const stickerWrap = cel.querySelector('.trade-cel-stickers');
    newStickers.forEach(({ countryId, slotIndex }) => {
      const country = countryMap[countryId];
      const slot    = country?.slots.find(s => s.number === slotIndex);
      if (!slot?.stickerUrl) return;
      const img = document.createElement('img');
      img.src = slot.stickerUrl;
      img.className = 'trade-cel-img';
      stickerWrap.appendChild(img);
    });

    const firstSlotIndex = newStickers[0]?.slotIndex;

    cel.querySelector('.trade-done-btn').addEventListener('click', () => {
      cel.remove();
      clearInterval(pollTimer);
      page.remove();
      router.navigate(`/${firstCountryId}`);
      // Armar el primer cromo justo después del routechange (que limpia el estado)
      setTimeout(() => armSticker(firstCountryId, firstSlotIndex), 200);
    });

    document.body.appendChild(cel);
    requestAnimationFrame(() => cel.classList.add('trade-cel-show'));
  }

  return page;
}
