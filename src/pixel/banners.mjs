// 每个页面顶上的像素横幅（360×96），构建时画成 PNG，页面里放大显示。
// 地下室那几张沿用以撒的房间画法：上面一截后墙，左右两道侧墙，下面是地面；动漫页是一张水墨蓬莱。
import { Raster, rgba, rng } from './raster.mjs';
import { sprite } from './sprites.mjs';
import { K, mix, scale, valueNoise, makeBookshelf, makeRug, makeFrame, makeDiceTower } from './art.mjs';

export const BANNER_W = 360;
export const BANNER_H = 96;
const WALL = 30; // 后墙高度
const SIDE = 14; // 侧墙宽度
const SEAM = rgba('#150d0a');

// —— 房间 ————————————————————————————————————————————————

function walls(r, { seed, stone, mortar }) {
  const W = r.w, H = r.h;
  const stoneC = rgba(stone), mortarC = rgba(mortar);
  const rand = rng(seed);
  const tint = new Map();
  const brick = (k) => {
    if (!tint.has(k)) tint.set(k, 0.82 + rand() * 0.32);
    return tint.get(k);
  };
  const noise = valueNoise(seed + 1, 9);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dTop = (WALL - y) / WALL, dLeft = (SIDE - x) / SIDE, dRight = (x - (W - SIDE - 1)) / SIDE;
      const m = Math.max(dTop, dLeft, dRight);
      if (m <= 0) continue;
      const wall = m === dTop ? 'top' : m === dLeft ? 'left' : 'right';
      let isMortar, key;
      if (wall === 'top') {
        const row = Math.floor(y / 8), off = row % 2 ? 8 : 0;
        isMortar = y % 8 === 7 || (x + off) % 16 === 15;
        key = `t${Math.floor((x + off) / 16)},${row}`;
      } else {
        const col = Math.floor(x / 8), off = col % 2 ? 8 : 0;
        isMortar = x % 8 === 7 || (y + off) % 16 === 15;
        key = `${wall}${col},${Math.floor((y + off) / 16)}`;
      }
      let c = isMortar ? mortarC : scale(stoneC, brick(key) * (0.9 + noise(x, y) * 0.2));
      const light = { top: 1, left: 0.84, right: 0.72 }[wall];
      c = scale(c, light * (1.08 - (1 - m) * 0.38));
      r.set(x, y, c);
    }
  for (let i = 0; i <= SIDE; i++) {
    const t = i / SIDE;
    r.set(Math.round(t * SIDE), Math.round(t * WALL), SEAM);
    r.set(Math.round(W - 1 - t * SIDE), Math.round(t * WALL), SEAM);
  }
  r.rect(SIDE, WALL, W - 2 * SIDE, 1, SEAM);
  r.rect(SIDE - 1, WALL, 1, H - WALL, SEAM);
  r.rect(W - SIDE, WALL, 1, H - WALL, SEAM);
}

function dirt(r, { seed, a, b, pebble }) {
  const A = rgba(a), B = rgba(b), P = rgba(pebble);
  const n1 = valueNoise(seed, 14), n2 = valueNoise(seed + 7, 5);
  const rand = rng(seed + 3);
  const x0 = SIDE, x1 = r.w - SIDE, y0 = WALL + 1;
  for (let y = y0; y < r.h; y++)
    for (let x = x0; x < x1; x++) {
      let c = mix(B, A, n1(x, y) * 0.7 + n2(x, y) * 0.3);
      if (rand() < 0.04) c = scale(c, 0.86);
      r.set(x, y, c);
    }
  for (let i = 0; i < 110; i++) {
    const x = x0 + Math.floor(rand() * (x1 - x0)), y = y0 + Math.floor(rand() * (r.h - y0));
    r.set(x, y, rand() < 0.5 ? P : scale(P, 1.25));
    if (rand() < 0.3) r.set(x + 1, y, scale(P, 0.8));
  }
}

function planks(r, { seed }) {
  const rand = rng(seed);
  const woods = ['#6e4526', '#64401f', '#76502c', '#5d3b1f'].map((c) => rgba(c));
  const seamC = rgba('#2e1b0e');
  const x0 = SIDE, x1 = r.w - SIDE, y0 = WALL + 1;
  for (let row = 0; y0 + row * 8 < r.h; row++) {
    let x = x0 - Math.floor(rand() * 40);
    while (x < x1) {
      const len = 26 + Math.floor(rand() * 34);
      const base = woods[Math.floor(rand() * woods.length)];
      const grain = valueNoise(Math.floor(rand() * 1e6), 3);
      for (let j = 0; j < 8; j++) {
        const y = y0 + row * 8 + j;
        if (y >= r.h) break;
        for (let i = 0; i < len; i++) {
          const px = x + i;
          if (px < x0 || px >= x1) continue;
          let c = j === 7 || i === len - 1 ? seamC : scale(base, 0.9 + grain(i * 0.5, j * 3) * 0.2);
          if (j === 0) c = scale(c, 1.08);
          r.set(px, y, c);
        }
      }
      if (len > 30) r.set(x + 2, y0 + row * 8 + 3, rgba('#2a1a10'));
      x += len;
    }
  }
}

// 靠墙的地方暗一点，最下面也收一点，看起来像房间的一截
function vignette(r, strength = 0.42) {
  const x0 = SIDE, x1 = r.w - SIDE, y0 = WALL + 1;
  for (let y = y0; y < r.h; y++)
    for (let x = x0; x < x1; x++) {
      const d = Math.min(x - x0, x1 - 1 - x, (y - y0) * 1.6);
      let f = 1 - (d < 14 ? (1 - d / 14) * strength : 0);
      f *= 1 - Math.max(0, (y - (r.h - 18)) / 18) * 0.25;
      r.shade(x, y, f);
    }
}

function room(opts) {
  const r = new Raster(BANNER_W, BANNER_H);
  walls(r, opts);
  if (opts.floor === 'planks') planks(r, opts);
  else dirt(r, opts);
  vignette(r, opts.vignette ?? 0.42);
  return r;
}

function blit(r, src, x, y) {
  for (let j = 0; j < src.h; j++)
    for (let i = 0; i < src.w; i++) {
      const c = src.get(i, j);
      if (c[3]) r.set(x + i, y + j, c);
    }
}

// 椭圆形的影子（把地面压暗）
function shadow(r, cx, cy, rx, ry, f = 0.62) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) r.shade(x, y, f);
}

function put(r, name, x, y, opts) {
  r.draw(sprite(name), x, y, opts);
}

// 以撒：x, y 是头的左上角（18×23）
function isaac(r, x, y, { eye = 'isaac.eye', mouth = 'isaac.mouth', look = 0, horns = false } = {}) {
  shadow(r, x + 9, y + 23, 8, 2.5);
  put(r, 'isaac.body', x, y + 16);
  put(r, 'isaac.head', x, y);
  put(r, eye, x + 3 + look, y + 5);
  put(r, eye, x + 11 + look, y + 5);
  const m = sprite(mouth);
  put(r, mouth, x + 9 - (m.w >> 1) + look, y + 12);
  if (horns) put(r, 'isaac.horns', x, y - 2);
}

// 基座上浮着一件道具
function pedestal(r, x, y, item) {
  shadow(r, x + 8, y + 11, 9, 2.5);
  put(r, 'pedestal', x, y);
  const s = sprite(item);
  const ix = x + 8 - (s.w >> 1), iy = y - s.h - 3;
  shadow(r, x + 8, y + 1, 4, 1, 0.75);
  put(r, item, ix, iy);
}

function candle(r, x, y, frame = '') {
  shadow(r, x + 2.5, y + 11, 3.5, 1.5);
  put(r, `candle${frame}`, x, y);
  // 一圈暖光
  for (let j = -14; j <= 14; j++)
    for (let i = -14; i <= 14; i++) {
      const d = Math.hypot(i, j * 1.3) / 14;
      if (d < 1) {
        const [px, py] = [x + 2 + i, y + 1 + j];
        if (px < 0 || py < 0 || px >= r.w || py >= r.h) continue;
        const c = r.get(px, py);
        r.set(px, py, [255, 190, 90, Math.round((1 - d) * (1 - d) * 46)]);
        void c;
      }
    }
}

function furniture(r, src, x, y) {
  shadow(r, x + src.w / 2, y + src.h, src.w / 2, 3, 0.6);
  blit(r, src, x, y);
}

// —— 首页：起始房 —————————————————————————————————————————

function home() {
  const r = room({ seed: 101, stone: '#4d3f36', mortar: '#271e19', a: '#3a2c24', b: '#2f231d', pebble: '#4b3a30' });
  furniture(r, makeBookshelf(44, 36, 3), 24, 6);
  const frame = makeFrame(30, 22);
  blit(r, frame, 165, 3);
  put(r, 'icon.moon', 171, 9);
  for (const [x, y] of [[184, 8], [188, 13], [178, 16], [190, 7]]) r.set(x, y, rgba('#f5e6b8'));
  put(r, 'scroll', 270, 2);
  blit(r, makeRug(72, 22), 144, 58);
  candle(r, 78, 29);
  candle(r, 300, 29, '.2');
  pedestal(r, 98, 60, 'd20');
  pedestal(r, 246, 60, 'tarot.back');
  isaac(r, 171, 44);
  shadow(r, 320, 83, 9, 2.5);
  put(r, 'poop', 312, 70);
  put(r, 'fly.1', 332, 56);
  put(r, 'fly.2', 296, 48);
  put(r, 'coin', 62, 74);
  put(r, 'key', 124, 84);
  put(r, 'heart', 222, 82);
  put(r, 'rock', 20, 70);
  return r;
}

// —— 学习：图书馆 ——————————————————————————————————————————

function study() {
  const r = room({ seed: 202, stone: '#4a3d35', mortar: '#241b16', floor: 'planks', vignette: 0.36 });
  [20, 84, 155, 226, 290].forEach((x, i) => furniture(r, makeBookshelf(50, 38, 3 + i * 5), x, 4));
  blit(r, makeRug(124, 32), 118, 54);
  pedestal(r, 172, 70, 'book.open');
  shadow(r, 67, 80, 8, 2);
  put(r, 'books.stack', 60, 70);
  shadow(r, 300, 86, 8, 2);
  put(r, 'books.stack', 293, 76, { flipX: true });
  candle(r, 76, 44);
  candle(r, 280, 44, '.3');
  candle(r, 146, 44, '.2');
  candle(r, 210, 44);
  put(r, 'fly.1', 240, 66);
  return r;
}

// —— 游戏：硫磺火 + 钩子 —————————————————————————————————————

function brimstone(r, x0, x1, cy) {
  const dark = rgba('#7a0f14'), red = rgba('#c41e24'), hot = rgba('#ff9a9a'), white = rgba('#ffe9e4');
  for (let x = x0; x < x1; x++) {
    const wob = Math.round(Math.sin((x - x0) / 5) * 0.8);
    const half = 4 + (x - x0 < 6 ? 1 : 0);
    for (let dy = -half; dy <= half; dy++) {
      const a = Math.abs(dy);
      const c = a >= half ? dark : a >= half - 1 ? red : a >= 2 ? hot : white;
      r.set(x, cy + dy + wob, c);
    }
    // 外面一层淡淡的红光
    for (const dy of [-half - 1, half + 1, -half - 2, half + 2]) {
      const [px, py] = [x, cy + dy + wob];
      if (py >= 0 && py < r.h) r.set(px, py, [196, 30, 36, Math.abs(dy) === half + 1 ? 110 : 50]);
    }
  }
  // 起点的光球
  for (let j = -7; j <= 7; j++)
    for (let i = -7; i <= 7; i++) {
      const d = Math.hypot(i, j);
      if (d <= 6.5) r.set(x0 + i, cy + j, d > 5.5 ? dark : d > 4 ? red : d > 2 ? hot : white);
    }
  // 打到墙上溅开
  const rand = rng(9);
  for (let i = 0; i < 26; i++) {
    const a = Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.4, d = 2 + rand() * 9;
    r.set(Math.round(x1 - 1 + Math.cos(a) * d * 0.6), Math.round(cy + Math.sin(a) * d), rand() < 0.5 ? red : hot);
  }
}

function fog(r, x0, x1, y0) {
  const n = valueNoise(31, 10), n2 = valueNoise(57, 4);
  for (let y = y0; y < r.h; y++)
    for (let x = x0; x < x1; x++) {
      const edge = Math.min(1, (x - x0) / 60);
      const v = n(x, y * 2) * 0.7 + n2(x, y) * 0.3;
      const a = Math.max(0, v - 0.35) * edge * Math.min(1, (y - y0) / 20) * 150;
      if (a > 4) r.set(x, y, [200, 205, 215, Math.round(a)]);
    }
}

function splat(r, cx, cy, seed, size = 5) {
  const rand = rng(seed);
  const red = rgba('#6e1116'), red2 = rgba('#8c161c');
  for (let i = 0; i < size * 5; i++) {
    const a = rand() * Math.PI * 2, d = rand() * size;
    const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.5);
    r.set(x, y, rand() < 0.6 ? red : red2);
    if (rand() < 0.5) r.set(x + 1, y, red);
  }
}

function games() {
  const r = room({ seed: 303, stone: '#4a3833', mortar: '#221613', a: '#3a2622', b: '#2c1c19', pebble: '#4a302b', vignette: 0.5 });
  splat(r, 60, 70, 1, 7);
  splat(r, 152, 84, 2, 5);
  splat(r, 300, 66, 3, 6);
  put(r, 'rock', 30, 40);
  // 钩子立在雾里
  shadow(r, 240, 88, 8, 2.5);
  put(r, 'hook', 234, 50);
  fog(r, 190, r.w - SIDE, WALL + 1);
  isaac(r, 100, 34, { eye: 'isaac.eye', mouth: 'isaac.mouth.open', look: 2, horns: true });
  brimstone(r, 121, r.w - SIDE, 43);
  put(r, 'heart', 40, 82);
  put(r, 'heart.half', 52, 82);
  put(r, 'fly.1', 176, 76);
  return r;
}

// —— 跑团：骰塔、骰子、塔罗 ——————————————————————————————————

function feltMat(r, x, y, w, h) {
  const wood = rgba('#6b4526'), woodHi = rgba('#9c6a3c'), woodLo = rgba('#4a2e17');
  const felt = rgba('#2f5d3a'), felt2 = rgba('#2a5434');
  const n = valueNoise(88, 6);
  shadow(r, x + w / 2, y + h + 1, w / 2 + 2, 3, 0.6);
  r.rect(x, y, w, h, K);
  r.rect(x + 1, y + 1, w - 2, h - 2, wood);
  r.rect(x + 1, y + 1, w - 2, 1, woodHi);
  r.rect(x + 1, y + h - 2, w - 2, 1, woodLo);
  for (let j = 4; j < h - 4; j++) for (let i = 4; i < w - 4; i++) r.set(x + i, y + j, mix(felt2, felt, n(i, j)));
  r.rect(x + 4, y + 4, w - 8, 1, rgba('#1f3f27'));
}

function trpg() {
  const r = room({ seed: 404, stone: '#4b4038', mortar: '#261d18', floor: 'planks', vignette: 0.4 });
  put(r, 'scroll', 58, 2);
  put(r, 'scroll', 290, 2, { flipX: true });
  candle(r, 34, 40);
  candle(r, 320, 40, '.3');
  feltMat(r, 100, 50, 160, 40);
  const tower = makeDiceTower();
  shadow(r, 180, 68, 18, 3);
  blit(r, tower, 163, 8);
  put(r, 'd20', 212, 64);
  put(r, 'd6', 138, 72);
  put(r, 'd4', 232, 76);
  put(r, 'd10', 116, 58);
  for (const [name, x, y] of [['tarot.back', 262, 60], ['tarot.front', 275, 56], ['tarot.back', 288, 60]]) {
    shadow(r, x + 5.5, y + 15, 6, 1.5, 0.7);
    put(r, name, x, y);
  }
  shadow(r, 68, 83, 8, 2);
  put(r, 'books.stack', 60, 73);
  put(r, 'coin', 90, 84);
  put(r, 'coin', 97, 86);
  return r;
}

// —— 动漫：水墨蓬莱，日月同错 ——————————————————————————————————

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x, y, t) => t > BAYER[(y & 3) * 4 + (x & 3)];

function anime() {
  const W = BANNER_W, H = BANNER_H;
  const r = new Raster(W, H);
  const paper = rgba('#efe6d2'), paper2 = rgba('#e5dac1');
  const pn = valueNoise(5, 7), rand = rng(21);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) r.set(x, y, rand() < 0.03 ? paper2 : mix(paper2, paper, 0.55 + pn(x, y) * 0.45));

  // 日（红）与月（淡），同时挂在天上
  const disc = (cx, cy, rad, fill, rim) => {
    for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++)
      for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= rad) r.set(x, y, d > rad - 1 && rim ? rim : fill(x, y, d));
      }
  };
  disc(66, 27, 12, () => rgba('#c8372d'), null);
  disc(296, 22, 9, (x, y) => (Math.hypot(x + 0.5 - 299, y + 0.5 - 20) > 8.5 ? rgba('#ddd5c3') : rgba('#faf6ec')), rgba('#a9a193'));

  // 三层山：远淡近浓；山体上浓下淡，化进云雾（近处的雾盖住远处的山脚）
  const layers = [
    { ink: '#aaa597', base: 78, seed: 1, rough: 2, peaks: [[22, 30, 16], [70, 40, 14], [118, 30, 18], [210, 42, 15], [252, 32, 14], [304, 38, 16], [350, 30, 14]] },
    { ink: '#6f6b61', base: 86, seed: 2, rough: 3, peaks: [[40, 36, 12], [96, 48, 11], [150, 34, 10], [186, 62, 12], [226, 40, 10], [282, 52, 12], [338, 36, 11]] },
    { ink: '#2b2824', base: 98, seed: 3, rough: 3, peaks: [[14, 26, 12], [54, 34, 10], [124, 18, 14], [258, 22, 13], [318, 36, 11]] },
  ];
  const tops = [];
  for (const L of layers) {
    const ink = rgba(L.ink), wash = mix(ink, paper, 0.5), ridge = valueNoise(L.seed * 17, 4), tex = valueNoise(L.seed * 31, 3), mist = valueNoise(L.seed * 43, 18);
    const top = new Array(W).fill(999);
    for (let x = 0; x < W; x++) {
      let h = 0;
      for (const [px, ph, pw] of L.peaks) {
        const d = Math.abs(x + 0.5 - px) / pw;
        if (d < 1) h = Math.max(h, ph * Math.pow(1 - d * d, 0.7));
      }
      if (h > 0) top[x] = Math.round(L.base - h + (ridge(x, 0) - 0.5) * L.rough * 2);
    }
    tops.push(top);
    for (let x = 0; x < W; x++) {
      if (top[x] >= H) continue;
      const height = L.base - top[x];
      for (let y = Math.max(0, top[x]); y < H; y++) {
        const depth = y - top[x];
        if (depth < 1) { r.set(x, y, scale(ink, 0.78)); continue; }
        // 上浓下淡 + 竖向皴擦 + 一团团的云
        let k = 0.95 - (depth / Math.max(12, height * 0.9)) * 0.9;
        k += (tex(x * 1.6, y * 0.5) - 0.5) * 0.3;
        k -= Math.max(0, mist(x, y * 2.2) - 0.45) * 1.6;
        let c = paper;
        if (k > 0.72) c = ink;
        else if (k > 0.45) c = dither(x, y, (k - 0.45) / 0.27) ? ink : wash;
        else if (k > 0.12) c = dither(x, y, (k - 0.12) / 0.33) ? wash : paper;
        r.set(x, y, c);
      }
    }
  }

  // 主峰上的楼阁
  put(r, 'pavilion', 180, tops[1][186] - 7);

  // 海：下面几排浪花
  const inkC = rgba('#2b2824'), waveC = rgba('#8c877b');
  for (let row = 0; row < 3; row++) {
    const y = 87 + row * 3, off = row % 2 ? 5 : 0;
    for (let x = 0; x < W; x++) {
      if (tops[2][x] <= y + 1) continue;
      for (let yy = y - 1; yy < y + 3 && yy < H; yy++) r.set(x, yy, mix(paper, rgba('#dcd4c1'), (yy - 84) / 12));
      const k = (x + off) % 10;
      if (k >= 1 && k <= 4) r.set(x, y + (k === 1 || k === 4 ? 1 : 0), row === 0 ? inkC : waveC);
    }
  }

  // 仙鹤
  for (const [x, y, flip] of [[228, 14, false], [240, 20, false], [250, 11, false], [112, 34, true], [124, 40, true]]) put(r, 'crane', x, y, { flipX: flip });
  return r;
}

export const BANNERS = { home, study, games, trpg, anime };

export function renderBanners() {
  return Object.fromEntries(Object.entries(BANNERS).map(([id, fn]) => [id, fn()]));
}

export { makeDiceTower };
