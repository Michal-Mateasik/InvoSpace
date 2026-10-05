// Vygeneruje ikonu aplikácie a obrázok úvodnej obrazovky (bloček na modrom pozadí) bez externých knižníc.
// Spustenie: node scripts/generate-icons.mjs
import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const BLUE = [0x20, 0x8a, 0xef];
const WHITE = [0xff, 0xff, 0xff];

// Tvar bločku v súradniciach 1024 × 1024: biele telo so zaoblenými rohmi a zubatým spodným okrajom.
function insideReceipt(x, y) {
  const left = 282, right = 742, top = 170, bottom = 800, radius = 48;
  if (x < left || x > right || y < top) return false;
  // zaoblené horné rohy
  const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const cy = y < top + radius ? top + radius : y;
  if (y < top + radius && (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) return false;
  // zubatý spodok: trojuholníková vlna s hĺbkou 30 px a šírkou zuba 46 px
  const phase = ((x - left) % 46) / 46;
  const edge = bottom + 30 * (1 - Math.abs(phase * 2 - 1));
  return y <= edge;
}

// Riadky textu na bločku (v modrej, aby vyzerali ako výrezy do bieleho tela).
const LINES = [
  [342, 682, 270, 296],
  [342, 682, 350, 376],
  [342, 682, 430, 456],
  [342, 560, 510, 536],
  [480, 682, 620, 656],
];
const insideLine = (x, y) => LINES.some(([x0, x1, y0, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);

// Vráti farbu bodu [r, g, b, a] s vyhladzovaním hrán (supersampling 3 × 3).
function pixel(px, py, size, transparentBackground) {
  const scale = 1024 / size;
  const n = 3;
  let r = 0, g = 0, b = 0, a = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = (px + (i + 0.5) / n) * scale;
      const y = (py + (j + 0.5) / n) * scale;
      let color, alpha;
      if (insideReceipt(x, y) && !insideLine(x, y)) [color, alpha] = [WHITE, 1];
      else if (transparentBackground) [color, alpha] = [BLUE, insideReceipt(x, y) ? 1 : 0];
      else [color, alpha] = [BLUE, 1];
      r += color[0] * alpha; g += color[1] * alpha; b += color[2] * alpha; a += alpha;
    }
  }
  const total = n * n;
  return a === 0 ? [0, 0, 0, 0] : [r / a, g / a, b / a, (a / total) * 255];
}

function png(size, transparentBackground) {
  const channels = transparentBackground ? 4 : 3; // ikona iOS nesmie mať priehľadnosť
  const raw = Buffer.alloc(size * (size * channels + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * channels + 1);
    raw[row] = 0; // filter: žiadny
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size, transparentBackground);
      const o = row + 1 + x * channels;
      raw[o] = Math.round(r);
      raw[o + 1] = Math.round(g);
      raw[o + 2] = Math.round(b);
      if (transparentBackground) raw[o + 3] = Math.round(a);
    }
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bitová hĺbka
  header[9] = transparentBackground ? 6 : 2; // RGBA alebo RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('assets/images/icon.png', png(1024, false));
writeFileSync('assets/images/splash-icon.png', png(512, true));
console.log('Hotovo: assets/images/icon.png a assets/images/splash-icon.png');
