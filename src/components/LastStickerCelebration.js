import '../styles/last-sticker-celebration.css';
import { collectionStore } from '../data/collectionStore.js';
import { countries } from '../data/countries.js';
import { getLang } from '../i18n.js';
import { router } from '../router.js';
import { downloadAlbumPdf } from './AlbumPdfExport.js';
import { shareAlbumCompletion } from '../utils/socialShare.js';

const CELEBRATED_KEY = 'wc2026_last_sticker_celebrated';

const COLORS = [
  '#f5a3b7', '#c8102e', '#f07800', '#6633cc',
  '#00843d', '#00a9bd', '#d4af37', '#ffffff',
  '#ec4899', '#3b82f6', '#10b981', '#f59e0b',
];

function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function spawnParticles(container) {
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;

  // 180 confetti pieces
  for (let i = 0; i < 180; i++) {
    const el = document.createElement('div');
    el.className = 'lsc-particle';

    const size = rand(5, 13);
    const angle = rand(0, Math.PI * 2);
    const dist  = rand(80, Math.min(window.innerWidth, window.innerHeight) * 0.52);
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const rot = `${rand(-540, 540)}deg`;
    const color = pick(COLORS);
    const dur = `${rand(1.4, 2.6)}s`;
    const delay = `${rand(0, 0.6)}s`;

    Object.assign(el.style, {
      left: `${cx - size / 2}px`,
      top:  `${cy - size / 2}px`,
      width: `${size}px`,
      height: `${Math.random() > 0.4 ? size * 2.5 : size}px`,
      background: color,
      '--tx': `${tx}px`,
      '--ty': `${ty}px`,
      '--rot': rot,
      '--dur': dur,
      '--delay': delay,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    });
    container.appendChild(el);
  }

  // Firework bursts from 4 corners + center
  const origins = [
    [cx, cy],
    [cx * 0.3, cy * 0.4],
    [cx * 1.7, cy * 0.4],
    [cx * 0.3, cy * 1.6],
    [cx * 1.7, cy * 1.6],
  ];

  origins.forEach(([ox, oy], burst) => {
    const delay = burst * 0.15;
    for (let j = 0; j < 24; j++) {
      const fw = document.createElement('div');
      fw.className = 'lsc-firework';
      const a = (j / 24) * Math.PI * 2;
      const d = rand(60, 140);
      Object.assign(fw.style, {
        left: `${ox}px`,
        top:  `${oy}px`,
        background: pick(COLORS),
        '--fx': `${Math.cos(a) * d}px`,
        '--fy': `${Math.sin(a) * d}px`,
        '--dur': `${rand(0.5, 0.9)}s`,
        '--delay': `${delay + rand(0, 0.2)}s`,
      });
      container.appendChild(fw);
    }
  });

  // Glow rings
  for (let r = 0; r < 3; r++) {
    const ring = document.createElement('div');
    ring.className = 'lsc-ring';
    const size = 80;
    Object.assign(ring.style, {
      width: `${size}px`,
      height: `${size}px`,
      left: `${cx - size / 2}px`,
      top:  `${cy - size / 2}px`,
      '--scale': rand(6, 10),
      '--dur': `${rand(1.6, 2.4)}s`,
      '--delay': `${r * 0.4}s`,
    });
    container.appendChild(ring);
  }
}

export function checkLastStickerCelebration() {
  // Only trigger if album just reached 100% AND we haven't celebrated yet
  if (localStorage.getItem(CELEBRATED_KEY)) return;

  const { total, collected } = collectionStore.getProgress(countries);
  if (collected < total) return;

  // Mark celebrated immediately to prevent double-trigger
  localStorage.setItem(CELEBRATED_KEY, '1');

  // Small delay so the sticker placement animation finishes first
  setTimeout(() => showCelebration(), 600);
}

function showCelebration() {
  const es = getLang() === 'es';

  const overlay = document.createElement('div');
  overlay.className = 'lsc-overlay';

  // Particle container (behind content)
  const particles = document.createElement('div');
  particles.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  overlay.appendChild(particles);

  // Center content
  overlay.innerHTML += `
    <div class="lsc-center">
      <div class="lsc-trophy">🏆</div>
      <div class="lsc-stars">⭐ ⭐ ⭐</div>
      <div class="lsc-title">${es ? '¡ÁLBUM\nCOMPLETO!' : 'ALBUM\nCOMPLETE!'}</div>
      <div class="lsc-sub">
        ${es
          ? '<strong>576 cromos · 48 selecciones</strong><br>Lo lograste. ¡Eres un campeón! 🎉'
          : '<strong>576 stickers · 48 teams</strong><br>You did it. You\'re a champion! 🎉'}
      </div>
      <div class="lsc-btns">
        <button class="lsc-btn lsc-btn--share" id="lsc-share">
          📤 ${es ? '¡Compartir en redes!' : 'Share on social media!'}
        </button>
        <button class="lsc-btn lsc-btn--pdf" id="lsc-pdf">
          📄 ${es ? 'Descargar PDF' : 'Download PDF'}
        </button>
      </div>
      <div class="lsc-timer" id="lsc-timer">
        ${es ? 'Compartiendo en' : 'Sharing in'} <strong id="lsc-count">5</strong>s...
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Spawn particles after overlay is in DOM
  requestAnimationFrame(() => spawnParticles(particles));

  // Countdown → auto navigate to share
  let count = 5;
  const countEl = () => document.getElementById('lsc-count');
  const tick = setInterval(() => {
    count--;
    const el = countEl();
    if (el) el.textContent = count;
    if (count <= 0) {
      clearInterval(tick);
      goShare();
    }
  }, 1000);

  function goShare() {
    clearInterval(tick);
    overlay.remove();
    router.navigate('/share');
  }

  function close() {
    clearInterval(tick);
    overlay.remove();
  }

  document.getElementById('lsc-share').addEventListener('click', async () => {
    await shareAlbumCompletion();
  });
  document.getElementById('lsc-pdf').addEventListener('click', () => {
    close();
    setTimeout(() => downloadAlbumPdf(), 200);
  });
}
