/**
 * Generate 40x40 PNG tab bar icons without external dependencies.
 * Normal: #999999, Active: #e60012
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 40;
const OUT = path.join(__dirname, '..', 'assets', 'icons');

// ─── PNG Encoder ───

function createImageData(drawFn) {
  // Flat RGBA pixel array
  const pixels = new Uint8Array(SIZE * SIZE * 4);

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
    const idx = (y * SIZE + x) * 4;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
    pixels[idx + 3] = a;
  }

  function fillRect(x, y, w, h, color) {
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(SIZE, x + w), y1 = Math.min(SIZE, y + h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const idx = (py * SIZE + px) * 4;
        pixels[idx] = color[0]; pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2]; pixels[idx + 3] = color[3];
      }
    }
  }

  function fillCircle(cx, cy, r, color) {
    const x0 = Math.max(0, Math.floor(cx - r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const x1 = Math.min(SIZE, Math.ceil(cx + r));
    const y1 = Math.min(SIZE, Math.ceil(cy + r));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const dx = px - cx, dy = py - cy;
        if (dx * dx + dy * dy <= r * r) {
          const idx = (py * SIZE + px) * 4;
          pixels[idx] = color[0]; pixels[idx + 1] = color[1];
          pixels[idx + 2] = color[2]; pixels[idx + 3] = color[3];
        }
      }
    }
  }

  // Thick line (horizontal, vertical, or diagonal)
  function hline(y, x0, x1, color, t = 2) {
    fillRect(x0, y - Math.floor(t / 2), x1 - x0, t, color);
  }
  function vline(x, y0, y1, color, t = 2) {
    fillRect(x - Math.floor(t / 2), y0, t, y1 - y0, color);
  }

  drawFn({ setPixel, fillRect, fillCircle, hline, vline, SIZE });

  // Build filtered raw data (filter byte 0 before each row)
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (1 + SIZE * 4)] = 0; // filter none
    const rowStart = y * (1 + SIZE * 4) + 1;
    for (let x = 0; x < SIZE; x++) {
      const srcIdx = (y * SIZE + x) * 4;
      raw[rowStart + x * 4] = pixels[srcIdx];
      raw[rowStart + x * 4 + 1] = pixels[srcIdx + 1];
      raw[rowStart + x * 4 + 2] = pixels[srcIdx + 2];
      raw[rowStart + x * 4 + 3] = pixels[srcIdx + 3];
    }
  }
  return raw;
}

function createPng(pixelData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(SIZE, 0);
  ihdrData.writeUInt32BE(SIZE, 4);
  ihdrData[8] = 8; ihdrData[9] = 6; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const compressed = zlib.deflateSync(pixelData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function hex(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 255];
}

// ─── Icon Drawers ───

// House with roof, chimney, door
function drawHome({ fillRect, fillCircle, hline, vline, SIZE }, color) {
  const c = color;
  const white = [255, 255, 255, 255];

  // Chimney
  fillRect(26, 4, 5, 9, c);

  // Roof triangle (pitched, not too wide)
  for (let y = 0; y < 12; y++) {
    const w = 2 + Math.round((26 / 12) * y); // grows from 2 to 28
    const x0 = 20 - Math.floor(w / 2);
    fillRect(x0, 10 + y, w, 1, c);
  }
  // Roof bottom edge
  hline(22, 5, 35, c, 2);

  // House body
  fillRect(9, 22, 22, 17, c);

  // Door
  fillRect(15, 28, 10, 11, white);
  // Door knob
  fillCircle(23, 34, 1, c);
}

// Ticket/check icon for quick verification
function drawCheck({ fillRect, fillCircle, hline, vline, SIZE }, color) {
  const c = color;
  const w = [255, 255, 255, 255];

  // Ticket body (rounded rectangle)
  fillRect(8, 6, 24, 30, c);
  // Top edge cutouts (ticket perforation look)
  fillCircle(12, 6, 3, [0, 0, 0, 0]);
  fillCircle(28, 6, 3, [0, 0, 0, 0]);

  // White inner area
  fillRect(12, 10, 16, 20, w);

  // QR-like blocks for visual interest
  fillRect(14, 12, 4, 4, c);
  fillRect(22, 12, 4, 4, c);
  fillRect(14, 20, 4, 4, c);
  fillRect(22, 20, 4, 4, c);

  // Checkmark at bottom
  fillRect(18, 27, 2, 6, c);   // short vertical
  fillRect(16, 31, 2, 2, c);   // corner
  fillRect(18, 31, 8, 2, c);   // long horizontal
}

// Person silhouette
function drawProfile({ fillRect, fillCircle, hline, vline, SIZE }, color) {
  const c = color;
  // Head
  fillCircle(20, 10, 8, c);
  // Body - rounded shape
  fillCircle(20, 28, 12, c);
  // Clip bottom flat
  const bg = [0, 0, 0, 0];
}

// ─── Generate ───

const icons = [
  { name: 'home', normal: '#999999', active: '#e60012', draw: drawHome },
  { name: 'quick-check', normal: '#999999', active: '#e60012', draw: drawCheck },
  { name: 'profile', normal: '#999999', active: '#e60012', draw: drawProfile },
];

for (const icon of icons) {
  const normalRaw = createImageData((api) => icon.draw(api, hex(icon.normal)));
  fs.writeFileSync(path.join(OUT, `${icon.name}.png`), createPng(normalRaw));
  console.log(`Created ${icon.name}.png`);

  const activeRaw = createImageData((api) => icon.draw(api, hex(icon.active)));
  fs.writeFileSync(path.join(OUT, `${icon.name}-active.png`), createPng(activeRaw));
  console.log(`Created ${icon.name}-active.png`);
}

console.log('\nDone! 6 icons generated.');
