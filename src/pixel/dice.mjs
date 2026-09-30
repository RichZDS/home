// 骰塔里用的骰子：多边形填色 + 描边 + 几个明暗面。点数是页面上叠的文字，不画进图里。
import { Raster, rgba } from './raster.mjs';
import { K, scale } from './art.mjs';

// 每种颜色三档：正面、侧面、背光面
const COLORS = {
  red: ['#e5463d', '#c41e24', '#7a0f14'],
  ivory: ['#fbf5e4', '#e3d5b0', '#b39f76'],
  blue: ['#6f8fe3', '#3a57a8', '#22336b'],
  green: ['#5bb877', '#2f7d4a', '#1b4a2b'],
  purple: ['#b572ba', '#8a3b8f', '#52205a'],
  orange: ['#f2a358', '#d9772b', '#8a4413'],
  gold: ['#fff1a8', '#f5c84c', '#b88a2c'],
};

// 形状：outer 是轮廓，faces 按顺序匹配，第一个包含该像素的面决定颜色（0 正面 / 1 侧面 / 2 背光 / 3 更暗）
const SHAPES = {
  d4: {
    w: 21, h: 19,
    outer: [[10.5, 0.3], [20.8, 18.7], [0.2, 18.7]],
    faces: [
      [0, [[10.5, 5], [16.6, 16], [4.4, 16]]],
      [1, [[10.5, 0.3], [10.5, 5], [4.4, 16], [0.2, 18.7]]],
      [2, [[10.5, 0.3], [20.8, 18.7], [16.6, 16], [10.5, 5]]],
      [3, [[0.2, 18.7], [4.4, 16], [16.6, 16], [20.8, 18.7]]],
    ],
  },
  d6: {
    w: 19, h: 19,
    outer: [[1, 0], [18, 0], [19, 1], [19, 18], [18, 19], [1, 19], [0, 18], [0, 1]],
    faces: [
      [0, [[3, 3], [16, 3], [16, 16], [3, 16]]],
      [1, [[0, 0], [19, 0], [16, 3], [3, 3], [3, 16], [0, 19]]],
      [2, [[19, 0], [19, 19], [0, 19], [3, 16], [16, 16], [16, 3]]],
    ],
  },
  d8: {
    w: 19, h: 21,
    outer: [[9.5, 0.2], [18.8, 10.5], [9.5, 20.8], [0.2, 10.5]],
    faces: [
      [0, [[9.5, 1.5], [16, 13], [3, 13]]],
      [1, [[9.5, 0.2], [9.5, 1.5], [3, 13], [0.2, 10.5]]],
      [2, [[9.5, 0.2], [18.8, 10.5], [16, 13], [9.5, 1.5]]],
      [3, [[0.2, 10.5], [3, 13], [16, 13], [18.8, 10.5], [9.5, 20.8]]],
    ],
  },
  d10: {
    w: 19, h: 21,
    outer: [[9.5, 0.2], [18.8, 11], [16.2, 15.6], [9.5, 20.8], [2.8, 15.6], [0.2, 11]],
    faces: [
      [0, [[9.5, 1.4], [15.4, 10.6], [9.5, 15.2], [3.6, 10.6]]],
      [1, [[9.5, 0.2], [9.5, 1.4], [3.6, 10.6], [0.2, 11]]],
      [2, [[9.5, 0.2], [18.8, 11], [15.4, 10.6], [9.5, 1.4]]],
      [3, [[0.2, 11], [3.6, 10.6], [9.5, 15.2], [15.4, 10.6], [18.8, 11], [16.2, 15.6], [9.5, 20.8], [2.8, 15.6]]],
    ],
  },
  d12: {
    w: 21, h: 21,
    outer: ring(10.5, 10.5, 10.4, 10, -90),
    faces: [[0, ring(10.5, 11, 6.2, 5, -90)]],
    // 其余像素按方位分：左上亮、右下暗
    rest: (x, y) => (x - 10.5) + (y - 10.5) < 0 ? 1 : 2,
  },
  d20: {
    w: 21, h: 21,
    outer: ring(10.5, 10.5, 10.4, 6, -90),
    faces: [
      [0, [[10.5, 4], [17, 15.2], [4, 15.2]]],
      [1, [[10.5, 0], [10.5, 4], [4, 15.2], [1.4, 15.7], [1.4, 5.3]]],
      [2, [[10.5, 0], [19.6, 5.3], [19.6, 15.7], [17, 15.2], [10.5, 4]]],
      [3, [[1.4, 15.7], [4, 15.2], [17, 15.2], [19.6, 15.7], [10.5, 21]]],
    ],
  },
};

function ring(cx, cy, r, n, start) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function inside(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export function makeDie(shape, color) {
  const S = SHAPES[shape];
  const [c0, c1, c2] = COLORS[color].map((c) => rgba(c));
  const tones = [c0, c1, c2, scale(c2, 0.82)];
  const r = new Raster(S.w, S.h);
  const face = new Int8Array(S.w * S.h).fill(-1);
  for (let y = 0; y < S.h; y++)
    for (let x = 0; x < S.w; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (!inside(S.outer, px, py)) continue;
      let f = S.faces.find(([, poly]) => inside(poly, px, py))?.[0];
      if (f == null) f = S.rest ? S.rest(px, py) : 1;
      face[y * S.w + x] = f;
    }
  const at = (x, y) => (x < 0 || y < 0 || x >= S.w || y >= S.h ? -1 : face[y * S.w + x]);
  for (let y = 0; y < S.h; y++)
    for (let x = 0; x < S.w; x++) {
      const f = at(x, y);
      if (f < 0) continue;
      const out = at(x - 1, y) < 0 || at(x + 1, y) < 0 || at(x, y - 1) < 0 || at(x, y + 1) < 0;
      // 面和面之间的棱用背光色，正面左上角留一个高光
      const ridge = (at(x + 1, y) >= 0 && at(x + 1, y) !== f) || (at(x, y + 1) >= 0 && at(x, y + 1) !== f);
      r.set(x, y, out ? K : ridge ? scale(tones[Math.max(f, 1)], 0.78) : tones[f]);
    }
  return r;
}

// 骰塔要用的全部骰子：[形状, 颜色]
export const DICE = [
  ['d4', 'blue'], ['d4', 'ivory'], ['d4', 'gold'],
  ['d6', 'ivory'],
  ['d8', 'green'],
  ['d10', 'purple'], ['d10', 'ivory'], ['d10', 'red'],
  ['d12', 'orange'],
  ['d20', 'red'],
];
