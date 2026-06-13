/**
 * SimulationPresentation — física IDÉNTICA a GolAIzo (index.html descargado).
 * Los goles ocurren cuando la pelota entra naturalmente en la portería,
 * igual que en el original. No hay goles pre-programados.
 */
import { getTeamId } from '../data/teamNameMap.js';
import { shareMatchResult } from '../utils/socialShare.js';

/* ── Flag codes (flagcdn.com) ─────────────────────────────────────────────── */
const FLAG_CODES = {
  mexico:'mx', southafrica:'za', korearepublic:'kr', czechia:'cz',
  canada:'ca', bosniaandherzegovina:'ba', qatar:'qa', switzerland:'ch',
  brazil:'br', morocco:'ma', haiti:'ht', scotland:'gb-sct',
  unitedstates:'us', paraguay:'py', australia:'au', turkiye:'tr',
  germany:'de', curacao:'cw', cotedivoire:'ci', ecuador:'ec',
  netherlands:'nl', japan:'jp', sweden:'se', tunisia:'tn',
  belgium:'be', egypt:'eg', iran:'ir', newzealand:'nz',
  spain:'es', capeverde:'cv', saudiarabia:'sa', uruguay:'uy',
  france:'fr', senegal:'sn', iraq:'iq', norway:'no',
  argentina:'ar', algeria:'dz', austria:'at', jordan:'jo',
  portugal:'pt', drcongo:'cd', uzbekistan:'uz', colombia:'co',
  england:'gb-eng', croatia:'hr', ghana:'gh', panama:'pa'
};

/* ── Colores de equipo ───────────────────────────────────────────────────── */
const TEAM_COLORS = {
  mexico:'#0a8f4d', southafrica:'#008751', korearepublic:'#c60c30', czechia:'#11457e',
  canada:'#ff0000', bosniaandherzegovina:'#002395', qatar:'#8a1538', switzerland:'#d52b1e',
  brazil:'#f1c40f', morocco:'#c1272d', haiti:'#00209f', scotland:'#0a3d7a',
  unitedstates:'#3c3b6e', paraguay:'#d52b1e', australia:'#ffcd00', turkiye:'#e30a17',
  germany:'#555', curacao:'#002b7f', cotedivoire:'#f77f00', ecuador:'#ffd100',
  netherlands:'#f36c21', japan:'#bc002d', sweden:'#0a6aa7', tunisia:'#e70013',
  belgium:'#c8a200', egypt:'#ce1126', iran:'#239f40', newzealand:'#444',
  spain:'#c60b1e', capeverde:'#003893', saudiarabia:'#006c35', uruguay:'#4f8fd6',
  france:'#0055a4', senegal:'#00853f', iraq:'#cf142b', norway:'#ba0c2f',
  argentina:'#75aadb', algeria:'#1a7a4c', austria:'#ed2939', jordan:'#1f7a3d',
  portugal:'#c8102e', drcongo:'#1f8fff', uzbekistan:'#1eb53a', colombia:'#fcd116',
  england:'#cfd3da', croatia:'#ff0000', ghana:'#006b3f', panama:'#005293'
};
const ALT=['#f1c40f','#2980b9','#e74c3c','#27ae60','#9b59b6','#e67e22','#1abc9c','#ecf0f1','#16a085','#ff7bac'];

function hx2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function cdist(a,b){const x=hx2rgb(a),y=hx2rgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);}
function pairColors(ca,cb){if(cdist(ca,cb)>85)return[ca,cb];let best=ALT[0],bd=-1;ALT.forEach(c=>{const d=cdist(c,ca);if(d>bd){bd=d;best=c;}});return[ca,best];}

function getFlagUrl(name){const id=getTeamId(name);const code=id&&FLAG_CODES[id];return code?`https://flagcdn.com/w80/${code}.png`:'';}
function getFlagImg(name,cls=''){const url=getFlagUrl(name);return url?`<img src="${url}" alt="${name}" class="gai-flag-img ${cls}" loading="eager">`:'🏳️';}
function getColor(name){const id=getTeamId(name);return(id&&TEAM_COLORS[id])||'#3498db';}

/* ── Audio — copia exacta de GolAIzo ────────────────────────────────────── */
let actx=null;
function ensureAudio(){try{if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}catch{}}
function whistle(dur,when){if(!actx)return;const t=actx.currentTime+(when||0);const o=actx.createOscillator(),g=actx.createGain(),bp=actx.createBiquadFilter(),lfo=actx.createOscillator(),lg=actx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(2050,t);lfo.frequency.value=20;lg.gain.value=140;lfo.connect(lg);lg.connect(o.frequency);bp.type='bandpass';bp.frequency.value=2050;bp.Q.value=7;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.3,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(bp);bp.connect(g);g.connect(actx.destination);o.start(t);lfo.start(t);o.stop(t+dur+0.02);lfo.stop(t+dur+0.02);}
function kickoffWhistle(){ensureAudio();whistle(0.5,0);}
function finalWhistle(){ensureAudio();whistle(0.16,0);whistle(0.16,0.24);whistle(0.55,0.48);}
function goalSound(){ensureAudio();if(!actx)return;const t=actx.currentTime;[392,523,659,784].forEach((f,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.type='square';o.frequency.value=f;const tt=t+i*0.08;g.gain.setValueAtTime(0.0001,tt);g.gain.exponentialRampToValueAtTime(0.22,tt+0.02);g.gain.exponentialRampToValueAtTime(0.0001,tt+0.16);o.connect(g);g.connect(actx.destination);o.start(tt);o.stop(tt+0.18);});const buf=actx.createBuffer(1,actx.sampleRate*0.5,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.5);const src=actx.createBufferSource();src.buffer=buf;const ng=actx.createGain();ng.gain.value=0.13;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;src.connect(lp);lp.connect(ng);ng.connect(actx.destination);src.start();}
function ballTouchSound(){ensureAudio();if(!actx)return;const t=actx.currentTime,buf=actx.createBuffer(1,actx.sampleRate*0.12,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.5);const src=actx.createBufferSource();src.buffer=buf;const g=actx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.18,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+0.11);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;src.connect(lp);lp.connect(g);g.connect(actx.destination);src.start();}
function wallBounceSound(){ensureAudio();if(!actx)return;const t=actx.currentTime,buf=actx.createBuffer(1,actx.sampleRate*0.08,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);const src=actx.createBufferSource();src.buffer=buf;const g=actx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.10,t+0.003);g.gain.exponentialRampToValueAtTime(0.0001,t+0.07);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=600;src.connect(lp);lp.connect(g);g.connect(actx.destination);src.start();}

/* ── CSS — copia exacta de GolAIzo con prefijo gai- ─────────────────────── */
let styleInjected=false;
function injectStyles(){
  if(styleInjected)return;styleInjected=true;
  const s=document.createElement('style');
  s.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Russo+One&display=swap');

.gai-ov{
  position:fixed;inset:0;z-index:9999;
  font-family:'Russo One',sans-serif;
  color:#fff;overflow-y:auto;overflow-x:hidden;
  display:flex;flex-direction:column;align-items:center;
  padding:clamp(8px,2.5vw,16px) clamp(8px,3vw,16px);
  transition:background .6s ease;
}

/* .back */
.gai-back{align-self:flex-start;background:none;border:none;color:#9fb0d8;font-family:'Russo One';font-size:clamp(12px,3.2vw,13px);cursor:pointer;margin-bottom:6px;}
.gai-back:hover{color:#ffd24a;}

/* .ghLabel */
.gai-ghlabel{width:100%;max-width:480px;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:clamp(15px,4.2vw,18px);color:#ffd24a;letter-spacing:3px;margin-bottom:8px;}

/* flags */
.gai-flag-img{display:block;object-fit:cover;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.5);}
.gai-flag-head{width:clamp(54px,16vw,80px);height:clamp(36px,10.5vw,53px);margin:0 auto;}
.gai-flag-board{width:clamp(22px,6vw,30px);height:clamp(15px,4vw,20px);border-radius:3px;flex-shrink:0;}
.gai-flag-cel{width:clamp(90px,28vw,140px);height:clamp(60px,18.5vw,93px);margin:0 auto;border-radius:6px;animation:gaiChamp 1s ease infinite;}

/* .head */
.gai-head{width:100%;max-width:480px;display:flex;align-items:center;justify-content:space-around;gap:8px;margin-bottom:10px;}
.gai-hteam{flex:1;text-align:center;min-width:0;}
.gai-hflag{display:flex;justify-content:center;margin-bottom:4px;}
.gai-hname{font-family:'Bebas Neue',sans-serif;font-size:clamp(15px,4.4vw,21px);margin-top:2px;word-break:break-word;}
.gai-hvs{font-family:'Bebas Neue',sans-serif;font-size:clamp(18px,5.5vw,28px);color:#ff7b00;flex:none;}

/* .board */
.gai-board{width:100%;max-width:480px;display:flex;align-items:stretch;background:#11162a;border:2px solid #2c3a63;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.5);margin-bottom:10px;}
.gai-team{flex:1;min-width:0;text-align:center;padding:7px 4px;transition:.4s;}
.gai-tname{font-family:'Bebas Neue',sans-serif;font-size:clamp(13px,3.8vw,18px);line-height:1;display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:wrap;}
.gai-team.win{box-shadow:inset 0 0 0 3px #ffd24a;}
.gai-team.win .gai-tname{color:#ffd24a;text-shadow:0 0 12px #ffd24a;}
.gai-score{display:flex;align-items:center;justify-content:center;padding:0 clamp(6px,2vw,10px);font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,9vw,42px);background:#0a0e1a;min-width:clamp(74px,22vw,92px);gap:5px;}

/* .timer */
.gai-timer{font-family:'Bebas Neue',sans-serif;font-size:clamp(18px,5vw,22px);color:#ffd24a;letter-spacing:2px;margin-bottom:8px;}

/* .pitch */
.gai-pitch{position:relative;width:100%;max-width:480px;aspect-ratio:480/300;background:repeating-linear-gradient(90deg,#2e8b3d 0 10%,#27812f 10% 20%);border:3px solid #fff;border-radius:8px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.5);flex-shrink:0;}
.gai-mid{position:absolute;left:50%;top:0;width:3px;height:100%;transform:translateX(-50%);background:rgba(255,255,255,.7);}
.gai-circle{position:absolute;left:50%;top:50%;width:19%;aspect-ratio:1;transform:translate(-50%,-50%);border:3px solid rgba(255,255,255,.7);border-radius:50%;}
.gai-goalbox{position:absolute;top:50%;transform:translateY(-50%);width:10%;height:40%;border:3px solid rgba(255,255,255,.7);}
.gai-goalbox.l{left:0;border-left:none;} .gai-goalbox.r{right:0;border-right:none;}
.gai-net{position:absolute;top:50%;transform:translateY(-50%);width:2%;height:23%;background:rgba(255,255,255,.3);}
.gai-net.l{left:0;} .gai-net.r{right:0;}
.gai-player{position:absolute;width:3.7%;aspect-ratio:1;border-radius:50%;border:2px solid #fff;transform:translate(-50%,-50%);z-index:2;box-shadow:0 2px 4px rgba(0,0,0,.4);}
.gai-player.gk{border-color:#0ff;}
.gai-player.in{animation:gaiPopIn .45s ease both;}
@keyframes gaiPopIn{0%{transform:translate(-50%,-50%) scale(0)}70%{transform:translate(-50%,-50%) scale(1.3)}100%{transform:translate(-50%,-50%) scale(1)}}
.gai-ball{position:absolute;width:2.9%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 60%,#bbb);border:1px solid #333;transform:translate(-50%,-50%);z-index:5;}
.gai-ball.drop{animation:gaiBallDrop .6s ease both;}
@keyframes gaiBallDrop{0%{transform:translate(-50%,-320%) scale(.3);opacity:0}80%{transform:translate(-50%,-50%) scale(1.4)}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
.gai-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:8;}
.gai-goalText{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) scale(0);font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,15vw,62px);color:#ffd24a;text-shadow:0 0 20px #ff7b00;z-index:9;}
.gai-goalText.show{animation:gaiGoalPop .9s ease;}
@keyframes gaiGoalPop{0%{transform:translate(-50%,-50%) scale(0)}40%{transform:translate(-50%,-50%) scale(1.3)}100%{transform:translate(-50%,-50%) scale(0)}}
.gai-banner{position:absolute;top:10px;left:50%;transform:translateX(-50%) translateY(-80px);background:#ffd24a;color:#11162a;font-family:'Bebas Neue',sans-serif;font-size:clamp(18px,5.5vw,26px);padding:6px clamp(14px,4vw,24px);border-radius:8px;opacity:0;transition:.5s;z-index:10;white-space:nowrap;}
.gai-banner.show{opacity:1;transform:translateX(-50%) translateY(0);}
.gai-confetti{position:absolute;width:8px;height:12px;top:-14px;z-index:11;border-radius:2px;}
@keyframes gaiFall{to{transform:translateY(360px) rotate(640deg);opacity:.2;}}

/* .celebrate */
.gai-celebrate{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(7,10,20,.82);text-align:center;padding:10px;animation:gaiFadeIn .4s ease both;}
@keyframes gaiFadeIn{from{opacity:0}to{opacity:1}}
.gai-cflag{display:flex;justify-content:center;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6));}
@keyframes gaiChamp{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.gai-cwin{font-family:'Bebas Neue',sans-serif;font-size:clamp(24px,7vw,36px);color:#ffd24a;text-shadow:0 0 14px #ff7b00;margin-top:4px;}
.gai-cel-btns{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;justify-content:center;}

/* .btn */
.gai-btn{width:100%;max-width:480px;padding:clamp(11px,3.4vw,14px);border:none;border-radius:10px;margin-top:12px;font-family:'Bebas Neue',sans-serif;font-size:clamp(20px,6vw,26px);letter-spacing:2px;cursor:pointer;background:linear-gradient(90deg,#2e8b3d,#1f6e2a);color:#fff;box-shadow:0 4px 0 #155020;transition:.1s;}
.gai-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #155020;}
.gai-btn:disabled{opacity:.5;cursor:not-allowed;}
.gai-btn-save{font-family:'Bebas Neue',sans-serif;font-size:clamp(16px,4.5vw,22px);letter-spacing:1px;background:linear-gradient(90deg,#2e8b3d,#1f6e2a);border:none;color:#fff;padding:10px clamp(16px,4vw,28px);border-radius:10px;cursor:pointer;box-shadow:0 4px 0 #155020;}
.gai-btn-save:active{transform:translateY(2px);box-shadow:0 1px 0 #155020;}
.gai-btn-share{font-family:'Bebas Neue',sans-serif;font-size:clamp(16px,4.5vw,22px);letter-spacing:1px;background:linear-gradient(90deg,#1d6fa4,#1558a0);border:none;color:#fff;padding:10px clamp(16px,4vw,28px);border-radius:10px;cursor:pointer;box-shadow:0 4px 0 #0d3a6e;}
.gai-btn-share:active{transform:translateY(2px);box-shadow:0 1px 0 #0d3a6e;}
.gai-btn-close{font-family:'Bebas Neue',sans-serif;font-size:clamp(16px,4.5vw,22px);letter-spacing:1px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#fff;padding:10px clamp(12px,3vw,20px);border-radius:10px;cursor:pointer;}
`;
  document.head.appendChild(s);
}

/* ── Componente ──────────────────────────────────────────────────────────── */
export function SimulationPresentation({ match, onSave, onClose }) {
  injectStyles();
  ensureAudio();

  const fA    = getFlagImg(match.home, 'gai-flag-head');
  const fB    = getFlagImg(match.away, 'gai-flag-head');
  const fAbd  = getFlagImg(match.home, 'gai-flag-board');
  const fBbd  = getFlagImg(match.away, 'gai-flag-board');
  const nameA = match.home.toUpperCase();
  const nameB = match.away.toUpperCase();
  const label = `🏆 ${match.home} vs ${match.away}`;

  const rawA = getColor(match.home), rawB = getColor(match.away);
  const [colA, colB] = pairColors(rawA, rawB);
  const teamBg = `linear-gradient(135deg,${colA} 0%,rgba(10,14,26,.93) 38%,rgba(10,14,26,.93) 62%,${colB} 100%)`;

  /* ── HTML idéntico al gameView de GolAIzo ── */
  const ov = document.createElement('div');
  ov.className = 'gai-ov';
  ov.style.background = teamBg;
  ov.innerHTML = `
    <button class="gai-back" id="gai-back">← Volver</button>
    <div class="gai-ghlabel">${label}</div>

    <div class="gai-head">
      <div class="gai-hteam">
        <div class="gai-hflag">${fA}</div>
        <div class="gai-hname">${nameA}</div>
      </div>
      <div class="gai-hvs">VS</div>
      <div class="gai-hteam">
        <div class="gai-hflag">${fB}</div>
        <div class="gai-hname">${nameB}</div>
      </div>
    </div>

    <div class="gai-board">
      <div class="gai-team" id="gai-boardA">
        <div class="gai-tname">${fAbd}<span>${nameA}</span></div>
      </div>
      <div class="gai-score">
        <span id="gai-sA">0</span><span>:</span><span id="gai-sB">0</span>
      </div>
      <div class="gai-team" id="gai-boardB">
        <div class="gai-tname"><span>${nameB}</span>${fBbd}</div>
      </div>
    </div>

    <div class="gai-timer" id="gai-timer">90:00</div>

    <div class="gai-pitch" id="gai-pitch">
      <div class="gai-mid"></div>
      <div class="gai-circle"></div>
      <div class="gai-goalbox l"></div><div class="gai-goalbox r"></div>
      <div class="gai-net l"></div><div class="gai-net r"></div>
      <div class="gai-ball" id="gai-ball"></div>
      <div class="gai-goalText" id="gai-goalText">¡GOL!</div>
      <div class="gai-banner" id="gai-banner"></div>
      <div class="gai-flash" id="gai-flash"></div>
    </div>

    <button class="gai-btn" id="gai-startBtn" disabled>⏱️ EN JUEGO…</button>
  `;
  document.body.appendChild(ov);


  /* ── Refs ── */
  const pitch    = ov.querySelector('#gai-pitch');
  const ball     = ov.querySelector('#gai-ball');
  const flash    = ov.querySelector('#gai-flash');
  const goalText = ov.querySelector('#gai-goalText');
  const banner   = ov.querySelector('#gai-banner');
  const elTimer  = ov.querySelector('#gai-timer');
  const elScoreA = ov.querySelector('#gai-sA');
  const elScoreB = ov.querySelector('#gai-sB');
  const boardA   = ov.querySelector('#gai-boardA');
  const boardB   = ov.querySelector('#gai-boardB');
  const btn      = ov.querySelector('#gai-startBtn');

  /* ── Variables de estado — IDÉNTICAS a GolAIzo ── */
  const W=480, H=300, GMTOP=H/2-35, GMBOT=H/2+35;
  let bx=W/2, by=H/2, vx=0, vy=0, raf=null, touchCD=0, matchTime=90, lastT=0;
  let scoreA=0, scoreB=0, running=false;
  const FORM=[0.06,0.22,0.22,0.45,0.7], ROWY=[H/2,H*.3,H*.7,H/2,H*.4];
  let players=[];

  const PX=v=>(v/W*100)+'%';
  const PY=v=>(v/H*100)+'%';

  function placeBall(){ ball.style.left=PX(bx); ball.style.top=PY(by); }
  function placePlayers(){ players.forEach(p=>{p.el.style.left=PX(p.x);p.el.style.top=PY(p.y);}); }

  /* GolAIzo: doFlash, showGoal, confetti — idéntico */
  function doFlash(){flash.style.transition='none';flash.style.opacity='.7';requestAnimationFrame(()=>{flash.style.transition='.4s';flash.style.opacity='0';});}
  function showGoal(){goalText.classList.remove('show');void goalText.offsetWidth;goalText.classList.add('show');doFlash();goalSound();}
  function confetti(){const cols=[colA,colB,'#ffd24a','#ffffff'];for(let i=0;i<46;i++){const c=document.createElement('div');c.className='gai-confetti';c.style.left=Math.random()*100+'%';c.style.background=cols[i%cols.length];c.style.animation=`gaiFall ${1.2+Math.random()*1.6}s linear ${Math.random()*.5}s forwards`;pitch.appendChild(c);setTimeout(()=>c.remove(),3400);}}

  /* GolAIzo: prepareScene — idéntico */
  function prepareScene(){
    scoreA=0;scoreB=0;elScoreA.textContent=0;elScoreB.textContent=0;
    boardA.classList.remove('win');boardB.classList.remove('win');
    banner.classList.remove('show');
    ov.querySelector('#gai-celebrate')?.remove();
    players.forEach(p=>p.el.remove());players=[];
    for(let t=0;t<2;t++)for(let i=0;i<5;i++){
      const el=document.createElement('div');
      el.className='gai-player in'+(i===0?' gk':'');
      el.style.background=t===0?colA:colB;
      el.style.animationDelay=(t*0.12+i*0.06)+'s';
      pitch.appendChild(el);
      const hx=t===0?W*FORM[i]:W*(1-FORM[i]);
      players.push({el,team:t,role:i,x:hx,y:ROWY[i],hx,hy:ROWY[i]});
    }
    placePlayers();
    bx=W/2;by=H/2;vx=0;vy=0;
    ball.classList.remove('drop');void ball.offsetWidth;ball.classList.add('drop');
    placeBall();
    elTimer.textContent='90:00';
  }

  /* GolAIzo: kick — idéntico */
  function kick(p){const goalX=p.team===0?W-6:6,goalY=H/2+(Math.random()-.5)*110;let dx=goalX-bx,dy=goalY-by;const d=Math.hypot(dx,dy)||1,power=6.5+Math.random()*3;vx=dx/d*power;vy=dy/d*power;bx+=vx*1.5;by+=vy*1.5;touchCD=8;}

  /* GolAIzo: centerBall — idéntico */
  function centerBall(){bx=W/2;by=H/2;const a=Math.random()*Math.PI*2,s=6;vx=Math.cos(a)*s;vy=Math.sin(a)*s;placeBall();}

  /* GolAIzo: loop — IDÉNTICO línea por línea */
  function loop(now){
    if(!running)return;
    const dt=Math.min((now-(lastT||now))/16.67,2);lastT=now;
    matchTime-=0.16*dt;if(matchTime<0)matchTime=0;
    elTimer.textContent=Math.floor(matchTime).toString().padStart(2,'0')+':'+Math.floor((matchTime%1)*60).toString().padStart(2,'0');
    bx+=vx*dt;by+=vy*dt;vx*=0.992;vy*=0.992;if(touchCD>0)touchCD-=dt;
    if(by<10){by=10;vy=Math.abs(vy);wallBounceSound();}
    if(by>H-10){by=H-10;vy=-Math.abs(vy);wallBounceSound();}
    if(bx<8){if(by>GMTOP&&by<GMBOT){scoreB++;elScoreB.textContent=scoreB;showGoal();centerBall();showBanner(nameB);}else{bx=8;vx=Math.abs(vx);wallBounceSound();}}
    if(bx>W-8){if(by>GMTOP&&by<GMBOT){scoreA++;elScoreA.textContent=scoreA;showGoal();centerBall();showBanner(nameA);}else{bx=W-8;vx=-Math.abs(vx);wallBounceSound();}}
    if(Math.hypot(vx,vy)<2.2){const a=Math.random()*Math.PI*2,s=4;vx=Math.cos(a)*s;vy=Math.sin(a)*s;}
    placeBall();
    let near=[{d:1e9,p:null},{d:1e9,p:null}];
    players.forEach(p=>{const d=Math.hypot(bx-p.x,by-p.y);if(d<near[p.team].d)near[p.team]={d,p};});
    players.forEach(p=>{
      const chasing=(p===near[0].p||p===near[1].p);
      let tx,ty;if(chasing){tx=bx;ty=by;}else{tx=p.hx+(bx-W/2)*0.25;ty=p.hy+(by-H/2)*0.25;}
      p.x+=(tx-p.x)*(chasing?0.07:0.03)*dt;p.y+=(ty-p.y)*(chasing?0.07:0.03)*dt;
      players.forEach(q=>{if(q!==p){const ddx=p.x-q.x,ddy=p.y-q.y,dd=Math.hypot(ddx,ddy);if(dd<22&&dd>0){p.x+=ddx/dd*0.8;p.y+=ddy/dd*0.8;}}});
      p.x=Math.max(14,Math.min(W-14,p.x));p.y=Math.max(14,Math.min(H-14,p.y));
      if(touchCD<=0){if(Math.hypot(bx-p.x,by-p.y)<15){ballTouchSound();kick(p);}}
    });
    placePlayers();
    if(matchTime<=0){finish();return;}
    raf=requestAnimationFrame(loop);
  }

  function showBanner(teamName){
    banner.textContent='⚽ '+teamName;banner.classList.remove('show');
    void banner.offsetWidth;banner.classList.add('show');
    setTimeout(()=>banner.classList.remove('show'),2000);
  }

  /* GolAIzo: startLoop — idéntico */
  function startLoop(){const a=Math.random()*Math.PI*2,s=6;vx=Math.cos(a)*s;vy=Math.sin(a)*s;running=true;matchTime=90;touchCD=0;lastT=0;raf=requestAnimationFrame(loop);}

  /* GolAIzo: beginMatch — idéntico */
  function beginMatch(){
    prepareScene();btn.disabled=true;btn.textContent='⏱️ EN JUEGO…';
    setTimeout(()=>{kickoffWhistle();startLoop();},1100);
  }

  function shareResult(){ shareMatchResult(match.home, match.away, scoreA, scoreB, 'simulated'); }

  /* finish */
  function finish(){
    running=false;cancelAnimationFrame(raf);elTimer.textContent='FINAL';finalWhistle();
    if(scoreA>scoreB)boardA.classList.add('win');
    else if(scoreB>scoreA)boardB.classList.add('win');

    const cel=document.createElement('div');
    cel.id='gai-celebrate';cel.className='gai-celebrate';
    const fWin = scoreA>scoreB ? getFlagImg(match.home,'gai-flag-cel') : scoreB>scoreA ? getFlagImg(match.away,'gai-flag-cel') : '';
    const cflagHtml = fWin || '<span style="font-size:clamp(52px,18vw,84px)">🤝</span>';
    const cwin = scoreA>scoreB ? `¡GANA ${nameA}!  ${scoreA}-${scoreB}` : scoreB>scoreA ? `¡GANA ${nameB}!  ${scoreA}-${scoreB}` : `EMPATE  ${scoreA}-${scoreB}`;

    cel.innerHTML=`
      <div class="gai-cflag">${cflagHtml}</div>
      <div class="gai-cwin">${cwin}</div>
      <div class="gai-cel-btns">
        <button class="gai-btn-save" id="gai-save">💾 Guardar ${scoreA}-${scoreB}</button>
        <button class="gai-btn-share" id="gai-share">📤 Compartir</button>
        <button class="gai-btn-close" id="gai-close">✕</button>
      </div>
    `;
    pitch.appendChild(cel);
    confetti();

    btn.disabled=false;btn.textContent='🔁 SIMULAR DE NUEVO';

    cel.querySelector('#gai-save').addEventListener('click',()=>{cleanup();onSave?.(scoreA,scoreB);});
    cel.querySelector('#gai-share').addEventListener('click',()=>shareResult());
    cel.querySelector('#gai-close').addEventListener('click',()=>{cleanup();onClose?.();});
  }

  btn.addEventListener('click',()=>{if(!running)beginMatch();});
  ov.querySelector('#gai-back').addEventListener('click',()=>{cleanup();onClose?.();});

  function cleanup(){
    running=false;cancelAnimationFrame(raf);
    ov.remove();
  }

  beginMatch();
  return {cleanup};
}
