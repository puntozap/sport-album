import '../styles/pong-page.css';
import { router } from '../router.js';

// ── Constantes del juego (deben coincidir con pong/server.js) ─────────────────
const VW = 400, VH = 700;
const BR = 10, PW = 90, PH = 14, PM = 35;

// En desarrollo apunta a localhost:3001.
// En producción sustituye la URL por la de tu servidor Railway.
const PONG_WS_URL = import.meta.env.VITE_PONG_WS_URL
  || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? `ws://localhost:3001`
      : null);

export function PongPage() {
  const wsUrl   = PONG_WS_URL;
  const joinUrl = `${location.origin}/pong`;
  const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&color=111111&bgcolor=ffffff&qzone=2&data=${encodeURIComponent(joinUrl)}`;

  // ── Construir DOM ──────────────────────────────────────────────────────────
  const page = document.createElement('div');
  page.className = 'pong-page';
  page.id = 'pong-page';

  page.innerHTML = `
    <!-- Barra superior -->
    <div class="pong-topbar">
      <button class="pong-back-btn" id="pong-back">← Álbum</button>
      <div class="pong-title">🏓 Pong</div>
      <div style="width:72px"></div>
    </div>

    <!-- Pantalla: conectando al servidor -->
    <div class="pong-screen" id="pong-sc-connecting">
      <div class="pong-screen-emoji pong-pulse">🔌</div>
      <h2>Conectando…</h2>
      <p id="pong-connect-msg">Buscando el servidor en<br><code style="color:#6633cc">${wsUrl || '(sin configurar)'}</code></p>
    </div>

    <!-- Pantalla: esperando rival (muestra QR) -->
    <div class="pong-screen" id="pong-sc-waiting" hidden>
      <div class="pong-screen-emoji">🏓</div>
      <h2>Esperando rival</h2>
      <div class="pong-qr-card">
        <img src="${qrSrc}" alt="QR para unirse">
      </div>
      <p>Escanea el QR con el otro teléfono<br>o comparte este enlace:</p>
      <div class="pong-qr-url">${joinUrl}</div>
      <div id="pong-player-badge"></div>
    </div>

    <!-- Canvas del juego -->
    <div class="pong-canvas-wrap" id="pong-canvas-wrap" hidden>
      <canvas id="pong-canvas"></canvas>
    </div>
    <div class="pong-hint" id="pong-hint" hidden>Desliza el dedo para mover tu paleta</div>

    <!-- Pantalla: game over -->
    <div class="pong-screen" id="pong-sc-over" hidden>
      <div class="pong-screen-emoji" id="pong-over-emo">🏆</div>
      <h2 id="pong-over-title">Fin del juego</h2>
      <p id="pong-over-sub"></p>
      <div class="pong-score-big" id="pong-over-score"></div>

      <!-- Estado normal: botón pedir revancha -->
      <div id="pong-rematch-request">
        <button class="pong-btn pong-btn-primary" id="pong-btn-rematch">↺ Pedir revancha</button>
      </div>

      <!-- Esperando que el rival acepte -->
      <div id="pong-rematch-waiting" hidden>
        <p class="pong-pulse" style="color:rgba(255,255,255,.5);font-size:13px">
          ⏳ Esperando respuesta del rival…
        </p>
        <button class="pong-btn pong-btn-ghost" id="pong-btn-cancel-rematch" style="margin-top:4px;font-size:13px;padding:8px 20px">
          Cancelar
        </button>
      </div>

      <!-- El rival pide revancha: aceptar / rechazar -->
      <div id="pong-rematch-incoming" hidden>
        <p style="color:rgba(255,255,255,.7);font-size:14px;margin-bottom:10px">
          🏓 El rival quiere la revancha
        </p>
        <div style="display:flex;gap:10px">
          <button class="pong-btn pong-btn-primary" id="pong-btn-accept" style="flex:1">✓ Aceptar</button>
          <button class="pong-btn pong-btn-ghost"   id="pong-btn-decline" style="flex:1">✗ Rechazar</button>
        </div>
      </div>

      <!-- Revancha rechazada -->
      <div id="pong-rematch-declined" hidden>
        <p style="color:#c8102e;font-size:14px">❌ El rival rechazó la revancha</p>
      </div>

      <button class="pong-btn pong-btn-ghost" id="pong-btn-back2" style="margin-top:4px">← Volver al álbum</button>
    </div>

    <!-- Pantalla: desconectado -->
    <div class="pong-screen" id="pong-sc-dc" hidden>
      <div class="pong-screen-emoji">🔌</div>
      <h2>Desconectado</h2>
      <p id="pong-dc-msg">El otro jugador salió<br>o el servidor no está activo.</p>
      <button class="pong-btn pong-btn-primary" id="pong-btn-reconnect">↺ Reconectar</button>
      <button class="pong-btn pong-btn-ghost" id="pong-btn-back3">← Volver al álbum</button>
    </div>
  `;

  document.body.appendChild(page);

  // ── Canvas + escala ────────────────────────────────────────────────────────
  const canvas = page.querySelector('#pong-canvas');
  const ctx    = canvas.getContext('2d');
  let scale    = 1;
  let running  = true;

  function resize() {
    scale = Math.min(window.innerWidth / VW, window.innerHeight / VH);
    canvas.width  = Math.round(VW * scale * devicePixelRatio);
    canvas.height = Math.round(VH * scale * devicePixelRatio);
    canvas.style.width  = Math.round(VW * scale) + 'px';
    canvas.style.height = Math.round(VH * scale) + 'px';
  }
  resize();
  const resizeObs = () => resize();
  window.addEventListener('resize', resizeObs);

  // ── Estado ────────────────────────────────────────────────────────────────
  let playerNum = 0;
  let gs = null;
  let wasPlaying = false;

  // ── WebSocket con reconexión automática ───────────────────────────────────
  let ws = null;
  let reconnectTimer = null;
  let intentional = false;

  function connect() {
    clearTimeout(reconnectTimer);
    show('connecting');

    if (!wsUrl) {
      page.querySelector('#pong-connect-msg').innerHTML =
        `Servidor no configurado.<br><small style="color:rgba(255,255,255,.4)">Añade <b>VITE_PONG_WS_URL</b> al archivo <b>.env</b></small>`;
      return;
    }

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      page.querySelector('#pong-connect-msg').innerHTML =
        `Conectado a <code style="color:#6633cc">${wsUrl}</code>`;
    };

    ws.onerror = () => {
      page.querySelector('#pong-connect-msg').innerHTML =
        `No se encontró el servidor en <code style="color:#c8102e">${wsUrl}</code><br><small style="color:rgba(255,255,255,.4)">¿Está corriendo <b>node pong/server.js</b>?</small>`;
    };

    ws.onclose = () => {
      if (intentional || !running) return;
      gs = null;
      show('dc');
      page.querySelector('#pong-dc-msg').textContent =
        playerNum ? 'El otro jugador salió o se perdió la conexión.' : 'No se pudo conectar al servidor.';
      reconnectTimer = setTimeout(connect, 4000);
    };

    ws.onmessage = e => {
      const m = JSON.parse(e.data);

      if (m.type === 'welcome') {
        playerNum = m.player;
        const badge = page.querySelector('#pong-player-badge');
        badge.innerHTML = `<div class="pong-badge pong-badge-${playerNum}">
          Jugador ${playerNum} ${playerNum === 1 ? '🟣 paleta abajo' : '🔴 paleta arriba'}
        </div>`;
        show('waiting');
      }

      if (m.type === 'waiting') {
        show('waiting');
      }

      if (m.type === 'start') {
        gs = m.state;
        wasPlaying = true;
        show('game');
      }

      if (m.type === 'state') {
        gs = { ball: m.ball, p1: m.p1, p2: m.p2, status: m.status, winner: m.winner };
        if (m.status === 'gameover' && wasPlaying) {
          wasPlaying = false;
          showOver(m.winner);
        }
        if (m.status === 'playing') wasPlaying = true;
      }

      if (m.type === 'disconnected') {
        show('dc');
        page.querySelector('#pong-dc-msg').textContent = 'El otro jugador abandonó la partida.';
        clearTimeout(reconnectTimer);
      }
    };
  }

  connect();

  // ── Controles táctiles ────────────────────────────────────────────────────
  function sendPaddle(clientX) {
    if (!gs || gs.status !== 'playing' || !ws || ws.readyState !== 1) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(PW / 2, Math.min(VW - PW / 2, (clientX - rect.left) / scale));
    ws.send(JSON.stringify({ type: 'paddle', x }));
  }

  canvas.addEventListener('touchstart', e => { e.preventDefault(); sendPaddle(e.touches[0].clientX); }, { passive: false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); sendPaddle(e.touches[0].clientX); }, { passive: false });
  canvas.addEventListener('mousemove',  e => sendPaddle(e.clientX));

  // ── Botones ────────────────────────────────────────────────────────────────
  function goBack() {
    intentional = true;
    clearTimeout(reconnectTimer);
    ws?.close();
    running = false;
    window.removeEventListener('resize', resizeObs);
    page.remove();
    router.navigate('/');
  }

  page.querySelector('#pong-back').addEventListener('click', goBack);
  page.querySelector('#pong-btn-back2').addEventListener('click', goBack);
  page.querySelector('#pong-btn-back3').addEventListener('click', goBack);

  page.querySelector('#pong-btn-restart').addEventListener('click', () => {
    if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'restart' }));
    show('game');
  });

  page.querySelector('#pong-btn-reconnect').addEventListener('click', () => {
    clearTimeout(reconnectTimer);
    playerNum = 0;
    connect();
  });

  // ── Render ────────────────────────────────────────────────────────────────
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  function draw() {
    if (!running) return;
    requestAnimationFrame(draw);
    if (!gs || page.querySelector('#pong-canvas-wrap').hidden) return;

    const s = scale * devicePixelRatio;
    ctx.setTransform(s, 0, 0, s, 0, 0);

    // Fondo
    const bg = ctx.createLinearGradient(0, 0, VW, VH);
    bg.addColorStop(0, '#060b14'); bg.addColorStop(1, '#0a0618');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);

    // Zonas de color
    const z1 = ctx.createLinearGradient(0, VH/2, 0, VH);
    z1.addColorStop(0, 'transparent'); z1.addColorStop(1, 'rgba(102,51,204,.07)');
    ctx.fillStyle = z1; ctx.fillRect(0, VH/2, VW, VH/2);
    const z2 = ctx.createLinearGradient(0, 0, 0, VH/2);
    z2.addColorStop(0, 'rgba(200,16,46,.07)'); z2.addColorStop(1, 'transparent');
    ctx.fillStyle = z2; ctx.fillRect(0, 0, VW, VH/2);

    // Línea central
    ctx.setLineDash([14, 8]); ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, VH/2); ctx.lineTo(VW, VH/2); ctx.stroke();
    ctx.setLineDash([]);

    const { ball, p1, p2 } = gs;

    // Marcadores fantasma
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 130px Arial'; ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.fillText(p2.score, VW/2, VH*.25);
    ctx.fillText(p1.score, VW/2, VH*.75);

    // Etiquetas jugador
    ctx.font = 'bold 13px Arial';
    ctx.textBaseline = 'top';
    ctx.fillStyle = playerNum === 2 ? 'rgba(200,16,46,.9)' : 'rgba(200,16,46,.3)';
    ctx.fillText(playerNum === 2 ? '← TÚ  P2 →' : 'P2  ' + p2.score, VW/2, 8);
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = playerNum === 1 ? 'rgba(102,51,204,.9)' : 'rgba(102,51,204,.3)';
    ctx.fillText(playerNum === 1 ? '← TÚ  P1 →' : 'P1  ' + p1.score, VW/2, VH - 8);

    // Trail
    if (ball.trail) {
      ball.trail.forEach((pt, i) => {
        const a = (i / ball.trail.length) * .4;
        const r2 = BR * .6 * (i / ball.trail.length);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r2, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      });
    }

    // Glow bola
    const gl = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BR*3);
    gl.addColorStop(0, 'rgba(255,255,255,.22)'); gl.addColorStop(1, 'transparent');
    ctx.fillStyle = gl; ctx.fillRect(ball.x-BR*3, ball.y-BR*3, BR*6, BR*6);

    // Bola
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Paleta P2 (arriba) — roja
    const p2y = PM; const isMe2 = playerNum === 2;
    ctx.shadowColor = '#c8102e'; ctx.shadowBlur = isMe2 ? 28 : 10;
    rr(p2.x - PW/2, p2y, PW, PH, 7);
    const g2 = ctx.createLinearGradient(p2.x - PW/2, 0, p2.x + PW/2, 0);
    g2.addColorStop(0, isMe2 ? '#c8102e' : '#5a0815'); g2.addColorStop(1, isMe2 ? '#e8305a' : '#7a0a1e');
    ctx.fillStyle = g2; ctx.fill();

    // Paleta P1 (abajo) — morada
    const p1y = VH - PM - PH; const isMe1 = playerNum === 1;
    ctx.shadowColor = '#6633cc'; ctx.shadowBlur = isMe1 ? 28 : 10;
    rr(p1.x - PW/2, p1y, PW, PH, 7);
    const g1 = ctx.createLinearGradient(p1.x - PW/2, 0, p1.x + PW/2, 0);
    g1.addColorStop(0, isMe1 ? '#6633cc' : '#22104f'); g1.addColorStop(1, isMe1 ? '#9955ff' : '#3a1880');
    ctx.fillStyle = g1; ctx.fill();

    ctx.shadowBlur = 0;
  }

  requestAnimationFrame(draw);

  // ── Helpers de pantalla ───────────────────────────────────────────────────
  function show(name) {
    ['connecting', 'waiting', 'over', 'dc'].forEach(n => {
      page.querySelector(`#pong-sc-${n}`).hidden = true;
    });
    page.querySelector('#pong-canvas-wrap').hidden = true;
    page.querySelector('#pong-hint').hidden = true;

    if (name === 'game') {
      page.querySelector('#pong-canvas-wrap').hidden = false;
      page.querySelector('#pong-hint').hidden = false;
    } else {
      page.querySelector(`#pong-sc-${name}`).hidden = false;
    }
  }

  function showOver(winner) {
    show('over');
    const isWinner = winner === playerNum;
    page.querySelector('#pong-over-emo').textContent   = isWinner ? '🏆' : '😅';
    page.querySelector('#pong-over-title').textContent = isWinner ? '¡Ganaste!' : '¡Perdiste!';
    page.querySelector('#pong-over-sub').textContent   = isWinner
      ? '¡Eres el campeón del Pong! 🎉'
      : '¡El otro jugador fue más rápido! 😤';
    if (gs) page.querySelector('#pong-over-score').textContent = `${gs.p1.score} — ${gs.p2.score}`;
  }

  return page;
}
