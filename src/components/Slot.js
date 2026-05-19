import '../styles/slot.css';
import { SlotCard } from './SlotCard.js';
import { markStickerFailed } from '../data/stickerLoader.js';

export function Slot({ code, countryId, number, name, type, pos, btnCorner, stickerUrl, countryName, flag, onStickerClick }) {
  const el = document.createElement('article');
  el.className = `slot ${type === 'gold' ? 'gold' : ''}`;
  el.style.left = pos.left;
  el.style.top = pos.top;
  if (countryId) {
    el.dataset.countryId  = countryId;
    el.dataset.slotIndex  = number;
  }

  // Si hay cromo pegado, mostrar imagen clickeable con flip
  if (stickerUrl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'slot-flip-wrapper';

    const flipInner = document.createElement('div');
    flipInner.className = 'slot-flip-inner';

    // Cara frontal — imagen del cromo
    const front = document.createElement('div');
    front.className = 'slot-flip-front';

    const stickerImg = document.createElement('img');
    stickerImg.className = 'slot-sticker';
    stickerImg.alt = `${code} ${number}`;

    stickerImg.onerror = () => {
      markStickerFailed(stickerUrl);
      wrapper.remove();
      renderPlaceholder(el, code, number, name);
    };

    if (onStickerClick) {
      stickerImg.style.cursor = 'pointer';
      stickerImg.addEventListener('click', (e) => {
        e.stopPropagation();
        onStickerClick({ stickerUrl, countryName, countryCode: code, flag, playerName: name, slotNumber: number, isGold: type === 'gold' });
      });
    }

    front.appendChild(stickerImg);
    stickerImg.src = stickerUrl;

    // Cara trasera — número y nombre del jugador
    const back = document.createElement('div');
    back.className = 'slot-flip-back';
    const nameHtmlBack = name.replace(/\n/g, '<br>');
    back.innerHTML = `<span class="slot-flip-code">${code} ${number}</span><span class="slot-flip-name">${nameHtmlBack}</span>`;
    // Permitir volver a la cara frontal tocando el área trasera (útil en móvil)
    back.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      flipInner.classList.toggle('flipped');
    });

    flipInner.appendChild(front);
    flipInner.appendChild(back);
    wrapper.appendChild(flipInner);

    // Botón-punto para voltear
    const btn = document.createElement('button');
    btn.className = `slot-flip-btn slot-flip-btn--${btnCorner || 'bottom-left'}`;
    btn.setAttribute('aria-label', 'Ver número');
    // En móvil el álbum usa listeners de touch globales (PageSwipe). Evitar que el gesto se lo "robe".
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      flipInner.classList.toggle('flipped');
    });

    wrapper.appendChild(btn);
    el.appendChild(wrapper);
    return el;
  }

  renderPlaceholder(el, code, number, name);
  return el;
}

function renderPlaceholder(el, code, number, name) {
  const nameHtml = name.replace(/\n/g, '<br>');
  const inner = document.createElement('div');
  inner.className = 'slot-inner';

  const topCard = SlotCard({
    variant: 'top',
    color: '#e8e8e8',
    children: `
      <div class="slot-code">${code}</div>
      <div class="slot-number">${number}</div>
    `
  });

  const bottomCard = SlotCard({
    variant: 'bottom',
    color: '#e8e8e8',
    children: `<div class="slot-name">${nameHtml}</div>`
  });

  inner.appendChild(topCard);
  inner.appendChild(bottomCard);
  el.appendChild(inner);
}
