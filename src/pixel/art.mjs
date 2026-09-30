// 程序生成的像素画：石墙、地板、门、书架、地毯、相框、界面边框。
// 全部用固定种子，构建结果每次都一样。
import { Raster, rgba, rng } from './raster.mjs';
import { sprite } from './sprites.mjs';

const K = rgba('#1c100d');

function mix(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)).concat(255);
}
function scale(c, f) {
  return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f), c[3] ?? 255];
}

// 平滑的值噪声，用来给地板和墙面做大块的明暗变化
function valueNoise(seed, cell) {
  const r = rng(seed);
  const grid = new Map();
  const at = (i, j) => {
    const key = i * 7919 + j;
    if (!grid.has(key)) grid.set(key, r());
    return grid.get(key);
  };
  return (x, y) => {
    const gx = x / cell, gy = y / cell;
    const i = Math.floor(gx), j = Math.floor(gy);
    const fx = gx - i, fy = gy - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return a + (b - a) * sy;
  };
}

// —— 房间几何（和运行时共用）——————————————————————————————
export const ROOM_W = 240;
export const ROOM_H = 160;
export const FLOOR = { x: 16, y: 32, w: 208, h: 112 };
export const DOOR_RECT = {
  up: { x: 106, y: 6, w: 28, h: 26 },
  down: { x: 106, y: 144, w: 28, h: 16 },
  left: { x: 0, y: 74, w: 16, h: 28 },
  right: { x: 224, y: 74, w: 16, h: 28 },
};

export const THEMES = {
  basement: { stone: '#4d3f36', mortar: '#271e19', floor: '#3a2c24', floor2: '#2f231d', pebble: '#4b3a30' },
  library: { stone: '#4a3d35', mortar: '#241b16', floor: '#6b4527', floor2: '#5a381f', pebble: '#7b5231' },
};

// 墙：四面墙按透视切成梯形，每面墙的亮度不同（光从左上来）
function drawWalls(r, theme, seed) {
  const t = THEMES[theme];
  const stone = rgba(t.stone), mortar = rgba(t.mortar);
  const rand = rng(seed);
  const tint = new Map();
  const brick = (bx, by) => {
    const key = `${bx},${by}`;
    if (!tint.has(key)) tint.set(key, 0.82 + rand() * 0.32);
    return tint.get(key);
  };
  const noise = valueNoise(seed + 1, 9);
  const { x: fx, y: fy, w: fw, h: fh } = FLOOR;
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const inFloor = x >= fx && x < fx + fw && y >= fy && y < fy + fh;
      if (inFloor) continue;
      // 属于哪面墙：比较到四条内边的相对距离
      const dTop = (fy - y) / fy, dBottom = (y - (fy + fh - 1)) / (ROOM_H - fy - fh);
      const dLeft = (fx - x) / fx, dRight = (x - (fx + fw - 1)) / (ROOM_W - fx - fw);
      const m = Math.max(dTop, dBottom, dLeft, dRight);
      const wall = m === dTop ? 'top' : m === dBottom ? 'bottom' : m === dLeft ? 'left' : 'right';
      const light = { top: 1.0, left: 0.84, right: 0.72, bottom: 0.62 }[wall];
      // 砖缝：横墙横砖，竖墙竖砖
      let isMortar, bx, by;
      if (wall === 'top' || wall === 'bottom') {
        const row = Math.floor(y / 8);
        const off = row % 2 ? 8 : 0;
        bx = Math.floor((x + off) / 16);
        by = row;
        isMortar = y % 8 === 7 || (x + off) % 16 === 15;
      } else {
        const col = Math.floor(x / 8);
        const off = col % 2 ? 8 : 0;
        bx = col;
        by = Math.floor((y + off) / 16);
        isMortar = x % 8 === 7 || (y + off) % 16 === 15;
      }
      let c = isMortar ? mortar : scale(stone, brick(`${wall}${bx}`, by) * (0.9 + noise(x, y) * 0.2));
      // 越靠近地板越暗，墙沿有一圈高光
      const depth = 1 - m; // 0 = 最外沿，1 = 贴着地板
      c = scale(c, light * (1.08 - depth * 0.38));
      r.set(x, y, c);
    }
  }
  // 墙角的斜缝
  const seam = rgba('#150d0a');
  for (let i = 0; i <= 16; i++) {
    const t2 = i / 16;
    r.set(Math.round(t2 * fx), Math.round(t2 * fy), seam);
    r.set(Math.round(ROOM_W - 1 - t2 * fx), Math.round(t2 * fy), seam);
    r.set(Math.round(t2 * fx), Math.round(ROOM_H - 1 - t2 * (ROOM_H - fy - fh)), seam);
    r.set(Math.round(ROOM_W - 1 - t2 * fx), Math.round(ROOM_H - 1 - t2 * (ROOM_H - fy - fh)), seam);
  }
  // 地板边上的阴影线
  r.rect(fx, fy - 1, fw, 1, rgba('#150d0a'));
  r.rect(fx - 1, fy, 1, fh, rgba('#150d0a'));
  r.rect(fx + fw, fy, 1, fh, rgba('#150d0a'));
  r.rect(fx, fy + fh, fw, 1, rgba('#150d0a'));
  // 外框描边
  r.rect(0, 0, ROOM_W, 1, K);
  r.rect(0, ROOM_H - 1, ROOM_W, 1, K);
  r.rect(0, 0, 1, ROOM_H, K);
  r.rect(ROOM_W - 1, 0, 1, ROOM_H, K);
}

// 地下室的泥地：大块明暗 + 小石子 + 污渍
function drawDirtFloor(r, theme, seed) {
  const t = THEMES[theme];
  const a = rgba(t.floor), b = rgba(t.floor2), pebble = rgba(t.pebble);
  const n1 = valueNoise(seed, 14), n2 = valueNoise(seed + 7, 5);
  const rand = rng(seed + 3);
  const { x: fx, y: fy, w: fw, h: fh } = FLOOR;
  for (let y = fy; y < fy + fh; y++) {
    for (let x = fx; x < fx + fw; x++) {
      const v = n1(x, y) * 0.7 + n2(x, y) * 0.3;
      let c = mix(b, a, v);
      if (rand() < 0.04) c = scale(c, 0.86);
      r.set(x, y, c);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = fx + Math.floor(rand() * fw), y = fy + Math.floor(rand() * fh);
    r.set(x, y, rand() < 0.5 ? pebble : scale(pebble, 1.25));
    if (rand() < 0.3) r.set(x + 1, y, scale(pebble, 0.8));
  }
  // 几块深色污渍
  for (let i = 0; i < 6; i++) {
    const cx = fx + 10 + rand() * (fw - 20), cy = fy + 8 + rand() * (fh - 16), rx = 4 + rand() * 7, ry = 2 + rand() * 4;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 - rand() * 0.25) r.shade(x, y, 0.9);
  }
}

// 图书馆的木地板
function drawPlankFloor(r, seed) {
  const rand = rng(seed);
  const woods = ['#6e4526', '#64401f', '#76502c', '#5d3b1f'].map((c) => rgba(c));
  const seamC = rgba('#2e1b0e');
  const { x: fx, y: fy, w: fw, h: fh } = FLOOR;
  for (let row = 0; row * 8 < fh; row++) {
    let x = fx - Math.floor(rand() * 40);
    while (x < fx + fw) {
      const len = 26 + Math.floor(rand() * 34);
      const base = woods[Math.floor(rand() * woods.length)];
      const grain = valueNoise(Math.floor(rand() * 1e6), 3);
      for (let j = 0; j < 8; j++) {
        const y = fy + row * 8 + j;
        if (y >= fy + fh) break;
        for (let i = 0; i < len; i++) {
          const px = x + i;
          if (px < fx || px >= fx + fw) continue;
          let c = j === 7 ? seamC : scale(base, 0.9 + grain(i * 0.5, j * 3) * 0.2);
          if (i === len - 1) c = seamC;
          if (j === 0) c = scale(c, 1.08);
          r.set(px, y, c);
        }
      }
      // 钉子
      if (len > 30) r.set(x + 2, fy + row * 8 + 3, rgba('#2a1a10'));
      x += len;
    }
  }
}

// 地板边缘的暗角，让房间有纵深
function vignette(r, strength = 0.42) {
  const { x: fx, y: fy, w: fw, h: fh } = FLOOR;
  for (let y = fy; y < fy + fh; y++) {
    for (let x = fx; x < fx + fw; x++) {
      const d = Math.min(x - fx, fx + fw - 1 - x, (y - fy) * 1.6, (fy + fh - 1 - y) * 2.2);
      const edge = d < 14 ? (1 - d / 14) * strength : 0;
      const nx = (x - (fx + fw / 2)) / (fw / 2), ny = (y - (fy + fh / 2)) / (fh / 2);
      const center = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny)) * 0.12;
      r.shade(x, y, 1 - edge + center);
    }
  }
}

// —— 门 ————————————————————————————————————————————————
const DOOR_STYLES = {
  normal: { hi: '#8e8076', mid: '#6f6259', lo: '#4f443d' },
  library: { hi: '#9c6a3c', mid: '#7a4f2b', lo: '#553519' },
  dice: { hi: '#a4958a', mid: '#7f7066', lo: '#57493f' },
  planetarium: { hi: '#6f7fd6', mid: '#4a55a8', lo: '#2c326e' },
  treasure: { hi: '#fff1a8', mid: '#f5c84c', lo: '#b88a2c' },
  angel: { hi: '#ffffff', mid: '#dbe7f5', lo: '#9fb6d6' },
  shop: { hi: '#8e8076', mid: '#6f6259', lo: '#4f443d' },
};
export const DOOR_ICON = { library: 'icon.book', dice: 'icon.die', planetarium: 'icon.star', treasure: 'icon.crown', angel: 'icon.angel', shop: 'icon.coin' };

// 画一扇朝上的门（拱顶在上，门洞贴着下边），其他方向旋转得到
export function makeDoor(style, h, { locked = false, seed = 1 } = {}) {
  const w = 28;
  const st = DOOR_STYLES[style] ?? DOOR_STYLES.normal;
  const hi = rgba(st.hi), mid = rgba(st.mid), lo = rgba(st.lo);
  const r = new Raster(w, h);
  const R = h > 20 ? 12 : 7;
  const inOuter = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    if (y >= R) return true;
    const cx = Math.min(Math.max(x + 0.5, R), w - R);
    return (x + 0.5 - cx) ** 2 + (y + 0.5 - R) ** 2 <= R * R;
  };
  const oTop = h > 20 ? 7 : 2, oR = 6, ox0 = 8, ox1 = 20;
  const inOpening = (x, y) => {
    if (x < ox0 || x >= ox1 || y >= h) return false;
    if (y >= oTop + oR) return true;
    return (x + 0.5 - 14) ** 2 + (y + 0.5 - (oTop + oR)) ** 2 <= oR * oR;
  };
  const rand = rng(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOuter(x, y)) continue;
      if (inOpening(x, y)) {
        const d = Math.min(x - ox0, ox1 - 1 - x, y - oTop);
        r.set(x, y, mix(rgba('#000000'), rgba('#1d1411'), Math.max(0, 1 - d / 4)));
        continue;
      }
      const edge = !inOuter(x - 1, y) || !inOuter(x + 1, y) || !inOuter(x, y - 1) || inOpening(x - 1, y) || inOpening(x + 1, y) || inOpening(x, y + 1) || inOpening(x, y - 1);
      if (edge) { r.set(x, y, K); continue; }
      // 石块纹理：左上亮、右下暗
      const block = Math.floor(x / 4) + Math.floor(y / 3) * 7;
      let c = (block * 2654435761) % 5 < 2 ? hi : mid;
      if (x > 20 || y > h - 5) c = lo;
      if (rand() < 0.06) c = lo;
      r.set(x, y, c);
    }
  }
  if (locked) {
    // 木板把门洞封上
    const woods = [rgba('#7a4f2b'), rgba('#6a4324'), rgba('#83562f')];
    for (let y = oTop; y < h; y++)
      for (let x = ox0; x < ox1; x++)
        if (inOpening(x, y)) r.set(x, y, (x - ox0) % 4 === 3 ? rgba('#3a2413') : woods[Math.floor((x - ox0) / 4) % 3]);
  }
  return { w, h, px: Array.from({ length: w * h }, (_, i) => { const c = r.get(i % w, Math.floor(i / w)); return c[3] ? c : null; }) };
}

// —— 家具 ———————————————————————————————————————————————
export function makeBookshelf(w, h, seed) {
  const r = new Raster(w, h);
  const rand = rng(seed);
  const wood = rgba('#6b4526'), woodHi = rgba('#8a5c33'), woodLo = rgba('#4a2e17'), back = rgba('#2a1a10');
  r.rect(0, 0, w, h, K);
  r.rect(1, 1, w - 2, h - 2, wood);
  r.rect(1, 1, w - 2, 1, woodHi);
  r.rect(3, 4, w - 6, h - 7, back);
  const books = ['#3a57a8', '#c41e24', '#2f7d4a', '#8a3b8f', '#d8a53a', '#e3d7b8', '#7a2e20', '#355a7a', '#5b3f8a', '#9a4a2a'].map((c) => rgba(c));
  const shelfH = Math.floor((h - 7) / 3);
  for (let s = 0; s < 3; s++) {
    const top = 4 + s * shelfH, bottom = top + shelfH - 1;
    let x = 3;
    while (x < w - 4) {
      const bw = 2 + Math.floor(rand() * 2);
      const bh = shelfH - 2 - Math.floor(rand() * 3);
      if (rand() < 0.08) { x += bw; continue; }
      const c = books[Math.floor(rand() * books.length)];
      r.rect(x, bottom - bh, bw, bh, c);
      r.rect(x, bottom - bh, 1, bh, scale(c, 1.25));
      r.rect(x + bw - 1, bottom - bh, 1, bh, scale(c, 0.7));
      if (bh > 4 && rand() < 0.5) r.rect(x, bottom - bh + 2, bw, 1, rgba('#f5c84c'));
      x += bw;
    }
    r.rect(1, bottom, w - 2, 1, woodLo);
    r.rect(1, bottom + 1, w - 2, 1, wood);
  }
  r.rect(1, h - 3, w - 2, 2, woodLo);
  return r;
}

export function makeRug(w, h) {
  const r = new Raster(w, h);
  const red = rgba('#7c1d22'), redD = rgba('#5c1418'), gold = rgba('#d8a53a'), goldD = rgba('#9c7420');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const e = Math.min(x, y, w - 1 - x, h - 1 - y);
      let c;
      if (e === 0) c = K;
      else if (e === 1 || e === 4) c = gold;
      else if (e === 2 || e === 3) c = ((x + y) >> 1) % 2 ? red : goldD;
      else c = ((x >> 2) + (y >> 2)) % 2 ? red : redD;
      // 中间一个菱形
      const dx = Math.abs(x - (w - 1) / 2), dy = Math.abs(y - (h - 1) / 2);
      if (e > 5 && dx / (w / 5) + dy / (h / 5) < 1) c = (dx + dy) % 3 < 1 ? gold : goldD;
      r.set(x, y, c);
    }
  }
  // 流苏
  return r;
}

export function makeFrame(w, h) {
  const r = new Raster(w, h);
  const wood = rgba('#7a4f2b'), hi = rgba('#b07a45'), lo = rgba('#4a2e17');
  r.rect(0, 0, w, h, K);
  r.rect(1, 1, w - 2, h - 2, wood);
  r.rect(1, 1, w - 2, 1, hi);
  r.rect(1, 1, 1, h - 2, hi);
  r.rect(1, h - 2, w - 2, 1, lo);
  r.rect(w - 2, 1, 1, h - 2, lo);
  r.rect(3, 3, w - 6, h - 6, K);
  r.rect(4, 4, w - 8, h - 8, rgba('#140c0a'));
  return r;
}

export function makePlaque(w, h) {
  const r = new Raster(w, h);
  r.rect(0, 0, w, h, K);
  r.rect(1, 1, w - 2, h - 2, rgba('#6b4526'));
  r.rect(1, 1, w - 2, 1, rgba('#9c6a3c'));
  r.rect(1, h - 2, w - 2, 1, rgba('#4a2e17'));
  r.set(2, 2, rgba('#d8a53a'));
  r.set(w - 3, 2, rgba('#d8a53a'));
  return r;
}

// 界面用的九宫格边框（CSS border-image），每格 4px
export function makeUIFrame(kind) {
  const r = new Raster(12, 12);
  const [fill, hi, lo] = {
    paper: ['#eadfc2', '#f7f0dc', '#c7b48b'],
    stone: ['#2a211d', '#4a3c34', '#171110'],
    wood: ['#6b4526', '#9c6a3c', '#4a2e17'],
  }[kind].map((c) => rgba(c));
  r.rect(0, 0, 12, 12, fill);
  for (let i = 1; i < 11; i++) { r.set(i, 0, K); r.set(i, 11, K); r.set(0, i, K); r.set(11, i, K); }
  r.rect(1, 1, 10, 1, hi);
  r.rect(1, 1, 1, 10, hi);
  r.rect(1, 10, 10, 1, lo);
  r.rect(10, 1, 1, 10, lo);
  // 四个角缺一个像素，看起来是圆角
  for (const [x, y] of [[0, 0], [11, 0], [0, 11], [11, 11]]) r.set(x, y, [0, 0, 0, 0]);
  return r;
}

// 纸张底纹（平铺）
export function makePaperTile() {
  const r = new Raster(64, 64);
  const n = valueNoise(99, 11), rand = rng(5);
  const a = rgba('#ece2c8'), b = rgba('#dccdab');
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      // 让噪声在边界上接得上：取四个方向的平均
      const v = (n(x, y) + n(x + 64, y) + n(x, y + 64) + n(x + 64, y + 64)) / 4;
      let c = mix(b, a, Math.min(1, v * 1.3));
      if (rand() < 0.03) c = scale(c, 0.95);
      r.set(x, y, c);
    }
  return r;
}

// 页面底色：暗色地下室泥地（平铺）
export function makeDirtTile() {
  const r = new Raster(64, 64);
  const rand = rng(11);
  const a = rgba('#1d1411'), b = rgba('#170f0d'), p = rgba('#261b16');
  const n = valueNoise(4, 13);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const v = (n(x, y) + n(x + 64, y) + n(x, y + 64) + n(x + 64, y + 64)) / 4;
      r.set(x, y, rand() < 0.02 ? p : mix(b, a, v));
    }
  return r;
}

export { drawWalls, drawDirtFloor, drawPlankFloor, vignette };
