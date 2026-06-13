export function getSavedPhone() {
  return localStorage.getItem('trade_my_phone') || '';
}

export function getSavedName() {
  return localStorage.getItem('trade_my_name') || '';
}

const COUNTRIES = [
  { iso2: 've', name: 'Venezuela',     dial: '+58'  },
  { iso2: 'co', name: 'Colombia',      dial: '+57'  },
  { iso2: 'mx', name: 'México',        dial: '+52'  },
  { iso2: 'es', name: 'España',        dial: '+34'  },
  { iso2: 'us', name: 'Estados Unidos',dial: '+1'   },
  { iso2: 'ar', name: 'Argentina',     dial: '+54'  },
  { iso2: 'pe', name: 'Perú',          dial: '+51'  },
  { iso2: 'cl', name: 'Chile',         dial: '+56'  },
  { iso2: 'ec', name: 'Ecuador',       dial: '+593' },
  { iso2: 'bo', name: 'Bolivia',       dial: '+591' },
  { iso2: 'py', name: 'Paraguay',      dial: '+595' },
  { iso2: 'uy', name: 'Uruguay',       dial: '+598' },
  { iso2: 'cr', name: 'Costa Rica',    dial: '+506' },
  { iso2: 'pa', name: 'Panamá',        dial: '+507' },
  { iso2: 'do', name: 'R. Dominicana', dial: '+1'   },
  { iso2: 'gt', name: 'Guatemala',     dial: '+502' },
  { iso2: 'hn', name: 'Honduras',      dial: '+504' },
  { iso2: 'sv', name: 'El Salvador',   dial: '+503' },
  { iso2: 'ni', name: 'Nicaragua',     dial: '+505' },
  { iso2: 'cu', name: 'Cuba',          dial: '+53'  },
  { iso2: 'br', name: 'Brasil',        dial: '+55'  },
  { iso2: 'pt', name: 'Portugal',      dial: '+351' },
  { iso2: 'gb', name: 'Reino Unido',   dial: '+44'  },
  { iso2: 'de', name: 'Alemania',      dial: '+49'  },
  { iso2: 'fr', name: 'Francia',       dial: '+33'  },
  { iso2: 'it', name: 'Italia',        dial: '+39'  },
];

export function showPhoneModal({ onDone, onCancel, isEdit = false } = {}) {
  const savedName = getSavedName();
  const savedIso2 = localStorage.getItem('trade_my_phone_iso2') || 've';
  const savedNum  = localStorage.getItem('trade_my_phone_num')  || '';

  const overlay = document.createElement('div');
  overlay.className = 'tr-registro-overlay';

  const optionsHtml = COUNTRIES.map(c =>
    `<option value="${c.iso2}" ${c.iso2 === savedIso2 ? 'selected' : ''}>${c.name} ${c.dial}</option>`
  ).join('');

  const card = document.createElement('div');
  card.className = 'tr-registro-card';
  card.innerHTML = `
    <div class="tr-registro-icon">${isEdit ? '✏️' : '📲'}</div>
    <div class="tr-registro-title">${isEdit ? 'Editar perfil' : '¿Cómo te llamamos?'}</div>
    <div class="tr-registro-sub">${isEdit ? 'Actualiza tu nombre o número' : 'Para avisarte por WhatsApp'}</div>
    <input class="tr-registro-input" id="pm-nombre" type="text" placeholder="Tu nombre" maxlength="50"
           autocomplete="name" value="${savedName.replace(/"/g, '&quot;')}">
    <div class="tr-registro-phone-row">
      <select class="tr-registro-country-select" id="pm-country">${optionsHtml}</select>
      <input class="tr-registro-input tr-registro-phone-num" id="pm-tel" type="tel"
             placeholder="WhatsApp" autocomplete="tel" inputmode="numeric" value="${savedNum}">
    </div>
    <div class="tr-registro-phone-hint">Sin el 0 inicial</div>
    <button class="tr-registro-btn" id="pm-ok" disabled>${isEdit ? '💾 Guardar' : 'Listo ✓'}</button>
    ${isEdit ? `<button class="tr-registro-delete" id="pm-del">🗑 Borrar perfil</button>` : ''}
    <button class="tr-registro-cancel" id="pm-cancel">Cancelar</button>
  `;
  overlay.appendChild(card);

  const nombreInput  = card.querySelector('#pm-nombre');
  const countrySelect = card.querySelector('#pm-country');
  const telInput     = card.querySelector('#pm-tel');
  const okBtn        = card.querySelector('#pm-ok');

  const validate = () => {
    const name = nombreInput.value.trim();
    const num  = telInput.value.replace(/\D/g, '');
    okBtn.disabled = !name || num.length < 6;
  };

  nombreInput.addEventListener('input', validate);
  telInput.addEventListener('input', validate);
  if (savedName && savedNum) validate();

  function saveAndClose() {
    const name = nombreInput.value.trim();
    const num  = telInput.value.replace(/\D/g, '').replace(/^0+/, '');
    if (!name || num.length < 6) return;

    const iso2    = countrySelect.value;
    const country = COUNTRIES.find(c => c.iso2 === iso2) || COUNTRIES[0];
    const phone   = country.dial + num;

    localStorage.setItem('trade_my_name',       name);
    localStorage.setItem('trade_my_phone',      phone);
    localStorage.setItem('trade_my_phone_iso2', iso2);
    localStorage.setItem('trade_my_phone_num',  num);

    destroyAndRemove();
    onDone?.(name, phone);
  }

  function destroyAndRemove(cancelled = false) {
    overlay.classList.remove('tr-registro-active');
    setTimeout(() => {
      overlay.remove();
      if (cancelled) onCancel?.();
    }, 260);
  }

  okBtn.addEventListener('click', saveAndClose);

  card.querySelector('#pm-del')?.addEventListener('click', () => {
    ['trade_my_name','trade_my_phone','trade_my_phone_iso2','trade_my_phone_num']
      .forEach(k => localStorage.removeItem(k));
    destroyAndRemove(true);
  });

  card.querySelector('#pm-cancel').addEventListener('click', () => destroyAndRemove(true));

  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('tr-registro-active')));
}
