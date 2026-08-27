const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function savePng(filename, width, height, getPixel) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const px = rowOffset + 1 + x * 4;
      raw[px] = Math.max(0, Math.min(255, Math.round(r)));
      raw[px + 1] = Math.max(0, Math.min(255, Math.round(g)));
      raw[px + 2] = Math.max(0, Math.min(255, Math.round(b)));
      raw[px + 3] = a !== undefined ? Math.max(0, Math.min(255, Math.round(a))) : 255;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const buffer = Buffer.concat([
    header,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(filename, buffer);
  console.log('Saved:', path.basename(filename), `(${Math.round(buffer.length / 1024)} KB)`);
}

const dir = path.join(process.cwd(), 'public', 'yard', 'pbr');
fs.mkdirSync(dir, { recursive: true });

const SIZE = 1024;

// Simple deterministic hash noise
function hash2d(x, y) {
  let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const u = fx * fx * (3.0 - 2.0 * fx);
  const v = fy * fy * (3.0 - 2.0 * fy);
  const a00 = hash2d(i, j);
  const a10 = hash2d(i + 1, j);
  const a01 = hash2d(i, j + 1);
  const a11 = hash2d(i + 1, j + 1);
  return a00 + (a10 - a00) * u + (a01 - a00) * v + (a11 - a10 - a01 + a00) * u * v;
}

function fbm(x, y, octaves = 4) {
  let v = 0;
  let a = 0.5;
  let scale = 1;
  for (let o = 0; o < octaves; o++) {
    v += a * smoothNoise(x * scale, y * scale);
    scale *= 2.0;
    a *= 0.5;
  }
  return v;
}

// 1. STEEL TREAD FLOOR
console.log('Generating Steel Floor...');
const treadHeight = (x, y) => {
  const u = (x % 64) / 64;
  const v = (y % 64) / 64;
  const dx1 = Math.abs(u - 0.5) * 2;
  const dy1 = Math.abs(v - 0.5) * 4;
  const d1 = Math.max(0, 1.0 - (dx1 * dx1 + dy1 * dy1));
  const u2 = ((x + 32) % 64) / 64;
  const v2 = ((y + 32) % 64) / 64;
  const dx2 = Math.abs(u2 - 0.5) * 4;
  const dy2 = Math.abs(v2 - 0.5) * 2;
  const d2 = Math.max(0, 1.0 - (dx2 * dx2 + dy2 * dy2));
  return Math.max(d1, d2);
};

savePng(path.join(dir, 'steel_floor_diffuse.png'), SIZE, SIZE, (x, y) => {
  const t = treadHeight(x, y);
  const n = fbm(x * 0.02, y * 0.02);
  const base = 42 + n * 24 + t * 40;
  return [base * 0.85, base * 0.95, base * 1.1];
});

savePng(path.join(dir, 'steel_floor_roughness.png'), SIZE, SIZE, (x, y) => {
  const t = treadHeight(x, y);
  const n = fbm(x * 0.04, y * 0.04);
  const r = (0.55 - t * 0.25 + n * 0.2) * 255;
  return [r, r, r];
});

savePng(path.join(dir, 'steel_floor_normal.png'), SIZE, SIZE, (x, y) => {
  const delta = 1;
  const hL = treadHeight(x - delta, y);
  const hR = treadHeight(x + delta, y);
  const hD = treadHeight(x, y - delta);
  const hU = treadHeight(x, y + delta);
  const dx = (hL - hR) * 2.5;
  const dy = (hD - hU) * 2.5;
  const dz = 1.0;
  const len = Math.hypot(dx, dy, dz);
  const nx = (dx / len * 0.5 + 0.5) * 255;
  const ny = (dy / len * 0.5 + 0.5) * 255;
  const nz = (dz / len * 0.5 + 0.5) * 255;
  return [nx, ny, nz];
});

// 2. SCRATCHED STEEL / LIGHT ALLOY
console.log('Generating Scratched Steel...');
savePng(path.join(dir, 'scratched_steel_diffuse.png'), SIZE, SIZE, (x, y) => {
  const brush = Math.sin(y * 1.5 + hash2d(x * 0.1, y) * 2) * 8;
  const scratch = (hash2d(x * 0.4, Math.floor(y / 4)) > 0.985) ? 35 : 0;
  const n = fbm(x * 0.03, y * 0.03) * 30;
  const v = 150 + brush + scratch + n;
  return [v * 0.92, v * 0.98, v * 1.05];
});

savePng(path.join(dir, 'scratched_steel_roughness.png'), SIZE, SIZE, (x, y) => {
  const brush = Math.sin(y * 1.5) * 0.08;
  const scratch = (hash2d(x * 0.4, Math.floor(y / 4)) > 0.985) ? 0.3 : 0;
  const n = fbm(x * 0.05, y * 0.05) * 0.15;
  const r = (0.35 + brush + scratch + n) * 255;
  return [r, r, r];
});

savePng(path.join(dir, 'scratched_steel_normal.png'), SIZE, SIZE, (x, y) => {
  const nyVal = Math.sin(y * 1.5) * 0.3;
  const nx = 128;
  const ny = 128 + nyVal * 60;
  const nz = 255;
  return [nx, ny, nz];
});

// 3. PAINTED METAL
console.log('Generating Painted Metal...');
savePng(path.join(dir, 'painted_metal_diffuse.png'), SIZE, SIZE, (x, y) => {
  const chip = fbm(x * 0.015, y * 0.015, 5);
  const isChipped = chip < 0.28;
  const isEdge = chip >= 0.28 && chip < 0.32;
  if (isChipped) {
    const rust = 38 + hash2d(x, y) * 20;
    return [rust * 1.2, rust * 0.8, rust * 0.6];
  }
  if (isEdge) {
    return [80, 70, 60];
  }
  const wear = (chip - 0.32) * 40;
  return [235 + wear, 180 + wear, 35 + wear * 0.5];
});

savePng(path.join(dir, 'painted_metal_roughness.png'), SIZE, SIZE, (x, y) => {
  const chip = fbm(x * 0.015, y * 0.015, 5);
  if (chip < 0.32) {
    return [180, 180, 180];
  }
  return [85, 85, 85];
});

savePng(path.join(dir, 'painted_metal_normal.png'), SIZE, SIZE, (x, y) => {
  const delta = 1;
  const cL = fbm((x - delta) * 0.015, y * 0.015, 5);
  const cR = fbm((x + delta) * 0.015, y * 0.015, 5);
  const cD = fbm(x * 0.015, (y - delta) * 0.015, 5);
  const cU = fbm(x * 0.015, (y + delta) * 0.015, 5);
  const dx = (cL - cR) * 6;
  const dy = (cD - cU) * 6;
  const dz = 1.0;
  const len = Math.hypot(dx, dy, dz);
  return [(dx / len * 0.5 + 0.5) * 255, (dy / len * 0.5 + 0.5) * 255, (dz / len * 0.5 + 0.5) * 255];
});

// 4. CAST IRON
console.log('Generating Cast Iron...');
savePng(path.join(dir, 'cast_iron_diffuse.png'), SIZE, SIZE, (x, y) => {
  const n = fbm(x * 0.08, y * 0.08, 4);
  const grain = hash2d(x, y) * 20;
  const base = 48 + n * 30 + grain;
  return [base * 0.95, base * 0.9, base * 0.9];
});

savePng(path.join(dir, 'cast_iron_roughness.png'), SIZE, SIZE, (x, y) => {
  const n = fbm(x * 0.08, y * 0.08, 4);
  const r = (0.7 + n * 0.2) * 255;
  return [r, r, r];
});

savePng(path.join(dir, 'cast_iron_normal.png'), SIZE, SIZE, (x, y) => {
  const nL = hash2d(x - 1, y);
  const nR = hash2d(x + 1, y);
  const nD = hash2d(x, y - 1);
  const nU = hash2d(x, y + 1);
  const dx = (nL - nR) * 0.6;
  const dy = (nD - nU) * 0.6;
  const dz = 1.0;
  const len = Math.hypot(dx, dy, dz);
  return [(dx / len * 0.5 + 0.5) * 255, (dy / len * 0.5 + 0.5) * 255, (dz / len * 0.5 + 0.5) * 255];
});

// 5. DIRTY CONCRETE
console.log('Generating Dirty Concrete...');
savePng(path.join(dir, 'concrete_diffuse.png'), SIZE, SIZE, (x, y) => {
  const n = fbm(x * 0.01, y * 0.01, 5);
  const speck = (hash2d(x * 2, y * 2) > 0.9) ? -20 : (hash2d(x * 2, y * 2) < 0.1 ? 15 : 0);
  const base = 55 + n * 45 + speck;
  return [base * 0.85, base * 0.92, base * 1.05];
});

savePng(path.join(dir, 'concrete_roughness.png'), SIZE, SIZE, (x, y) => {
  const n = fbm(x * 0.02, y * 0.02, 4);
  const r = (0.85 + n * 0.12) * 255;
  return [r, r, r];
});

// 6. RUBBER
console.log('Generating Rubber Grip...');
savePng(path.join(dir, 'rubber_diffuse.png'), SIZE, SIZE, (x, y) => {
  const gx = Math.sin(x * 0.35);
  const gy = Math.sin(y * 0.35);
  const knurl = (gx * gy > 0) ? 10 : -10;
  const base = 28 + knurl;
  return [base, base * 1.05, base * 1.15];
});

savePng(path.join(dir, 'rubber_roughness.png'), SIZE, SIZE, (x, y) => {
  return [210, 210, 210];
});

console.log('All PBR textures generated successfully in /public/yard/pbr/ !');
