// 程序生成的像素画：书架、地毯、相框、牌匾、骰塔、界面边框和底纹。
// 全部用固定种子，构建结果每次都一样。
import { Raster, rgba, rng } from './raster.mjs';

export const K = rgba('#1c100d');

export function mix(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)).concat(255);
}
export function scale(c, f) {
  return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f), c[3] ?? 255];
}

// 平滑的值噪声，用来给地板和墙面做大块的明暗变化
export function valueNoise(seed, cell) {
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


// 骰塔：城堡样子的石塔，顶上有垛口，挂一面红旗，底下拱门出口连着一个木头托盘
export function makeDiceTower() {
  const w = 34, h = 60;
  const r = new Raster(w, h);
  const rand = rng(77);
  const stone = rgba('#8e8076'), stoneHi = rgba('#a89a8e'), stoneLo = rgba('#5f534b'), mortar = rgba('#3b312b');
  const bx0 = 3, bx1 = w - 3, top = 6, base = 48;
  // 塔身
  for (let y = top; y < base; y++)
    for (let x = bx0; x < bx1; x++) {
      const row = Math.floor((y - top) / 5), off = row % 2 ? 3 : 0;
      const m = (y - top) % 5 === 4 || (x - bx0 + off) % 7 === 6;
      let c = m ? mortar : scale(stone, 0.86 + rand() * 0.22);
      if (!m && x < bx0 + 3) c = scale(stoneHi, 0.95 + rand() * 0.1);
      if (!m && x > bx1 - 5) c = scale(stoneLo, 0.95 + rand() * 0.1);
      r.set(x, y, c);
    }
  // 垛口
  for (let x = bx0 - 1; x < bx1 + 1; x++) {
    const merlon = Math.floor((x - bx0 + 1) / 5) % 2 === 0;
    const y0 = merlon ? 0 : 3;
    for (let y = y0; y < top + 1; y++) r.set(x, y, x < bx0 + 2 ? stoneHi : x > bx1 - 3 ? stoneLo : stone);
  }
  // 描边：只描不透明区域的外轮廓
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && r.get(x, y)[3] > 0;
  const edge = [];
  for (let y = 0; y < base; y++) for (let x = 0; x < w; x++) if (solid(x, y) && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1))) edge.push([x, y]);
  for (const [x, y] of edge) r.set(x, y, K);
  // 投骰口：顶上一道黑缝
  r.rect(bx0 + 7, 4, bx1 - bx0 - 14, 2, rgba('#0a0605'));
  // 窄窗
  r.rect(15, 12, 4, 8, K);
  r.rect(16, 13, 2, 6, rgba('#140c0a'));
  r.set(16, 13, rgba('#ffe07a'));
  // 红旗 + 金边 + 骰子纹样
  const red = rgba('#c41e24'), redD = rgba('#7a0f14'), gold = rgba('#f5c84c');
  for (let y = 23; y < 37; y++) {
    const inset = y > 33 ? (y - 33) : 0;
    for (let x = 10 + inset; x < 24 - inset; x++) r.set(x, y, x === 10 + inset || x === 23 - inset ? gold : x > 20 ? redD : red);
  }
  r.rect(10, 22, 14, 1, K);
  r.rect(14, 27, 6, 5, rgba('#eadfc2'));
  r.set(15, 28, K); r.set(18, 30, K); r.set(16, 29, K);
  // 拱门出口
  const ax = 17, ay = 44;
  for (let y = 38; y < base; y++)
    for (let x = 10; x < 24; x++) {
      const inArch = y >= ay || (x + 0.5 - ax) ** 2 + (y + 0.5 - ay) ** 2 <= 36;
      if (!inArch) continue;
      const rim = y < base && ((x + 0.5 - ax) ** 2 + (y + 0.5 - ay) ** 2 > 20 && y < ay || x === 10 || x === 23);
      r.set(x, y, rim ? K : rgba(y > 44 ? '#060403' : '#0f0907'));
    }
  // 托盘（带一点透视的木框）
  const wood = rgba('#7a4f2b'), woodHi = rgba('#9c6a3c'), woodLo = rgba('#553519'), felt = rgba('#2f5d3a'), feltD = rgba('#234a2d');
  r.rect(0, base - 1, w, h - base + 1, K);
  r.rect(1, base, w - 2, h - base - 1, wood);
  r.rect(1, base, w - 2, 1, woodHi);
  r.rect(1, h - 2, w - 2, 1, woodLo);
  for (let y = base + 2; y < h - 3; y++) for (let x = 3; x < w - 3; x++) r.set(x, y, y === base + 2 ? feltD : felt);
  r.rect(10, base - 1, 14, 3, rgba('#0f0907'));
  return r;
}
