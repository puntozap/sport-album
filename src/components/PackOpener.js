import '../styles/pack-opener.css';
import { countries } from '../data/countries.js';
import { collectionStore } from '../data/collectionStore.js';
import { getLang } from '../i18n.js';

const STICKERS_PER_PACK = 5;

function buildPool() {
  const pool = [];
  countries.forEach(c => {
    c.slots.forEach(slot => {
      if (slot.stickerUrl) pool.push({ countryId: c.id, slotIndex: slot.number, slot, country: c });
    });
  });
  return pool;
}

function pickRandom(pool, n) {
  const picks = [];
  for (let i = 0; i < n; i++) picks.push(pool[Math.floor(Math.random() * pool.length)]);
  return picks;
}

export function openPackModal({ onClose, onOpened } = {}) {
  const lang = getLang();
  const es   = lang === 'es';

  const overlay = document.createElement('div');
  overlay.className = 'po-overlay';
  // Evitar que PageSwipe (listeners globales en document) capture gestos mientras el modal está abierto.
  // Si no se frena, un tap/swipe sobre el modal puede navegar de página y parecer un “F5”.
  overlay.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  overlay.addEventListener('touchend',   e => e.stopPropagation(), { passive: true });
  overlay.addEventListener('touchmove',  e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
  overlay.addEventListener('pointerdown', e => e.stopPropagation());

  overlay.innerHTML = `
    <div class="po-card">
      <div class="po-step po-step-pack" data-step="pack">
        <div class="po-title">${es ? '¡Abre tu sobre!' : 'Open your pack!'}</div>
        <div class="po-pack-graphic">
          <div class="po-pack-inner">
            <div class="po-pack-logo">⚽</div>
            <div class="po-pack-brand">FIFA WORLD CUP 2026™</div>
            <div class="po-pack-divider"></div>
            <div class="po-pack-count">5 ${es ? 'CROMOS OFICIALES' : 'OFFICIAL STICKERS'}</div>
          </div>
          <div class="po-pack-tear"></div>
        </div>
        <button class="po-btn po-btn-open">${es ? '¡Abrir sobre!' : 'Open pack!'}</button>
      </div>

      <div class="po-step po-step-reveal hidden" data-step="reveal">
        <div class="po-title po-hint-text">${es ? 'Toca cada carta para verla' : 'Tap each card to reveal'}</div>
        <div class="po-cards-grid"></div>
        <button class="po-btn po-btn-done hidden">${es ? 'Listo →' : 'Done →'}</button>
      </div>
    </div>
  `;

  function close() {
    overlay.classList.remove('po-active');
    setTimeout(() => { overlay.remove(); if (onClose) onClose(); }, 300);
  }

  overlay.querySelector('.po-btn-open').addEventListener('click', () => {
    if (onOpened) { try { onOpened(); } catch {} }
    const packStep   = overlay.querySelector('[data-step="pack"]');
    const revealStep = overlay.querySelector('[data-step="reveal"]');
    packStep.classList.add('po-pack-opening');
    setTimeout(() => {
      packStep.classList.add('hidden');
      revealStep.classList.remove('hidden');
      startReveal(revealStep);
    }, 500);
  });

  function startReveal(revealStep) {
    const pool   = buildPool();
    const picks  = pickRandom(pool, STICKERS_PER_PACK);
    const grid   = revealStep.querySelector('.po-cards-grid');
    const hint   = revealStep.querySelector('.po-hint-text');
    const doneBtn = revealStep.querySelector('.po-btn-done');

    const pending   = []; // cromos nuevos pendientes de ir a la bandeja
    let sentCount   = 0;  // cuántos ya volaron a la bandeja

    // Cromos ya en posesión: pegados en álbum O esperando en la bandeja
    const pendingNow = collectionStore.getPendingPack();
    const inPending  = (c, s) => pendingNow.some(p => p.countryId === c && p.slotIndex === s);

    const cardStates = picks.map((pick, i) => {
      const isDupe = collectionStore.has(pick.countryId, pick.slotIndex)
                  || inPending(pick.countryId, pick.slotIndex);

      const wrapper = document.createElement('div');
      wrapper.className = 'po-card-flip';
      wrapper.style.animationDelay = `${i * 130}ms`;
      wrapper.innerHTML = `
        <div class="po-card-inner">
          <div class="po-card-back">
            <span class="po-card-back-icon">⚽</span>
            <span class="po-card-back-hint">${es ? 'Toca' : 'Tap'}</span>
          </div>
          <div class="po-card-front">
            <div class="po-reveal-img-wrap">
              <img src="${pick.slot.stickerUrl}" alt="${pick.slot.name}" class="po-reveal-img">
              <img src="https://flagcdn.com/w40/${pick.country.federation.flag}.png" class="po-reveal-flag">
            </div>
            <div class="po-reveal-name">${pick.slot.name.replace(/\n/,' ')}</div>
            <div class="po-badge ${isDupe ? 'po-badge-dupe' : 'po-badge-new'}">
              ${isDupe ? (es ? 'Repetido' : 'Duplicate') : (es ? '¡Nuevo!' : 'New!')}
            </div>
            <div class="po-card-send-hint">${es ? 'Toca para guardar' : 'Tap to save'}</div>
          </div>
        </div>
      `;
      grid.appendChild(wrapper);

      return { wrapper, pick, isDupe, flipped: false, sent: false };
    });

    // Guardar cromos nuevos en pending inmediatamente
    const safeNew = cardStates
      .filter(s => !s.isDupe)
      .map(s => ({ countryId: s.pick.countryId, slotIndex: s.pick.slotIndex }));
    if (safeNew.length > 0) collectionStore.savePendingPack(safeNew);

    // Registrar repetidos en el store de duplicados inmediatamente,
    // independiente de si están pegados o en la bandeja.
    cardStates
      .filter(s => s.isDupe)
      .forEach(s => collectionStore.addDuplicate(s.pick.countryId, s.pick.slotIndex));

    function updateHint() {
      const notFlipped = cardStates.filter(s => !s.flipped).length;
      const notSent    = cardStates.filter(s => s.flipped && !s.sent).length;
      if (notFlipped > 0) {
        hint.textContent = es
          ? `Toca cada carta para verla (${notFlipped} restante${notFlipped !== 1 ? 's' : ''})`
          : `Tap each card to reveal (${notFlipped} left)`;
      } else if (notSent > 0) {
        hint.textContent = es
          ? `¡Toca cada cromo para guardarlo en tu bandeja!`
          : `Tap each sticker to save to your tray!`;
      } else {
        hint.textContent = es ? '¡Todos guardados! →' : 'All saved! →';
      }
    }

    cardStates.forEach((state, idx) => {
      state.wrapper.addEventListener('click', () => {
        if (!state.flipped) {
          // 1.ª vez: voltear
          state.flipped = true;
          state.wrapper.classList.add('po-flipped');
          updateHint();

          // Mostrar "Listo" cuando todas están volteadas
          if (cardStates.every(s => s.flipped)) {
            setTimeout(() => doneBtn.classList.remove('hidden'), 300);
          }

        } else if (!state.sent) {
          // 2.ª vez: volar a la bandeja
          sendToTray(state, pick => {
            if (!state.isDupe) {
              pending.push({ countryId: pick.countryId, slotIndex: pick.slotIndex });
            }
            state.sent = true;
            sentCount++;
            updateHint();
            // Si todos enviados → cerrar automáticamente
            if (sentCount === picks.length) {
              setTimeout(() => {
                if (pending.length > 0) collectionStore.savePendingPack(pending);
                close();
              }, 400);
            }
          });
        }
      });
    });

    doneBtn.addEventListener('click', () => {
      // Auto-voltear + enviar los que falten
      cardStates.forEach(state => {
        if (!state.flipped) {
          state.flipped = true;
          state.wrapper.classList.add('po-flipped');
        }
      });
      setTimeout(() => {
        cardStates.forEach(state => {
          if (!state.sent) {
            if (!state.isDupe) {
              pending.push({ countryId: state.pick.countryId, slotIndex: state.pick.slotIndex });
            }
            state.sent = true;
          }
        });
        if (pending.length > 0) collectionStore.savePendingPack(pending);
        close();
      }, 300);
    });

    // Corregir referencia a pick en el forEach
    cardStates.forEach(state => { state.pick = state.pick || picks[cardStates.indexOf(state)]; });
    updateHint();
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('po-active')));
}

// Animación: la carta vuela hacia abajo (a la bandeja) y desaparece
function sendToTray(state, onDone) {
  const { wrapper, pick } = state;
  const rect = wrapper.getBoundingClientRect();

  // Clonar la cara delantera para animar
  const front = wrapper.querySelector('.po-card-front');
  const clone = document.createElement('div');
  clone.style.cssText = `
    position: fixed;
    left: ${rect.left}px; top: ${rect.top}px;
    width: ${rect.width}px; height: ${rect.height}px;
    border-radius: 12px; overflow: hidden;
    background: #fff; z-index: 99999; pointer-events: none;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    transition: all 0.42s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  clone.innerHTML = front.innerHTML;
  document.body.appendChild(clone);

  // Marcar la carta como enviada visualmente
  wrapper.classList.add('po-card-sent');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.style.top     = `${window.innerHeight + 10}px`;
    clone.style.left    = `${window.innerWidth / 2 - rect.width / 2}px`;
    clone.style.opacity = '0';
    clone.style.transform = 'scale(0.6)';
  }));

  setTimeout(() => {
    clone.remove();
    onDone(pick);
  }, 440);
}
