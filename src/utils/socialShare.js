import { getLang } from '../i18n.js';
import { getTeamId } from '../data/teamNameMap.js';

const ALBUM_URL = window.location.origin;

const TAGS_ES = '#Mundial2026 #AlbumFiguritas #Figuritas2026 #FIFA2026 #ColeccionaMundial #figurita_lat';
const TAGS_EN = '#WorldCup2026 #StickerAlbum #FIFA2026 #Collect2026 #WorldCupStickers #figurita_lat';

function getTags() { return getLang() === 'es' ? TAGS_ES : TAGS_EN; }

function t(es, en) { return getLang() === 'es' ? es : en; }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

async function loadImg(src) {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

// Genera imagen cuadrada 1080×1080 con el cromo
export async function generateStickerCard({ stickerUrl, playerName, countryName, countryCode, flag, slotNumber }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#060b14'); bg.addColorStop(.5,'#0d1425'); bg.addColorStop(1,'#0a0618');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  const halo=(x,y,r,c)=>{ const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,c); g.addColorStop(1,'transparent'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); };
  halo(W/2,H/2,520,'rgba(102,51,204,.22)');
  halo(W*.15,H*.15,380,'rgba(200,16,46,.18)');
  halo(W*.85,H*.85,380,'rgba(0,169,189,.18)');

  const dc=['#f5a3b7','#c8102e','#f07800','#6633cc','#00843d','#00a9bd','#d4af37'];
  for(let i=0;i<55;i++){
    ctx.beginPath(); ctx.arc(Math.random()*W,Math.random()*H,3+Math.random()*9,0,Math.PI*2);
    ctx.fillStyle=dc[i%dc.length]+'44'; ctx.fill();
  }

  const st=['#f5a3b7','#c8102e','#f07800','#6633cc','#00843d','#00a9bd','#d4af37','#ec4899'];
  const sw=W/st.length;
  st.forEach((c,i)=>{ ctx.fillStyle=c; ctx.fillRect(i*sw,0,sw,24); });
  [...st].reverse().forEach((c,i)=>{ ctx.fillStyle=c; ctx.fillRect(i*sw,H-24,sw,24); });

  const flagImg=await loadImg(`https://flagcdn.com/w160/${flag}.png`);
  if(flagImg){
    const fh=62, fw=flagImg.naturalWidth*(fh/flagImg.naturalHeight);
    ctx.shadowColor='rgba(255,255,255,.3)'; ctx.shadowBlur=14;
    ctx.drawImage(flagImg,(W-fw)/2,48,fw,fh); ctx.shadowBlur=0;
  }

  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.font='bold 46px Impact,"Arial Black",sans-serif';
  ctx.fillStyle='#fff'; ctx.shadowColor='rgba(0,0,0,.9)'; ctx.shadowBlur=10;
  ctx.fillText(countryName.toUpperCase(),W/2,150); ctx.shadowBlur=0;

  const stickerImg=await loadImg(stickerUrl);
  const cW=390, cH=545, cX=(W-cW)/2, cY=172;

  ctx.shadowColor='rgba(212,175,55,.8)'; ctx.shadowBlur=50;
  rr(ctx,cX-5,cY-5,cW+10,cH+10,24);
  const gf=ctx.createLinearGradient(cX,cY,cX+cW,cY+cH);
  gf.addColorStop(0,'#d4af37'); gf.addColorStop(.5,'#f5e080'); gf.addColorStop(1,'#c8a020');
  ctx.fillStyle=gf; ctx.fill(); ctx.shadowBlur=0;

  rr(ctx,cX,cY,cW,cH,20); ctx.fillStyle='#0d1825'; ctx.fill();
  if(stickerImg){
    ctx.save(); rr(ctx,cX,cY,cW,cH,20); ctx.clip();
    const s=Math.max(cW/stickerImg.naturalWidth,cH/stickerImg.naturalHeight);
    ctx.drawImage(stickerImg,cX+(cW-stickerImg.naturalWidth*s)/2,cY+(cH-stickerImg.naturalHeight*s)/2,stickerImg.naturalWidth*s,stickerImg.naturalHeight*s);
    ctx.restore();
  }

  if(playerName){
    ctx.font='bold 54px Impact,"Arial Black",sans-serif';
    const pg=ctx.createLinearGradient(0,0,W,0);
    pg.addColorStop(0,'#f5a3b7'); pg.addColorStop(.5,'#d4af37'); pg.addColorStop(1,'#00a9bd');
    ctx.fillStyle=pg; ctx.shadowColor='rgba(0,0,0,.95)'; ctx.shadowBlur=14;
    ctx.fillText(playerName.toUpperCase(),W/2,cY+cH+66); ctx.shadowBlur=0;
  }
  ctx.font='28px monospace'; ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.fillText(`${countryCode||''} #${slotNumber||''}`,W/2,cY+cH+(playerName?108:74));

  ctx.font='bold 32px Arial,sans-serif'; ctx.fillStyle='rgba(255,255,255,.88)';
  ctx.shadowColor='rgba(0,0,0,.8)'; ctx.shadowBlur=8;
  ctx.fillText(t('⚽ ¡Únete y colecciona gratis!','⚽ Join and collect for free!'),W/2,H-60);
  ctx.shadowBlur=0;
  ctx.font='27px monospace'; ctx.fillStyle='rgba(255,255,255,.38)';
  ctx.fillText(ALBUM_URL,W/2,H-30);

  return canvas;
}

// Modal de links sociales (fallback desktop)
function showShareLinksModal(text) {
  const eu=encodeURIComponent(ALBUM_URL), et=encodeURIComponent(text);
  const links=[
    { name:'WhatsApp',  bg:'#25d366', url:`https://wa.me/?text=${et}` },
    { name:'Facebook',  bg:'#1877f2', url:`https://www.facebook.com/sharer/sharer.php?u=${eu}&quote=${et}` },
    { name:'LinkedIn',  bg:'#0a66c2', url:`https://www.linkedin.com/sharing/share-offsite/?url=${eu}` },
    { name:'Twitter / X', bg:'#000', url:`https://twitter.com/intent/tweet?text=${et}&url=${eu}` },
  ];

  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82)';
  modal.innerHTML=`
    <div style="background:#111827;border-radius:18px;padding:30px 24px;max-width:340px;width:90%;text-align:center;font-family:sans-serif">
      <div style="font-size:32px;margin-bottom:8px">📤</div>
      <p style="color:#fff;font-size:15px;margin-bottom:6px;font-weight:bold">${t('Imagen descargada','Image downloaded')}</p>
      <p style="color:#aaa;font-size:13px;margin-bottom:20px">${t('Compártela en tus redes:','Share it on your networks:')}</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
        ${links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener" style="display:block;padding:12px;background:${l.bg};color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">${l.name}</a>`).join('')}
      </div>
      <button class="ssl-close" style="background:transparent;border:1px solid #444;color:#888;border-radius:8px;padding:8px 24px;cursor:pointer;font-size:14px">${t('Cerrar','Close')}</button>
    </div>
  `;
  modal.querySelector('.ssl-close').onclick=()=>modal.remove();
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob(blob=>{
    if(!blob) return;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  },'image/png');
}

// Comparte el cromo (Web Share API en móvil, fallback en desktop)
export async function shareSticker(data) {
  const name = data.playerName || data.countryName;
  const tags = getTags();
  const text = t(
    `⚽ ¡Me salió ${name}! Estoy armando el álbum del Mundial 2026 🏆 ¡Únete gratis y colecciona los 576 cromos! ${tags}`,
    `⚽ I got ${name}! Building the 2026 World Cup sticker album 🏆 Join for free and collect all 576 stickers! ${tags}`
  );

  let canvas;
  try { canvas = await generateStickerCard(data); } catch { canvas = null; }

  if (canvas && navigator.canShare) {
    await new Promise(res=>{
      canvas.toBlob(async blob=>{
        if(!blob){ res(); return; }
        const file=new File([blob],'cromo-mundial-2026.png',{type:'image/png'});
        if(navigator.canShare({files:[file]})){
          try{ await navigator.share({files:[file],text,url:ALBUM_URL}); }
          catch(e){ if(e.name!=='AbortError'){ downloadCanvas(canvas,'cromo-mundial-2026.png'); showShareLinksModal(text); } }
        } else if(navigator.share){
          try{ await navigator.share({text,url:ALBUM_URL}); }
          catch{}
        } else {
          downloadCanvas(canvas,'cromo-mundial-2026.png');
          showShareLinksModal(text);
        }
        res();
      },'image/png');
    });
    return;
  }

  if(navigator.share){
    try{ await navigator.share({text,url:ALBUM_URL}); return; } catch{}
  }

  if(canvas) downloadCanvas(canvas,'cromo-mundial-2026.png');
  showShareLinksModal(text);
}

// Links para compartir la URL del álbum (para SharePage y celebración)
export function getSocialLinks(customText) {
  const tags = getTags();
  const text = customText || t(
    `⚽ ¡Álbum de figuritas del Mundial 2026 GRATIS! 🏆 Colecciona 576 cromos de 48 selecciones. Hecho con IA y ❤️ ${tags}`,
    `⚽ FREE World Cup 2026 sticker album! 🏆 Collect 576 stickers from 48 teams. Built with AI and ❤️ ${tags}`
  );
  const eu=encodeURIComponent(ALBUM_URL), et=encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${et}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${eu}&quote=${et}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${eu}`,
    twitter:  `https://twitter.com/intent/tweet?text=${et}&url=${eu}`,
  };
}

/* ── Match Result Share ──────────────────────────────────────────────────── */

const MATCH_FLAG_CODES = {
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
const MATCH_COLORS = {
  mexico:'#0a8f4d', southafrica:'#008751', korearepublic:'#c60c30', czechia:'#11457e',
  canada:'#cc0000', bosniaandherzegovina:'#002395', qatar:'#8a1538', switzerland:'#d52b1e',
  brazil:'#c8a200', morocco:'#c1272d', haiti:'#00209f', scotland:'#0a3d7a',
  unitedstates:'#3c3b6e', paraguay:'#d52b1e', australia:'#c8a200', turkiye:'#e30a17',
  germany:'#555', curacao:'#002b7f', cotedivoire:'#f77f00', ecuador:'#c8a200',
  netherlands:'#d45a00', japan:'#bc002d', sweden:'#0a6aa7', tunisia:'#e70013',
  belgium:'#c8a200', egypt:'#ce1126', iran:'#239f40', newzealand:'#444',
  spain:'#c60b1e', capeverde:'#003893', saudiarabia:'#006c35', uruguay:'#4f8fd6',
  france:'#0055a4', senegal:'#00853f', iraq:'#cf142b', norway:'#ba0c2f',
  argentina:'#75aadb', algeria:'#1a7a4c', austria:'#ed2939', jordan:'#1f7a3d',
  portugal:'#c8102e', drcongo:'#1f8fff', uzbekistan:'#1eb53a', colombia:'#c8a200',
  england:'#8899aa', croatia:'#cc0000', ghana:'#006b3f', panama:'#005293'
};
const MATCH_ALT = ['#2980b9','#27ae60','#9b59b6','#e67e22','#1abc9c','#e74c3c'];

function _mhx2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function _mcdist(a,b){const x=_mhx2rgb(a),y=_mhx2rgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);}
function _mpairColors(ca,cb){if(_mcdist(ca,cb)>90)return[ca,cb];let best=MATCH_ALT[0],bd=-1;MATCH_ALT.forEach(c=>{const d=_mcdist(c,ca);if(d>bd){bd=d;best=c;}});return[ca,best];}

function _mRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}

/**
 * Genera imagen y comparte el resultado de un partido.
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {number} homeGoals
 * @param {number} awayGoals
 * @param {'simulated'|'manual'} mode
 */
export async function shareMatchResult(homeTeam, awayTeam, homeGoals, awayGoals, mode = 'simulated') {
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');

  const idA = getTeamId(homeTeam), idB = getTeamId(awayTeam);
  const rawA = (idA && MATCH_COLORS[idA]) || '#3498db';
  const rawB = (idB && MATCH_COLORS[idB]) || '#e74c3c';
  const [colA, colB] = _mpairColors(rawA, rawB);
  const codeA = idA && MATCH_FLAG_CODES[idA];
  const codeB = idB && MATCH_FLAG_CODES[idB];
  const nameA = homeTeam.toUpperCase();
  const nameB = awayTeam.toUpperCase();

  // Fondo radial
  const grad = ctx.createRadialGradient(S*0.22, S*0.22, 0, S*0.5, S*0.5, S*0.88);
  grad.addColorStop(0, colA + 'cc'); grad.addColorStop(0.42, '#080c18');
  grad.addColorStop(1, colB + 'cc');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(0,0,0,0.40)'; ctx.fillRect(0, 0, S, S);

  // Título
  const titleText = mode === 'simulated' ? 'RESULTADO SIMULADO'
    : mode === 'result' ? 'RESULTADO'
    : 'MI PREDICCIÓN';
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffd24a';
  ctx.font = '700 60px "Bebas Neue","Arial Narrow",Arial';
  ctx.fillText(titleText, S/2, 105);

  // Separador superior
  ctx.strokeStyle = 'rgba(255,210,74,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(80,130); ctx.lineTo(S-80,130); ctx.stroke();

  // Banderas
  const FW = 340, FH = 227, GAP = 56;
  const xA = S/2 - GAP/2 - FW;
  const xB = S/2 + GAP/2;
  const FY = 178;

  const [imgA, imgB] = await Promise.all([
    codeA ? new Promise(res=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=()=>res(null);i.src=`https://flagcdn.com/w160/${codeA}.png`;}) : Promise.resolve(null),
    codeB ? new Promise(res=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=()=>res(null);i.src=`https://flagcdn.com/w160/${codeB}.png`;}) : Promise.resolve(null),
  ]);

  const drawFlag = (img, x) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30;
    _mRoundRect(ctx, x, FY, FW, FH, 16); ctx.clip();
    if (img) ctx.drawImage(img, x, FY, FW, FH);
    else { ctx.fillStyle='#222'; ctx.fillRect(x,FY,FW,FH); }
    ctx.restore();
    ctx.save(); _mRoundRect(ctx,x,FY,FW,FH,16);
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
  };
  drawFlag(imgA, xA);
  drawFlag(imgB, xB);

  // Nombres de equipo (debajo de cada bandera)
  const nameY = FY + FH + 60;
  ctx.font = '700 50px "Bebas Neue","Arial Narrow",Arial';
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.fillText(nameA, xA + FW/2, nameY);
  ctx.fillText(nameB, xB + FW/2, nameY);

  // Marcador — debajo de los nombres
  const scoreBaseY = nameY + 200;

  // Píldora de fondo
  const pillW=440, pillH=148, pillX=S/2-pillW/2, pillY=scoreBaseY-130;
  ctx.save(); _mRoundRect(ctx,pillX,pillY,pillW,pillH,74);
  ctx.fillStyle='rgba(0,0,0,0.58)'; ctx.fill(); ctx.restore();

  // Números
  ctx.font = '700 170px "Bebas Neue","Arial Narrow",Arial';
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff';
  ctx.fillText(String(homeGoals), S/2 - 34, scoreBaseY);
  ctx.textAlign = 'left';
  ctx.fillText(String(awayGoals), S/2 + 34, scoreBaseY);
  // Guión
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '400 110px "Bebas Neue","Arial Narrow",Arial';
  ctx.fillText('-', S/2, scoreBaseY - 12);

  // Ganador
  const resText = homeGoals > awayGoals ? `¡GANA ${nameA}!`
    : awayGoals > homeGoals ? `¡GANA ${nameB}!` : '¡EMPATE!';
  ctx.font = '700 64px "Bebas Neue","Arial Narrow",Arial';
  ctx.fillStyle = homeGoals === awayGoals ? '#aaaaaa' : '#ffd24a';
  ctx.textAlign = 'center';
  ctx.fillText(resText, S/2, scoreBaseY + 96);

  // Branding
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(80, S-130); ctx.lineTo(S-80, S-130); ctx.stroke();
  ctx.font = '400 40px "Bebas Neue","Arial Narrow",Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.textAlign = 'center';
  ctx.fillText('album.figurita.lat', S/2, S-72);

  // Compartir
  await new Promise(resolve => {
    canvas.toBlob(async blob => {
      const file = new File([blob], 'resultado.png', { type: 'image/png' });
      const label = mode === 'simulated' ? 'Resultado simulado'
        : mode === 'result' ? 'Resultado'
        : 'Mi predicción';
      const linkA = `${ALBUM_URL}/${idA || ''}`;
      const linkB = `${ALBUM_URL}/${idB || ''}`;
      const text = `${homeTeam} ${homeGoals} - ${awayGoals} ${awayTeam} | ${label} 🌍⚽\n${linkA}\n${linkB}`;
      const shareData = { title: '⚽ Mundial 2026', text, files: [file] };
      try {
        if (navigator.canShare?.(shareData)) {
          await navigator.share(shareData);
        } else if (navigator.share) {
          await navigator.share({ title: shareData.title, text, url: linkA });
        } else {
          downloadCanvas(canvas, 'resultado.png');
          showShareLinksModal(text);
        }
      } catch(e) { if (e.name !== 'AbortError') { downloadCanvas(canvas,'resultado.png'); showShareLinksModal(text); } }
      resolve();
    }, 'image/png');
  });
}

// Comparte la imagen de album completado (Web Share API o links)
export async function shareAlbumCompletion() {
  const tags = getTags();
  const text = t(
    `🏆 ¡Completé el álbum del Mundial 2026! 576/576 cromos de 48 selecciones 🌍⚽ ¡Únete y colecciona gratis! ${tags}`,
    `🏆 I completed the 2026 World Cup sticker album! 576/576 stickers from 48 teams 🌍⚽ Join for free! ${tags}`
  );

  if(navigator.share){
    try{ await navigator.share({title:t('¡Álbum Completo! 🏆','Album Complete! 🏆'),text,url:ALBUM_URL}); return; }
    catch(e){ if(e.name==='AbortError') return; }
  }
  showShareLinksModal(text);
}
