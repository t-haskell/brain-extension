import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const sizes = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/apple-touch-icon.png", size: 180 },
  { file: "public/icon-512.png", size: 512 }
];

const dark = [33, 68, 63, 255];
const light = [247, 244, 239, 255];

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function isInsideRoundedRect(x, y, size, radius) {
  const max = size - 1;
  const left = x < radius;
  const right = x > max - radius;
  const top = y < radius;
  const bottom = y > max - radius;

  if (!(left || right) || !(top || bottom)) {
    return true;
  }

  const centerX = left ? radius : max - radius;
  const centerY = top ? radius : max - radius;
  return Math.hypot(x - centerX, y - centerY) <= radius;
}

function drawPixel(buffer, size, x, y, color) {
  const offset = (y * size + x) * 4;
  buffer[offset] = color[0];
  buffer[offset + 1] = color[1];
  buffer[offset + 2] = color[2];
  buffer[offset + 3] = color[3];
}

function drawBar(buffer, size, x, y, width, height) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      drawPixel(buffer, size, column, row, light);
    }
  }
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 96;
  const radius = Math.round(18 * scale);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (isInsideRoundedRect(x, y, size, radius)) {
        drawPixel(pixels, size, x, y, dark);
      }
    }
  }

  drawBar(pixels, size, Math.round(25 * scale), Math.round(28 * scale), Math.round(46 * scale), Math.round(8 * scale));
  drawBar(pixels, size, Math.round(25 * scale), Math.round(44 * scale), Math.round(32 * scale), Math.round(8 * scale));
  drawBar(pixels, size, Math.round(25 * scale), Math.round(60 * scale), Math.round(40 * scale), Math.round(8 * scale));

  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  for (let row = 0; row < size; row += 1) {
    const sourceStart = row * size * 4;
    const targetStart = row * (size * 4 + 1) + 1;
    pixels.copy(scanlines, targetStart, sourceStart, sourceStart + size * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

for (const icon of sizes) {
  writeFileSync(icon.file, createIcon(icon.size));
}
