const TRANSFER_URL =
  localStorage.getItem('transfer_api_url') ||
  'https://script.google.com/macros/s/AKfycbx2ghgqYA03dAb8TZJToFFq8Uzlu-Spy8eQeIuu5dgyv6whDaWxbCYhWiBgRnEu0Wlemg/exec';

async function call(params) {
  const url = TRANSFER_URL + '?' + new URLSearchParams(params).toString();
  const r = await fetch(url, { redirect: 'follow' });
  return r.json();
}

export const transferService = {
  // stickers: [{countryId, slotIndex}], phone: '+58...' (E.164), name: string
  // → {id}
  create(stickers, { phone = '', name = '' } = {}) {
    const playerId = localStorage.getItem('onesignal_player_id') || '';
    const appUrl   = window.location.origin + '/';
    return call({
      action: 'createTransfer',
      data: JSON.stringify({ stickers, phone, name, playerId, appUrl }),
    });
  },

  // → {status: 'pending'|'accepted', stickers: [...]}
  status(id) {
    return call({ action: 'transferStatus', id });
  },

  // → {ok: true}
  accept(id) {
    return call({ action: 'acceptTransfer', id });
  },
};
