  const STORAGE_KEY = 'lang';

export const LANGUAGES = ['en', 'es'];

const dict = {
  en: {
    // Generic
    close: 'Close',
    saved: 'Saved',
    simulate: 'Simulate',
    reset: 'Reset',
    back: 'Back',
    loading: 'Loading…',
    tbd: 'TBD',
    group: 'Group',
    team: 'Team',

    // App / Router
    country_not_found: 'Country not found',
    page_not_found: '404 — Page not found',

    // ARIA
    album_page_aria: 'Album page',
    country_nav_aria: 'Country navigation',
    flag_of: 'Flag of',

    // Country curtain
    curtain_group_label: 'GROUP',
    curtain_we_are: "Because it's'",
    curtain_we_are_empresa: 'EQUIPO',

    // Simulator curtain
    simulator: 'SIMULATOR',
    knockout_stage: 'KNOCKOUT STAGE',

    // Group Fixture Panel
    matches_of: 'MATCHES OF {team}',
    no_matches_team: 'No matches registered for this team.',

    // Group Simulator Panel
    simulator_group_title: 'SIMULATOR · {group}',
    calendar_group: 'CALENDAR · {group}',
    no_matches_group: 'No matches registered for this group.',

    // Match card
    simulate_result_title: 'Simulate result',
    simulate_result: 'Simulate',
    saved_check: '✓ Saved',
    official: 'Official',
    your_sim: 'your sim',

    // Standings
    standings_group: 'GROUP {group}',
    th_team: 'Team',
    th_pj: 'MP',
    th_pg: 'W',
    th_pe: 'D',
    th_pp: 'L',
    th_gf: 'GF',
    th_gc: 'GA',
    th_dg: 'GD',
    th_pts: 'Pts',

    // Bracket page
    bracket_title: 'SIMULATION',
    champion_2026: 'CHAMPION 2026',
    qualified_32: '32 QUALIFIED',
    knockout_title: 'KNOCKOUT BRACKET',
    edit_result: 'Edit result',
    home: 'Home',
    away: 'Away',
    goals: 'Goals',
    penalties: 'Penalties',
    penalty_winner: 'Penalty winner',
    save: 'Save',
    cancel: 'Cancel',
    clear_result: 'Clear result',
    round_qf: 'QUARTERS',
    round_sf: 'SEMIS',
    penalty_who_won: '⚽ Penalties — who won?',
    grp_label: 'GRP',
    tbd_label: 'To be determined',
    delete_all: '🗑 YES, DELETE ALL',
    delete_all_title: 'DELETE EVERYTHING?',
    delete_all_text: '<strong>All</strong> group and knockout results will be deleted.',

    // Floating actions / Credits
    change_language: 'Language',
    credits_btn: 'Info',
    credits_title: 'ÁLBUM DE FIGURITAS',
    credits_subtitle: 'PANINI ALBUM',
    credits_made: 'Digital experience created for fans.',
    credits_business_title: '🏢 For your business',
    credits_business_text: 'Want a custom album like this for your clients? Share it, fill in the stickers, simulate the tournament.',
    credits_contact: '💬 Contact on WhatsApp',
    credits_contact_msg: "Hello! I just watched your YouTube video about the 2026 sticker album and it blew my mind! I would love to know more about getting a custom version for my business or event. Let's talk!",
    credits_share_title: '📲 Share this album',
    credits_share_text: 'Check out this 2026 sticker album!',
    credits_close: 'Close',
    language_reset_confirm: 'This will reload the page to change the language.',

    // PageSwipe helper
    next: 'Next',
    previous: 'Previous',
    tutorial_title: 'Welcome to the Album!',
    tutorial_ok: 'Got it!',
    swipe_up_down: 'Swipe up/down<br>to change country',
    drag_explore: 'Drag to explore<br>the album',
    swipe_left_next: 'Swipe left<br>next country',
    swipe_right_prev: 'Swipe right<br>previous country',
    swipe_help_mobile:
      'Drag to move around. Swipe up/down to change country. Pinch to zoom.',
    swipe_help_desktop:
      'Swipe left/right to change country.'
    ,
    unofficial_title: 'STICKER ALBUM',
    unofficial_sub: 'NON-PROFIT · FAN PROJECT',
    rotate_title: 'Rotate your device',
    rotate_sub: 'This section looks best in landscape mode',
    rotate_btn: '🔄 Rotate screen',
    rotate_back_title: 'Rotate back to portrait',
    rotate_back_sub: 'Tilt your device upright to continue browsing'
  },
  es: {
    // Generic
    close: 'Cerrar',
    saved: 'Guardado',
    simulate: 'Simular',
    reset: 'Reiniciar',
    back: 'Volver',
    loading: 'Cargando…',
    tbd: 'Por determinar',
    group: 'Grupo',
    team: 'Equipo',

    // App / Router
    country_not_found: 'País no encontrado',
    page_not_found: '404 — Página no encontrada',

    // ARIA
    album_page_aria: 'Página del álbum',
    country_nav_aria: 'Navegación por países',
    flag_of: 'Bandera de',

    // Country curtain
    curtain_group_label: 'GRUPO',
    curtain_we_are: 'Porque esto es',
    curtain_we_are_empresa: 'EQUIPO',

    // Simulator curtain
    simulator: 'SIMULADOR',
    knockout_stage: 'ELIMINATORIAS',

    // Group Fixture Panel
    matches_of: 'PARTIDOS DE {team}',
    no_matches_team: 'No hay partidos registrados para este equipo.',

    // Group Simulator Panel
    simulator_group_title: 'SIMULADOR · {group}',
    calendar_group: 'CALENDARIO · {group}',
    no_matches_group: 'No hay partidos registrados para este grupo.',

    // Match card
    simulate_result_title: 'Simular resultado',
    simulate_result: 'Simular',
    saved_check: '✓ Guardado',
    official: 'Oficial',
    your_sim: 'tu sim',

    // Standings
    standings_group: 'GRUPO {group}',
    th_team: 'Equipo',
    th_pj: 'PJ',
    th_pg: 'PG',
    th_pe: 'PE',
    th_pp: 'PP',
    th_gf: 'GF',
    th_gc: 'GC',
    th_dg: 'DG',
    th_pts: 'Pts',

    // Bracket page
    bracket_title: 'SIMULACION',
    champion_2026: 'CAMPEÓN 2026',
    qualified_32: '32 CLASIFICADOS',
    knockout_title: 'CUADRO DE ELIMINATORIAS',
    edit_result: 'Editar resultado',
    home: 'Local',
    away: 'Visitante',
    goals: 'Goles',
    penalties: 'Penales',
    penalty_winner: 'Ganador por penales',
    save: 'Guardar',
    cancel: 'Cancelar',
    clear_result: 'Borrar resultado',
    round_qf: 'CUARTOS',
    round_sf: 'SEMIS',
    penalty_who_won: '⚽ Penales — ¿quién ganó?',
    grp_label: 'GRP',
    tbd_label: 'Por determinar',
    delete_all: '🗑 SÍ, BORRAR TODO',
    delete_all_title: '¿BORRAR TODO?',
    delete_all_text: 'Se eliminarán <strong>todos</strong> los resultados de grupos y eliminatorias.',

    // Floating actions / Credits
    change_language: 'Idioma',
    credits_btn: 'Info',
    credits_title: 'ÁLBUM DE FIGURITAS',
    credits_subtitle: 'ÁLBUM PANINI',
    credits_made: 'Experiencia digital creada para los fans.',
    credits_business_title: '🏢 Para tu negocio',
    credits_business_text: '¿Quieres un álbum así para tus clientes? Compártelo, llena los cromos, simula el torneo.',
    credits_contact: '💬 Contáctanos por WhatsApp',
    credits_contact_msg: "Hola! Acabo de ver tu video de YouTube sobre el Album Panini del Mundial 2026 y quede impresionado/a. Me interesa saber como tener algo asi para mi negocio o evento. Cuentame mas!",
    credits_share_title: '📲 Comparte este álbum',
    credits_share_text: '¡Mira este álbum de figuritas 2026!',
    credits_close: 'Cerrar',
    language_reset_confirm: 'Se recargará la página para cambiar el idioma.',

    // PageSwipe helper
    next: 'Siguiente',
    previous: 'Anterior',
    tutorial_title: '¡Bienvenido al Álbum!',
    tutorial_ok: '¡Entendido!',
    swipe_up_down: 'Desliza arriba/abajo<br>para cambiar país',
    drag_explore: 'Arrastra para explorar<br>el álbum',
    swipe_left_next: 'Desliza a la izquierda<br>siguiente país',
    swipe_right_prev: 'Desliza a la derecha<br>país anterior',
    swipe_help_mobile:
      'Arrastra para moverte por la página. Desliza arriba/abajo para cambiar de país. Pellizca para hacer zoom.',
    swipe_help_desktop:
      'Desliza a los lados para cambiar de país'
    ,
    unofficial_title: 'ÁLBUM DE FIGURITAS',
    unofficial_sub: 'SIN ÁNIMO DE LUCRO · PROYECTO FAN',
    rotate_title: 'Gira tu dispositivo',
    rotate_sub: 'Esta sección se ve mejor en horizontal',
    rotate_btn: '🔄 Girar pantalla',
    rotate_back_title: 'Vuelve al modo vertical',
    rotate_back_sub: 'Gira tu dispositivo para seguir disfrutando del álbum'
  }
};

let currentLang = 'en';

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  const next = LANGUAGES.includes(lang) ? lang : 'en';
  currentLang = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  document.documentElement.lang = next;
}

export function initI18n() {
  let stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch {}
  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  setLang(stored || (LANGUAGES.includes(browser) ? browser : 'en'));
  // Debug helper (optional)
  window.__setLang = setLang;
}

export function t(key, vars = null) {
  const table = dict[currentLang] || dict.en;
  let value = table[key] ?? dict.en[key] ?? key;
  if (vars && typeof value === 'string') {
    Object.entries(vars).forEach(([k, v]) => {
      value = value.replaceAll(`{${k}}`, String(v));
    });
  }
  return value;
}
