import { Slot } from './Slot.js';

export function SlotGrid({ countryCode, countryId, slots, countryName, flag, onStickerClick }) {
  const fragment = document.createDocumentFragment();

  slots.forEach(slotData => {
    const slotEl = Slot({
      code: countryCode,
      countryId,
      number: slotData.number,
      name: slotData.name,
      type: slotData.type,
      pos: slotData.pos,
      btnCorner: slotData.btnCorner,
      stickerUrl: slotData.stickerUrl,
      countryName,
      flag,
      onStickerClick
    });
    fragment.appendChild(slotEl);
  });

  return fragment;
}
