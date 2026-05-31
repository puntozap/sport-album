const ONESIGNAL_APP_ID    = '9e0cfb0b-799a-43ec-81c8-f15fae46a98b';
const ONESIGNAL_SAFARI_ID = 'web.onesignal.auto.012c2ba4-f65b-47d9-b245-c87f55979016';

const PLAYER_ID_KEY = 'onesignal_player_id';

export function getOneSignalPlayerId() {
  return localStorage.getItem(PLAYER_ID_KEY) || '';
}

export function initPushNotifications() {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({
      appId:          ONESIGNAL_APP_ID,
      safari_web_id:  ONESIGNAL_SAFARI_ID,
      notifyButton: {
        enable:   true,
        size:     'medium',
        position: 'bottom-left',
        offset:   { bottom: '70px', left: '8px' },
        text: {
          'tip.state.unsubscribed':  '¡Activa las notificaciones!',
          'tip.state.subscribed':    'Notificaciones activadas',
          'tip.state.blocked':       'Notificaciones bloqueadas',
          'message.prenotify':       '¡Entérate de lo nuevo!',
          'message.action.subscribed':   '¡Listo! Te avisaremos de novedades.',
          'message.action.resubscribed': 'Notificaciones reactivadas.',
          'message.action.unsubscribed': 'No recibirás más notificaciones.',
          'dialog.main.title':       'Notificaciones del Álbum 2026',
          'dialog.main.button.subscribe':   'ACTIVAR',
          'dialog.main.button.unsubscribe': 'DESACTIVAR',
          'dialog.blocked.title':    'Desbloquea las notificaciones',
          'dialog.blocked.message':  'Sigue estas instrucciones para activarlas:',
        },
        colors: {
          'circle.background':        '#0064ff',
          'circle.foreground':        'white',
          'badge.background':         '#c8102e',
          'badge.foreground':         'white',
          'badge.bordercolor':        'white',
          'pulse.color':              '#0064ff',
          'dialog.button.background.hovering': '#0064ff',
          'dialog.button.background.active':   '#003acc',
          'dialog.button.background':          '#0064ff',
          'dialog.button.foreground':          'white',
        },
      },
      welcomeNotification: {
        title:   '¡Álbum FIFA 2026!',
        message: 'Te avisaremos de nuevos artículos, noticias y novedades del Mundial. ⚽',
      },
      autoResubscribe: true,
    });

    // Capturar y guardar el Player ID para poder recibir notificaciones dirigidas
    try {
      const id = OneSignal.User?.PushSubscription?.id;
      if (id) localStorage.setItem(PLAYER_ID_KEY, id);

      OneSignal.User.PushSubscription.addEventListener('change', event => {
        const newId = event?.current?.id;
        if (newId) localStorage.setItem(PLAYER_ID_KEY, newId);
      });
    } catch (_) {}
  });
}
