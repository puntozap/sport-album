/**
 * Modal para capturar nombre + WhatsApp del usuario.
 * Reutilizado por GivePage (y antes por TradePage).
 * Los estilos vienen de trade.css (.tr-registro-*).
 */
import 'intl-tel-input/dist/css/intlTelInput.css';
import intlTelInput from 'intl-tel-input/dist/js/intlTelInputWithUtils.mjs';

const DIAL_COUNTRIES = [
  { iso2: 've', name: 'Venezuela',       dial: '58'  },
  { iso2: 'co', name: 'Colombia',        dial: '57'  },
  { iso2: 'mx', name: 'México',          dial: '52'  },
  { iso2: 'ar', name: 'Argentina',       dial: '54'  },
  { iso2: 'es', name: 'España',          dial: '34'  },
  { iso2: 'us', name: 'Estados Unidos',  dial: '1'   },
  { iso2: 'br', name: 'Brasil',          dial: '55'  },
  { iso2: 'pe', name: 'Perú',            dial: '51'  },
  { iso2: 'cl', name: 'Chile',           dial: '56'  },
  { iso2: 'ec', name: 'Ecuador',         dial: '593' },
  { iso2: 'bo', name: 'Bolivia',         dial: '591' },
  { iso2: 'py', name: 'Paraguay',        dial: '595' },
  { iso2: 'uy', name: 'Uruguay',         dial: '598' },
  { iso2: 'cr', name: 'Costa Rica',      dial: '506' },
  { iso2: 'pa', name: 'Panamá',          dial: '507' },
  { iso2: 'do', name: 'Rep. Dominicana', dial: '1'   },
  { iso2: 'gt', name: 'Guatemala',       dial: '502' },
  { iso2: 'hn', name: 'Honduras',        dial: '504' },
  { iso2: 'ni', name: 'Nicaragua',       dial: '505' },
  { iso2: 'sv', name: 'El Salvador',     dial: '503' },
  { iso2: 'cu', name: 'Cuba',            dial: '53'  },
  { iso2: 'pt', name: 'Portugal',        dial: '351' },
  { iso2: 'fr', name: 'Francia',         dial: '33'  },
  { iso2: 'de', name: 'Alemania',        dial: '49'  },
  { iso2: 'it', name: 'Italia',          dial: '39'  },
  { iso2: 'gb', name: 'Reino Unido',     dial: '44'  },
  { iso2: 'ca', name: 'Canadá',          dial: '1'   },
  { iso2: 'nl', name: 'Países Bajos',    dial: '31'  },
  { iso2: 'tr', name: 'Turquía',         dial: '90'  },
  { iso2: 'ma', name: 'Marruecos',       dial: '212' },
  { iso2: 'sa', name: 'Arabia Saudita',  dial: '966' },
  { iso2: 'ng', name: 'Nigeria',         dial: '234' },
  { iso2: 'za', name: 'Sudáfrica',       dial: '27'  },
  { iso2: 'sn', name: 'Senegal',         dial: '221' },
  { iso2: 'kr', name: 'Corea del Sur',   dial: '82'  },
  { iso2: 'jp', name: 'Japón',           dial: '81'  },
  { iso2: 'au', name: 'Australia',       dial: '61'  },
];

export function getSavedPhone() {
  return localStorage.getItem('trade_my_phone') || '';
}

export function getSavedName() {
  return localStorage.getItem('trade_my_name') || '';
}

/**
 * Muestra el modal de nombre + WhatsApp.
 * onDone(name, phoneE164) se llama cuando el usuario confirma.
 * onCancel() se llama si cierra sin guardar.
 */
export function showPhoneModal({ onDone, onCancel, isEdit = false } = {}) {
  const savedName = getSavedName();
  const savedIso2 = localStorage.getItem('trade_my_phone_iso2') || 've';
  const savedNum  = localStorage.getItem('trade_my_phone_num')  || '';
  const isMobile  = window.innerWidth < 700;

  const overlay = document.createElement('div');
  overlay.className = 'tr-registro-overlay';

  const card = document.createElement('div');
  card.className = 'tr-registro-card';
  card.innerHTML = `
    <div class="tr-registro-icon">${isEdit ? '✏️' : '📲'}</div>
    <div class="tr-registro-title">${isEdit ? 'Editar contacto' : '¿A dónde te avisamos?'}</div>
    <div class="tr-registro-sub">${isEdit ? 'Actualiza tu número de WhatsApp' : 'Te notificamos por WhatsApp cuando reciban tus cromos'}</div>
    <input class="tr-registro-input" id="pm-nombre" type="text" placeholder="Tu nombre" maxlength="50"
           autocomplete="name" value="${savedName.replace(/"/g, '&quot;')}">
    <div class="tr-registro-phone-wrap">
      ${isMobile ? `
        <div class="tr-registro-phone-mobile">
          <select class="tr-registro-country-select" id="pm-pais">
            ${[...new Map(DIAL_COUNTRIES.map(c => [c.iso2 + c.dial, c])).values()]
                .map(c => `<option value="${c.iso2}" data-dial="${c.dial}" ${c.iso2 === savedIso2 ? 'selected' : ''}>${c.name} +${c.dial}</option>`)
                .join('')}
          </select>
          <input class="tr-registro-input tr-registro-phone-num" id="pm-tel" type="tel"
                 placeholder="Número" autocomplete="tel-national" value="${savedNum}">
        </div>
      ` : `
        <input class="tr-registro-input tr-registro-phone" id="pm-tel" type="tel"
               placeholder="WhatsApp" autocomplete="tel" value="${savedNum}">
      `}
    </div>
    <div class="tr-registro-phone-hint">${isMobile ? 'Sin el 0 inicial' : 'Incluye el código de tu país'}</div>
    <button class="tr-registro-btn" id="pm-ok">${isEdit ? '💾 Guardar' : 'Listo ✓'}</button>
    ${isEdit ? `<button class="tr-registro-delete" id="pm-del">🗑 Borrar datos</button>` : ''}
    <button class="tr-registro-cancel" id="pm-cancel">Cancelar</button>
  `;
  overlay.appendChild(card);

  const nombreInput = card.querySelector('#pm-nombre');
  const okBtn       = card.querySelector('#pm-ok');
  okBtn.disabled    = !savedName;

  let getPhoneE164;

  function closeModal(cancelled = false) {
    overlay.classList.remove('tr-registro-active');
    setTimeout(() => {
      overlay.remove();
      if (cancelled) onCancel?.();
    }, 260);
  }

  if (isMobile) {
    const paisSelect = card.querySelector('#pm-pais');
    const numInput   = card.querySelector('#pm-tel');
    const validate   = () => {
      okBtn.disabled = !nombreInput.value.trim() || numInput.value.replace(/\D/g, '').length < 6;
    };
    nombreInput.addEventListener('input', validate);
    numInput.addEventListener('input', validate);

    getPhoneE164 = () => {
      const opt  = paisSelect.options[paisSelect.selectedIndex];
      const dial = opt.dataset.dial;
      const iso2 = paisSelect.value;
      let num = numInput.value.replace(/\D/g, '').replace(/^0+/, '');
      if (iso2 === 'ar' && !num.startsWith('9')) num = '9' + num;
      if (iso2 === 'mx' && !num.startsWith('1')) num = '1' + num;
      localStorage.setItem('trade_my_phone_iso2', iso2);
      localStorage.setItem('trade_my_phone_num',  num);
      return `+${dial}${num}`;
    };

    okBtn.addEventListener('click', () => {
      const name = nombreInput.value.trim();
      if (!name) return;
      const phone = getPhoneE164();
      localStorage.setItem('trade_my_name',  name);
      localStorage.setItem('trade_my_phone', phone);
      closeModal();
      onDone?.(name, phone);
    });

    card.querySelector('#pm-del')?.addEventListener('click', () => {
      ['trade_my_name','trade_my_phone','trade_my_phone_iso2','trade_my_phone_num'].forEach(k => localStorage.removeItem(k));
      closeModal(true);
    });

  } else {
    const telInput = card.querySelector('#pm-tel');
    const iti = intlTelInput(telInput, {
      initialCountry: savedIso2 || 've',
      countryOrder: ['ve','co','mx','es','us','ar'],
      separateDialCode: true, showFlags: true, formatOnDisplay: true,
      useFullscreenPopup: false, dropdownContainer: document.body,
    });

    const validate = () => { okBtn.disabled = !nombreInput.value.trim() || !iti.isValidNumber(); };
    nombreInput.addEventListener('input', validate);
    telInput.addEventListener('input', validate);
    telInput.addEventListener('countrychange', validate);

    getPhoneE164 = () => iti.getNumber();

    okBtn.addEventListener('click', () => {
      const name = nombreInput.value.trim();
      if (!name || !iti.isValidNumber()) return;
      const phone = getPhoneE164();
      localStorage.setItem('trade_my_name',  name);
      localStorage.setItem('trade_my_phone', phone);
      localStorage.setItem('trade_my_phone_iso2', iti.getSelectedCountryData().iso2 || 've');
      overlay.classList.remove('tr-registro-active');
      setTimeout(() => { iti.destroy(); overlay.remove(); onDone?.(name, phone); }, 260);
      return;
    });

    card.querySelector('#pm-del')?.addEventListener('click', () => {
      ['trade_my_name','trade_my_phone','trade_my_phone_iso2','trade_my_phone_num'].forEach(k => localStorage.removeItem(k));
      overlay.classList.remove('tr-registro-active');
      setTimeout(() => { iti.destroy(); overlay.remove(); onCancel?.(); }, 260);
    });

    card.querySelector('#pm-cancel').addEventListener('click', () => {
      overlay.classList.remove('tr-registro-active');
      setTimeout(() => { iti.destroy(); overlay.remove(); onCancel?.(); }, 260);
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('tr-registro-active')));
    return;
  }

  card.querySelector('#pm-cancel').addEventListener('click', () => closeModal(true));
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('tr-registro-active')));
}
