const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');
const qr = require('qrcode-terminal');

const PORT = process.env.PORT || 3001;

// ── Constantes del juego ──────────────────────────────────────────────────────
const W = 400, H = 700;
const BALL_R = 10;
const PAD_W = 90, PAD_H = 14, PAD_MARGIN = 35;
const INIT_SPEED = 5;
const MAX_SPEED = 14;
const WIN_SCORE = 7;

// ── Estado ────────────────────────────────────────────────────────────────────
let gs = null;
const slots = [null, null]; // [ws_p1, ws_p2]
let loop = null;
let rematchRequester = null; // slot del jugador que pidió revancha

function newState() {
  return {
    ball: spawnBall(Math.random() > .5 ? 1 : -1),
    p1: { x: W / 2, score: 0 },
    p2: { x: W / 2, score: 0 },
    status: 'playing',
    winner: null,
    countdown: 3,
  };
}

function spawnBall(dir) {
  const a = (Math.random() * 50 - 25) * Math.PI / 180;
  return {
    x: W / 2, y: H / 2,
    vx: Math.sin(a) * INIT_SPEED,
    vy: dir * Math.cos(a) * INIT_SPEED,
    trail: [],
  };
}

// ── Física ────────────────────────────────────────────────────────────────────
function tick() {
  if (!gs || gs.status !== 'playing') return;
  const { ball, p1, p2 } = gs;

  // Trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 9) ball.trail.shift();

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Paredes
  if (ball.x - BALL_R < 0)  { ball.x = BALL_R;      ball.vx =  Math.abs(ball.vx); }
  if (ball.x + BALL_R > W)  { ball.x = W - BALL_R;  ball.vx = -Math.abs(ball.vx); }

  // Paleta P1 (abajo)
  const p1y = H - PAD_MARGIN - PAD_H;
  if (ball.vy > 0 &&
      ball.y + BALL_R >= p1y &&
      ball.y + BALL_R <= p1y + PAD_H + 8 &&
      ball.x + BALL_R > p1.x - PAD_W / 2 &&
      ball.x - BALL_R < p1.x + PAD_W / 2) {
    ball.y = p1y - BALL_R;
    ball.vy = -Math.abs(ball.vy);
    ball.vx = ((ball.x - p1.x) / (PAD_W / 2)) * 6;
    boost(ball);
  }

  // Paleta P2 (arriba)
  const p2y = PAD_MARGIN;
  if (ball.vy < 0 &&
      ball.y - BALL_R <= p2y + PAD_H &&
      ball.y - BALL_R >= p2y - 8 &&
      ball.x + BALL_R > p2.x - PAD_W / 2 &&
      ball.x - BALL_R < p2.x + PAD_W / 2) {
    ball.y = p2y + PAD_H + BALL_R;
    ball.vy = Math.abs(ball.vy);
    ball.vx = ((ball.x - p2.x) / (PAD_W / 2)) * 6;
    boost(ball);
  }

  // Puntos
  if (ball.y - BALL_R > H) {
    p2.score++;
    checkWin(2) || resetBall(1);
  } else if (ball.y + BALL_R < 0) {
    p1.score++;
    checkWin(1) || resetBall(-1);
  }
}

function boost(ball) {
  const sp = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
  const nsp = Math.min(sp * 1.06, MAX_SPEED);
  ball.vx = (ball.vx / sp) * nsp;
  ball.vy = (ball.vy / sp) * nsp;
}

function checkWin(winner) {
  const score = winner === 1 ? gs.p1.score : gs.p2.score;
  if (score >= WIN_SCORE) {
    gs.status = 'gameover';
    gs.winner = winner;
    return true;
  }
  return false;
}

function resetBall(dir) {
  gs.ball = spawnBall(dir);
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  slots.forEach(ws => ws && ws.readyState === 1 && ws.send(msg));
}

function startGameLoop() {
  if (loop) return;
  loop = setInterval(() => {
    tick();
    if (gs) broadcast({ type: 'state', ...gs });
  }, 1000 / 60);
}

function stopGameLoop() {
  if (loop) { clearInterval(loop); loop = null; }
}

// ── HTTP + WS ─────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(CLIENT_HTML);
});

const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  const slot = slots[0] === null ? 0 : slots[1] === null ? 1 : -1;
  if (slot === -1) { ws.close(); return; }

  slots[slot] = ws;
  ws.slot = slot;
  ws.send(JSON.stringify({ type: 'welcome', player: slot + 1 }));

  if (slots[0] && slots[1]) {
    gs = newState();
    broadcast({ type: 'start', state: gs });
    startGameLoop();
  } else {
    ws.send(JSON.stringify({ type: 'waiting' }));
  }

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (!gs) return;

      if (msg.type === 'paddle') {
        const px = Math.max(PAD_W / 2, Math.min(W - PAD_W / 2, msg.x));
        if (ws.slot === 0) gs.p1.x = px;
        if (ws.slot === 1) gs.p2.x = px;
      }

      if (msg.type === 'rematch_request' && gs.status === 'gameover') {
        rematchRequester = ws.slot;
        broadcast({ type: 'rematch_requested', byPlayer: ws.slot + 1 });
      }

      if (msg.type === 'rematch_accept' && rematchRequester !== null && ws.slot !== rematchRequester) {
        rematchRequester = null;
        gs = newState();
        broadcast({ type: 'start', state: gs });
      }

      if (msg.type === 'rematch_decline' && rematchRequester !== null && ws.slot !== rematchRequester) {
        const decliner = ws.slot + 1;
        rematchRequester = null;
        broadcast({ type: 'rematch_declined', byPlayer: decliner });
      }
    } catch {}
  });

  ws.on('close', () => {
    slots[ws.slot] = null;
    stopGameLoop();
    gs = null;
    rematchRequester = null;
    const other = slots[1 - ws.slot];
    if (other && other.readyState === 1) {
      other.send(JSON.stringify({ type: 'disconnected' }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🏓  Servidor Pong iniciado\n');
  const nets = os.networkInterfaces();
  const ips = Object.values(nets).flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .map(n => n.address);

  const url = `http://${ips[0] || 'localhost'}:${PORT}`;

  qr.generate(url, { small: true }, code => {
    console.log(code);
    console.log(`  📱  Escanea el QR o abre:  ${url}\n`);
    ips.slice(1).forEach(ip => console.log(`         también en:  http://${ip}:${PORT}`));
    console.log('\n  (Necesitas 2 jugadores conectados para que empiece el juego)\n');
  });
});

// ── HTML del cliente (embebido) ───────────────────────────────────────────────
const CLIENT_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">
<title>🏓 Pong 2 Jugadores</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{
  height:100%;width:100%;
  background:#060b14;color:#fff;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  overflow:hidden;user-select:none;-webkit-user-select:none;
  touch-action:none;
}
.screen{
  position:fixed;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:18px;padding:28px;text-align:center;
}
.screen[hidden]{display:none!important}
#game-wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#060b14}
#game-wrap[hidden]{display:none!important}
#canvas{display:block;touch-action:none}
h2{font-size:26px;font-weight:800;line-height:1.2}
.sub{color:rgba(255,255,255,.55);font-size:14px;line-height:1.5;max-width:280px}
.badge{display:inline-block;padding:8px 22px;border-radius:999px;font-weight:700;font-size:15px;margin-top:4px}
.b1{background:rgba(102,51,204,.3);border:1px solid #6633cc;color:#b08aff}
.b2{background:rgba(200,16,46,.3);border:1px solid #c8102e;color:#ff8a9f}
.dot{animation:blink 1.2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.btn{
  padding:13px 32px;border:none;border-radius:12px;
  font-size:15px;font-weight:700;cursor:pointer;
  background:linear-gradient(135deg,#6633cc,#00a9bd);color:#fff;
  transition:opacity .2s;
}
.btn:hover{opacity:.85}
.score-big{font-size:36px;font-weight:900;letter-spacing:8px;color:#fff}
#hint{position:fixed;bottom:max(env(safe-area-inset-bottom),10px);left:0;right:0;
  text-align:center;font-size:11px;color:rgba(255,255,255,.22);pointer-events:none}
</style>
</head>
<body>

<!-- Pantalla espera -->
<div class="screen" id="sc-wait">
  <div style="font-size:60px">🏓</div>
  <h2>Pong<br>Multijugador</h2>
  <p class="sub dot" id="wait-msg">Conectando al servidor…</p>
  <div id="player-tag" hidden></div>
  <p class="sub" id="wait-hint" hidden></p>
</div>

<!-- Juego -->
<div id="game-wrap" hidden>
  <canvas id="canvas"></canvas>
  <div id="hint">Desliza el dedo horizontalmente para mover tu paleta</div>
</div>

<!-- Game over -->
<div class="screen" id="sc-over" hidden>
  <div id="over-emo" style="font-size:60px">🏆</div>
  <h2 id="over-title">Fin</h2>
  <p class="sub" id="over-sub"></p>
  <div class="score-big" id="over-score"></div>
  <button class="btn" id="btn-restart">↺ Jugar de nuevo</button>
</div>

<!-- Desconectado -->
<div class="screen" id="sc-dc" hidden>
  <div style="font-size:60px">🔌</div>
  <h2>Desconectado</h2>
  <p class="sub">El otro jugador salió de la partida.</p>
  <button class="btn" onclick="location.reload()">Volver a conectar</button>
</div>

<script>
// ── Constantes (deben coincidir con server.js) ──────────────────────────
const VW=400,VH=700,BR=10,PW=90,PH=14,PM=35;

// ── Estado ──────────────────────────────────────────────────────────────
let pn=0, gs=null, scale=1, wasPlaying=false;

// ── Canvas ──────────────────────────────────────────────────────────────
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d');

function resize(){
  scale=Math.min(window.innerWidth/VW, window.innerHeight/VH);
  canvas.width=Math.round(VW*scale*devicePixelRatio);
  canvas.height=Math.round(VH*scale*devicePixelRatio);
  canvas.style.width=Math.round(VW*scale)+'px';
  canvas.style.height=Math.round(VH*scale)+'px';
}
resize();
window.addEventListener('resize',resize);

// ── WebSocket ──────────────────────────────────────────────────────────
const wsProto=location.protocol==='https:'?'wss:':'ws:';
const ws=new WebSocket(wsProto+'//'+location.host);

ws.onopen=()=>{ document.getElementById('wait-msg').textContent='Esperando al segundo jugador…'; };

ws.onerror=()=>{
  document.getElementById('wait-msg').textContent='❌ No se pudo conectar al servidor';
  document.getElementById('wait-msg').style.color='#c8102e';
  document.getElementById('wait-msg').classList.remove('dot');
};

ws.onmessage=e=>{
  const m=JSON.parse(e.data);

  if(m.type==='welcome'){
    pn=m.player;
    const tag=document.getElementById('player-tag');
    tag.hidden=false;
    tag.innerHTML='<span class="badge b'+pn+'">Jugador '+pn+(pn===1?' 🟣':' 🔴')+'</span>';
    const hint=document.getElementById('wait-hint');
    hint.hidden=false;
    hint.textContent=pn===1?'Tu paleta estará abajo (morada 🟣)':'Tu paleta estará arriba (roja 🔴)';
  }

  if(m.type==='start'){
    gs=m.state; wasPlaying=true;
    show('game');
  }

  if(m.type==='state'){
    gs={ball:m.ball,p1:m.p1,p2:m.p2,status:m.status,winner:m.winner};
    if(m.status==='gameover' && wasPlaying){ wasPlaying=false; showOver(m.winner); }
    if(m.status==='playing') wasPlaying=true;
  }

  if(m.type==='disconnected') show('dc');
};

// ── Controles (touch + mouse) ──────────────────────────────────────────
function sendPaddle(clientX){
  if(!gs||gs.status!=='playing'||ws.readyState!==1) return;
  const rect=canvas.getBoundingClientRect();
  const x=Math.max(PW/2,Math.min(VW-PW/2,(clientX-rect.left)/scale));
  ws.send(JSON.stringify({type:'paddle',x}));
}
canvas.addEventListener('touchstart',e=>{e.preventDefault();sendPaddle(e.touches[0].clientX);},{passive:false});
canvas.addEventListener('touchmove',e=>{e.preventDefault();sendPaddle(e.touches[0].clientX);},{passive:false});
canvas.addEventListener('mousemove',e=>sendPaddle(e.clientX));

document.getElementById('btn-restart').addEventListener('click',()=>{
  if(ws.readyState===1) ws.send(JSON.stringify({type:'restart'}));
  show('game');
});

// ── Render helpers ─────────────────────────────────────────────────────
function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

// ── Render loop ────────────────────────────────────────────────────────
function draw(){
  requestAnimationFrame(draw);
  if(!gs||document.getElementById('game-wrap').hidden) return;

  const s=scale*devicePixelRatio;
  ctx.setTransform(s,0,0,s,0,0);

  // Fondo
  const bg=ctx.createLinearGradient(0,0,VW,VH);
  bg.addColorStop(0,'#060b14');bg.addColorStop(1,'#0a0618');
  ctx.fillStyle=bg;ctx.fillRect(0,0,VW,VH);

  // Zonas de color
  const z1=ctx.createLinearGradient(0,VH/2,0,VH);
  z1.addColorStop(0,'transparent');z1.addColorStop(1,'rgba(102,51,204,.07)');
  ctx.fillStyle=z1;ctx.fillRect(0,VH/2,VW,VH/2);
  const z2=ctx.createLinearGradient(0,0,0,VH/2);
  z2.addColorStop(0,'rgba(200,16,46,.07)');z2.addColorStop(1,'transparent');
  ctx.fillStyle=z2;ctx.fillRect(0,0,VW,VH/2);

  // Línea central
  ctx.setLineDash([14,8]);ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,VH/2);ctx.lineTo(VW,VH/2);ctx.stroke();
  ctx.setLineDash([]);

  const {ball,p1,p2}=gs;

  // Marcadores fantasma
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 130px Arial';ctx.fillStyle='rgba(255,255,255,.04)';
  ctx.fillText(p2.score,VW/2,VH*.25);
  ctx.fillText(p1.score,VW/2,VH*.75);

  // Etiquetas
  ctx.font='bold 13px Arial';
  ctx.textBaseline='top';
  ctx.fillStyle=pn===2?'rgba(200,16,46,.9)':'rgba(200,16,46,.3)';
  ctx.fillText(pn===2?'← TÚ  P2 →':'P2  '+p2.score,VW/2,8);
  ctx.textBaseline='bottom';
  ctx.fillStyle=pn===1?'rgba(102,51,204,.9)':'rgba(102,51,204,.3)';
  ctx.fillText(pn===1?'← TÚ  P1 →':'P1  '+p1.score,VW/2,VH-8);

  // Trail de la bola
  if(ball.trail){
    ball.trail.forEach((pt,i)=>{
      const a=(i/ball.trail.length)*.4;
      const r2=BR*.6*(i/ball.trail.length);
      ctx.beginPath();ctx.arc(pt.x,pt.y,r2,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.fill();
    });
  }

  // Glow bola
  const gl=ctx.createRadialGradient(ball.x,ball.y,0,ball.x,ball.y,BR*3);
  gl.addColorStop(0,'rgba(255,255,255,.22)');gl.addColorStop(1,'transparent');
  ctx.fillStyle=gl;ctx.fillRect(ball.x-BR*3,ball.y-BR*3,BR*6,BR*6);

  // Bola
  ctx.beginPath();ctx.arc(ball.x,ball.y,BR,0,Math.PI*2);
  ctx.fillStyle='#fff';ctx.fill();

  // Paleta P2 (arriba) — roja
  const p2y=PM;const isMe2=pn===2;
  ctx.shadowColor='#c8102e';ctx.shadowBlur=isMe2?28:10;
  rr(p2.x-PW/2,p2y,PW,PH,7);
  const g2=ctx.createLinearGradient(p2.x-PW/2,0,p2.x+PW/2,0);
  g2.addColorStop(0,isMe2?'#c8102e':'#6b0a1c');
  g2.addColorStop(1,isMe2?'#e8305a':'#8b0a24');
  ctx.fillStyle=g2;ctx.fill();

  // Paleta P1 (abajo) — morada
  const p1y=VH-PM-PH;const isMe1=pn===1;
  ctx.shadowColor='#6633cc';ctx.shadowBlur=isMe1?28:10;
  rr(p1.x-PW/2,p1y,PW,PH,7);
  const g1=ctx.createLinearGradient(p1.x-PW/2,0,p1.x+PW/2,0);
  g1.addColorStop(0,isMe1?'#6633cc':'#2d1566');
  g1.addColorStop(1,isMe1?'#9955ff':'#4a1f99');
  ctx.fillStyle=g1;ctx.fill();

  ctx.shadowBlur=0;
}

// ── Gestión de pantallas ───────────────────────────────────────────────
function show(name){
  ['sc-wait','game-wrap','sc-over','sc-dc'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.hidden=true;
  });
  const target=name==='game'?'game-wrap':'sc-'+name;
  const el=document.getElementById(target);
  if(el) el.hidden=false;
}

function showOver(winner){
  show('over');
  const isW=winner===pn;
  document.getElementById('over-emo').textContent=isW?'🏆':'😅';
  document.getElementById('over-title').textContent=isW?'¡GANASTE!':'¡Perdiste!';
  document.getElementById('over-sub').textContent=isW
    ?'¡Eres el campeón del Pong! 🎉'
    :'El otro jugador fue más rápido 😤 ¡Reváncha!';
  if(gs) document.getElementById('over-score').textContent=gs.p1.score+' — '+gs.p2.score;
}

draw();
</script>
</body>
</html>`;
