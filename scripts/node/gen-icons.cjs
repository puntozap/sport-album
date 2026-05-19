// Generates icon-192.png and icon-512.png from scratch using only built-in zlib.
// Run once: node scripts/gen-icons.js
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t   = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(size) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8]=8; ihdr[9]=6; // RGBA

  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.46;  // gold outer ring
  const innerR = size * 0.36;  // dark inner
  const starR  = size * 0.22;  // gold star area
  const padding = size * 0.08;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // rounded-rect mask (match SVG rx=96 on 512px → ratio ~0.188)
      const rx = size * 0.188;
      const ax = Math.abs(x - cx), ay = Math.abs(y - cy);
      const hw = size/2 - padding, hh = size/2 - padding;
      let inRect = false;
      if (ax <= hw && ay <= hh) {
        if (ax <= hw - rx || ay <= hh - rx) {
          inRect = true;
        } else {
          const cdx = ax - (hw - rx), cdy = ay - (hh - rx);
          inRect = cdx*cdx + cdy*cdy <= rx*rx;
        }
      }

      let r, g, b, a;
      if (!inRect) {
        r=0; g=0; b=0; a=0; // transparent outside
      } else if (dist < starR) {
        // dark center
        r=0x0a; g=0x0d; b=0x1a; a=255;
      } else if (dist < innerR) {
        // gold ring
        r=0xd4; g=0xaf; b=0x37; a=255;
      } else if (dist < outerR) {
        // dark area between rings
        r=0x0a; g=0x0d; b=0x1a; a=255;
      } else {
        // dark background inside rounded rect
        r=0x0a; g=0x0d; b=0x1a; a=255;
      }

      const off = 1 + x*4;
      row[off]=r; row[off+1]=g; row[off+2]=b; row[off+3]=a;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '../public/assets/icons');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePNG(512));
console.log('✅ icon-192.png and icon-512.png generated');
