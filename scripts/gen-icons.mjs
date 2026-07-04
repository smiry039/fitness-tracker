// Generates the PWA icons (a copper Viking shield on iron) as PNGs with zero
// image dependencies — pixels are drawn parametrically and encoded with
// Node's built-in zlib. Run: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const IRON = [0x15, 0x17, 0x1a];
const COPPER = [0xc7, 0x7b, 0x43];
const COPPER_DEEP = [0x8c, 0x4f, 0x2b];

// --- Minimal PNG encoder (8-bit RGB, no alpha) ----------------------------
const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Shield drawing --------------------------------------------------------
// Content kept within the middle ~65% so maskable/rounded launchers don't
// clip it.
function shieldHalfWidth(v) {
  // v: 0 (top) → 1 (tip). Straight sides down to 45%, then taper to a point.
  if (v < 0) return -1;
  if (v <= 0.45) return 0.5;
  if (v > 1) return -1;
  const t = (v - 0.45) / 0.55;
  return 0.5 * (1 - Math.pow(t, 1.6));
}

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 3);
  const cx = size / 2;
  const top = size * 0.2;
  const H = size * 0.62;
  const W = size * 0.56;
  const stripe = size * 0.022;
  const border = size * 0.045;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = IRON;
      const v = (y - top) / H;
      const hw = shieldHalfWidth(v) * W;
      const dx = Math.abs(x - cx);
      if (hw >= 0 && dx <= hw) {
        // Inside the shield: deep copper rim, copper body, iron centerline.
        const hwInner = shieldHalfWidth(v) * (W - border * 2);
        const vInner = (y - (top + border)) / (H - border * 2);
        const inBody =
          vInner >= 0 &&
          shieldHalfWidth(vInner) >= 0 &&
          dx <= shieldHalfWidth(vInner) * (W - border * 2) &&
          hwInner >= 0;
        c = inBody ? COPPER : COPPER_DEEP;
        if (inBody && dx <= stripe) c = COPPER_DEEP;
      }
      const i = (y * size + x) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
  return encodePNG(size, px);
}

mkdirSync("public", { recursive: true });
for (const [file, size] of [
  ["public/icon-512.png", 512],
  ["public/icon-192.png", 192],
  ["public/apple-touch-icon.png", 180],
]) {
  writeFileSync(file, drawIcon(size));
  console.log("wrote", file);
}
