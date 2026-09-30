/* 跑团页的骰塔：CoC d100（对 50 检定）、三角机构 6d4、DnD 多面骰。
   骰子是 canvas 上现算现画的 3D 多面体：正四 / 六 / 八 / 十二 / 二十面体，d10 是五方偏方面体。
   从左边的骰塔滚出来，弹几下停住，结果那一面朝上。随机数用 crypto.getRandomValues（拒绝采样，没有取模偏差）。 */

const $ = (s, el) => el.querySelector(s);
const $$ = (s, el) => Array.from(el.querySelectorAll(s));

function roll(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return (buf[0] % n) + 1;
}
const pick = (list) => list[roll(list.length) - 1];
const rnd = (a, b) => a + Math.random() * (b - a); // 只用来做动画

/* ---------------------------------------------------------------- 向量 / 四元数 */

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / (len(a) || 1));

// 四元数 [w, x, y, z]
const qMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
const qNorm = (q) => {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
};
function qAxis(axis, angle) {
  const [x, y, z] = norm(axis);
  const s = Math.sin(angle / 2);
  return [Math.cos(angle / 2), x * s, y * s, z * s];
}
function qSlerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) {
    b = [-b[0], -b[1], -b[2], -b[3]];
    d = -d;
  }
  if (d > 0.9995) return qNorm(a.map((c, i) => c + (b[i] - c) * t));
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((c, i) => c * wa + b[i] * wb);
}
function qMat([w, x, y, z]) {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}
const mApply = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
const qRandom = () => qNorm(qMul(qAxis([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)], rnd(0, Math.PI * 2)), qAxis([0, 0, 1], rnd(0, Math.PI * 2))));

/* ---------------------------------------------------------------- 多面体 */

const PHI = (1 + Math.sqrt(5)) / 2;

// 把模板里非 0 的分量展开成所有正负组合
function signs(t) {
  let out = [[]];
  for (const c of t) out = out.flatMap((p) => (c === 0 ? [[...p, 0]] : [[...p, c], [...p, -c]]));
  return out;
}
const cyclic = (t) => [t, [t[1], t[2], t[0]], [t[2], t[0], t[1]]];
const points = (templates) => templates.flatMap((t) => cyclic(t).flatMap(signs));
// 去重（cyclic 会把 (±1,±1,±1) 这种重复三遍）
const uniq = (pts) => {
  const seen = new Set();
  return pts.filter((p) => {
    const k = p.map((c) => c.toFixed(6)).join(',');
    return seen.has(k) ? false : seen.add(k);
  });
};

// 顶点 + 一组面法线 → 面（顶点按从外面看逆时针排序）
function facesFromNormals(verts, normals) {
  return normals.map((n0) => {
    const n = norm(n0);
    const d = verts.map((v) => dot(v, n));
    const max = Math.max(...d);
    const idx = verts.map((_, i) => i).filter((i) => d[i] > max - 1e-4);
    const c = mul(idx.reduce((acc, i) => add(acc, verts[i]), [0, 0, 0]), 1 / idx.length);
    const u = norm(sub(verts[idx[0]], c)), w = cross(n, u);
    const ang = (i) => Math.atan2(dot(sub(verts[i], c), w), dot(sub(verts[i], c), u));
    idx.sort((a, b) => ang(a) - ang(b));
    return { idx, n, c, up: u };
  });
}

// 法线列表排成 [前一半, 后一半 = 前一半取反]，这样第 i 面和第 i + F/2 面相对，点数之和是 F + 1
function pairUp(normals) {
  const first = [], second = [], used = new Set();
  normals.forEach((n, i) => {
    if (used.has(i)) return;
    const j = normals.findIndex((m, k) => !used.has(k) && k !== i && len(add(norm(m), norm(n))) < 1e-6);
    used.add(i).add(j);
    first.push(n);
    second.push(normals[j]);
  });
  return [...first, ...second];
}

function platonic(verts, normals, scale, sides) {
  verts = verts.map(norm);
  normals = pairUp(uniq(normals));
  const faces = facesFromNormals(verts, normals);
  const F = faces.length;
  faces.forEach((f, i) => (f.value = i < F / 2 ? i + 1 : F - (i - F / 2)));
  // 法线和顶点的朝向要配套（十二面体 / 二十面体的坐标不是互为对偶的那一组），配错了面就残缺
  console.assert(faces.every((f) => f.idx.length === sides), `多面体的面不对：期望每面 ${sides} 个顶点`);
  return { verts, faces, scale, upDir: (v) => faces.find((f) => f.value === v).n };
}

function tetra() {
  const raw = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  const verts = raw.map(norm);
  const faces = facesFromNormals(verts, raw.map((v) => mul(v, -1)));
  // 点数写在顶点上：顶点 i 的点数是 i + 1，投出的结果是朝上的那个顶点
  return { verts, faces, scale: 1.3, corners: true, upDir: (v) => verts[v - 1] };
}

function d10() {
  const zs = 1.25, e = Math.tan(Math.PI / 10) ** 2; // 上下两圈错开半格时，这个高度差让每个风筝面刚好是平的
  const verts = [[0, 0, zs], [0, 0, -zs]];
  for (let k = 0; k < 5; k++) {
    const a = (Math.PI * 2 * k) / 5;
    verts.push([Math.cos(a), Math.sin(a), e * zs]);
  }
  for (let k = 0; k < 5; k++) {
    const a = (Math.PI * 2 * k) / 5 + Math.PI / 5;
    verts.push([Math.cos(a), Math.sin(a), -e * zs]);
  }
  const U = (k) => 2 + ((k + 5) % 5), L = (k) => 7 + ((k + 5) % 5);
  const up = [0, 2, 4, 6, 8];
  const faces = [];
  for (let k = 0; k < 5; k++) faces.push({ idx: [0, U(k), L(k), U(k + 1)], value: up[k], apex: 0 });
  for (let j = 0; j < 5; j++) faces.push({ idx: [1, L(j), U(j + 1), L(j + 1)], value: 9 - up[(j + 3) % 5], apex: 1 });
  const scaled = verts.map((v) => mul(v, 1 / zs));
  for (const f of faces) {
    const p = f.idx.map((i) => scaled[i]);
    f.c = mul(p.reduce(add, [0, 0, 0]), 1 / p.length);
    let n = norm(cross(sub(p[1], p[0]), sub(p[2], p[0])));
    if (dot(n, f.c) < 0) {
      n = mul(n, -1);
      f.idx.reverse();
    }
    f.n = n;
    f.up = norm(sub(scaled[f.apex], f.c)); // 数字的头朝着尖端
  }
  return { verts: scaled, faces, scale: 1.08, upDir: (v) => faces.find((f) => f.value === v).n };
}

const SHAPES = {
  d4: tetra(),
  d6: platonic(points([[1, 1, 1]]), points([[1, 0, 0]]), 1, 4),
  d8: platonic(points([[1, 0, 0]]), points([[1, 1, 1]]), 1.05, 3),
  d10: d10(),
  d12: platonic([...points([[1, 1, 1]]), ...points([[0, 1 / PHI, PHI]])], points([[1, 0, PHI]]), 1, 5),
  d20: platonic(points([[0, 1, PHI]]), [...points([[1, 1, 1]]), ...points([[1 / PHI, 0, PHI]])], 1.08, 3),
};

/* ---------------------------------------------------------------- 画 */

const CAM = (() => {
  const t = (30 * Math.PI) / 180; // 俯视 30°
  return { c: Math.cos(t), s: Math.sin(t), dir: [0, Math.sin(t), Math.cos(t)] };
})();
const LIGHT = norm([-0.45, 0.35, 1]);

const COLORS = {
  red: ['#9b2226', '#f6e8d2'], ivory: ['#efe3c6', '#2a1e13'], blue: ['#2f4b7a', '#f6e8d2'], green: ['#2f6b4b', '#f6e8d2'],
  purple: ['#5a3d6e', '#f6e8d2'], orange: ['#b5651d', '#f6e8d2'], gold: ['#c9a227', '#2a1e13'],
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const shade = (base, k) => `rgb(${base.map((c) => Math.min(255, Math.round(c * k))).join(',')})`;
const FONT_SIZE = { d4: 0.34, d8: 0.5, d10: 0.5, d12: 0.62, d20: 0.44 };
const PIPS = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function drawDie(ctx, dpr, d) {
  const S = SHAPES[d.shape];
  const s = d.s;
  const M = qMat(d.q);
  const world = (v) => mApply(M, v);
  const pt = (v) => {
    const w = world(v);
    return [d.px + w[0] * s, d.py + (w[1] * CAM.c - w[2] * CAM.s) * s - d.z * CAM.s];
  };
  const dir = (v) => [v[0], v[1] * CAM.c - v[2] * CAM.s];
  const [fillHex, inkHex] = COLORS[d.color];
  const base = rgb(fillHex);

  // 影子
  const ground = d.py + (d.z + 0.7 * s) * CAM.s;
  const lift = Math.max(0, 1 - d.z / 260);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.beginPath();
  ctx.ellipse(d.px + d.z * 0.15, ground, s * (0.95 - 0.25 * (1 - lift)), s * 0.42 * (0.95 - 0.25 * (1 - lift)), 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${0.32 * lift})`;
  ctx.fill();
  ctx.restore();

  const faces = S.faces
    .map((f) => ({ f, nw: world(f.n) }))
    .filter((x) => dot(x.nw, CAM.dir) > 0)
    .sort((a, b) => dot(a.nw, CAM.dir) - dot(b.nw, CAM.dir));

  for (const { f, nw } of faces) {
    const pts = f.idx.map((i) => pt(S.verts[i]));
    const light = Math.max(0, dot(nw, LIGHT));
    const k = 0.58 + 0.42 * light + (light > 0.93 ? 0.06 : 0);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (d.glow) {
      ctx.shadowColor = d.glow;
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = shade(base, k);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(20,10,4,.42)';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // 面上的数字 / 点：把画布坐标系贴到这个面上（正交投影下面是平的，仿射变换刚好准确）
    const face = (at, upLocal, draw) => {
      const O = pt(at);
      const upW = world(upLocal);
      const rightW = cross(nw, upW); // 世界系 y 轴朝向观众，所以「右」是 n × up
      const [ax, ay] = dir(rightW), [ux, uy] = dir(upW);
      ctx.save();
      ctx.setTransform(dpr * ax, dpr * ay, -dpr * ux, -dpr * uy, dpr * O[0], dpr * O[1]);
      ctx.fillStyle = inkHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      draw();
      ctx.restore();
    };
    if (S.corners) {
      // d4：三个角各写一个数（这个角的顶点的点数），头朝着角
      for (const i of f.idx) {
        const corner = S.verts[i];
        const at = add(f.c, mul(sub(corner, f.c), 0.6));
        face(at, norm(sub(corner, f.c)), () => {
          ctx.font = `700 ${FONT_SIZE.d4 * s}px Cinzel, serif`;
          ctx.fillText(String(i + 1), 0, 0);
        });
      }
    } else if (d.shape === 'd6') {
      face(f.c, f.up, () => {
        ctx.fillStyle = inkHex;
        for (const [px, py] of PIPS[f.value]) {
          ctx.beginPath();
          ctx.arc(px * 0.3 * s, py * 0.3 * s, 0.085 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    } else {
      const label = d.tens ? (f.value === 0 ? '00' : `${f.value}0`) : String(f.value);
      face(f.c, f.up, () => {
        ctx.font = `700 ${FONT_SIZE[d.shape] * s * (label.length > 1 ? 0.8 : 1)}px Cinzel, serif`;
        ctx.fillText(label, 0, 0.02 * s);
      });
    }
  }
}

/* ---------------------------------------------------------------- 规则 */

const LOOK = { 4: ['d4', 'blue'], 6: ['d6', 'ivory'], 8: ['d8', 'green'], 10: ['d10', 'purple'], 12: ['d12', 'orange'], 20: ['d20', 'red'] };
const NOTES = {
  crit: ['今天宜开团，骰子站在你这边', '这份运气记得留到正式团里'],
  extreme: ['手感烫得吓人', '这把 KP 也拦不住'],
  hard: ['稳稳地过了', '难不倒你'],
  ok: ['过了，不多不少', '有惊无险'],
  bad: ['没过……KP 在笑', '这把不太行'],
  close: ['差一点点', '就差那么一口气'],
  fumble: ['今天还是别碰骰子了', '先来个理智检定吧'],
};

function d100(colors) {
  const tens = roll(10) - 1, units = roll(10) - 1;
  const total = tens * 10 + units || 100;
  return {
    total,
    dice: [
      { shape: 'd10', color: colors[0], value: tens, tens: true },
      { shape: 'd10', color: colors[1], value: units },
    ],
  };
}

// 每种规则：投哪些骰子、怎么判定。返回 { dice: [{ shape, color, value, tens, hit, bad }], num, verdict, cls, note, react }
const MODES = {
  coc() {
    const { total, dice } = d100(['ivory', 'red']);
    let key, verdict;
    if (total === 1) [key, verdict] = ['crit', '大成功'];
    else if (total === 100) [key, verdict] = ['fumble', '大失败'];
    else if (total <= 10) [key, verdict] = ['extreme', '极难成功'];
    else if (total <= 25) [key, verdict] = ['hard', '困难成功'];
    else if (total <= 50) [key, verdict] = ['ok', '成功'];
    else [key, verdict] = ['bad', '失败'];
    const cls = { crit: 'v-crit', extreme: 'v-good', hard: 'v-good', ok: 'v-ok', bad: 'v-bad', fumble: 'v-fumble' }[key];
    dice.forEach((d) => Object.assign(d, { hit: key === 'crit', bad: key === 'fumble' }));
    return {
      dice,
      num: String(total).padStart(2, '0'),
      verdict,
      cls,
      note: `对 50 · ${pick(NOTES[key === 'bad' && total <= 60 ? 'close' : key])}`,
      react: key === 'crit' ? 'crit' : key === 'fumble' ? 'fumble' : null,
    };
  },
  ta() {
    const values = Array.from({ length: 6 }, () => roll(4));
    const threes = values.filter((v) => v === 3).length;
    const chaos = threes === 3 ? 0 : 6 - threes;
    let verdict, cls, note;
    if (threes === 3) [verdict, cls, note] = ['Triscendence', 'v-crit', '正好三个 3：自动成功，不产生混沌'];
    else if (threes === 0) [verdict, cls, note] = ['失败', 'v-bad', `一个 3 都没有，产生 ${chaos} 点混沌`];
    else [verdict, cls, note] = [`成功 ×${threes}`, 'v-good', `产生 ${chaos} 点混沌`];
    return {
      dice: values.map((v) => ({ shape: 'd4', color: v === 3 ? 'gold' : 'ivory', value: v, hit: v === 3 })),
      num: `${threes} 个 3`,
      verdict,
      cls,
      note,
      react: threes === 3 ? 'crit' : null,
    };
  },
  dnd(die) {
    if (die === 100) {
      const { total, dice } = d100(['purple', 'ivory']);
      return { dice, num: String(total), verdict: '', cls: 'v-ok', note: 'd100' };
    }
    const v = roll(die);
    const [shape, color] = LOOK[die];
    const nat20 = die === 20 && v === 20, nat1 = die === 20 && v === 1;
    return {
      dice: [{ shape, color, value: v, hit: nat20, bad: nat1 }],
      num: String(v),
      verdict: nat20 ? '天然 20！' : nat1 ? '天然 1……' : '',
      cls: nat20 ? 'v-crit' : nat1 ? 'v-fumble' : 'v-ok',
      note: `d${die}`,
      react: nat20 ? 'crit' : nat1 ? 'fumble' : null,
    };
  },
};

// 还没投的时候托盘里摆的骰子
function idle(mode, die) {
  if (mode === 'coc') return [{ shape: 'd10', color: 'ivory', tens: true }, { shape: 'd10', color: 'red' }];
  if (mode === 'ta') return Array.from({ length: 6 }, () => ({ shape: 'd4', color: 'ivory' }));
  if (die === 100) return [{ shape: 'd10', color: 'purple', tens: true }, { shape: 'd10', color: 'ivory' }];
  const [shape, color] = LOOK[die];
  return [{ shape, color }];
}

/* ---------------------------------------------------------------- 托盘 */

const G = 1400;
const SETTLE = 0.42;
const smooth = (t) => t * t * (3 - 2 * t);

export function init(box, { mascot, store, reduce }) {
  const tray = $('.dice-tray', box);
  const cv = $('.dice-cv', box);
  const ctx = cv.getContext('2d');
  const btn = $('.dice-roll', box);
  const out = $('.dice-result', box);
  const modeBtns = $$('.seg-btn', box);
  const pickRow = $('.dice-pick', box);
  const dieBtns = $$('[data-die]', box);
  const rules = $$('.dice-rule[data-for]', box);
  let mode = store.get('utopia.dice.mode', 'coc');
  let die = store.get('utopia.dice.die', 20);
  if (!MODES[mode]) mode = 'coc';
  if (!dieBtns.some((b) => Number(b.dataset.die) === die)) die = 20;
  let W = 0, H = 0, dpr = 1, dice = [], raf = 0, last = 0, busy = false;

  function fit() {
    W = tray.clientWidth;
    H = tray.clientHeight;
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    place(dice);
    render();
  }
  const baseSize = () => (W < 480 ? 24 : W < 760 ? 32 : 40);

  // 给每颗骰子在托盘里分一个落点
  function place(list) {
    const n = list.length;
    if (!n) return;
    const s0 = baseSize();
    const gapX = s0 * 2.6;
    const cols = Math.max(1, Math.min(n, Math.floor((W - s0 * 1.5) / gapX)));
    const rows = Math.ceil(n / cols);
    const gapY = Math.min(s0 * 2.2, (H - s0 * 2.2) / Math.max(1, rows));
    list.forEach((d, i) => {
      const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols), c = i % cols;
      d.s = s0 * SHAPES[d.shape].scale;
      d.tx = W / 2 + (c - (inRow - 1) / 2) * gapX;
      d.ty = H * 0.58 + (r - (rows - 1) / 2) * gapY;
      if (d.phase === 'rest') {
        d.px = d.tx;
        d.py = d.ty;
      }
    });
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const d of [...dice].sort((a, b) => a.py - b.py)) drawDie(ctx, dpr, d);
  }

  function restingQ(d, value) {
    const q = d.q;
    const w = mApply(qMat(q), SHAPES[d.shape].upDir(value));
    const zAxis = [0, 0, 1];
    let axis = cross(w, zAxis);
    if (len(axis) < 1e-6) axis = [1, 0, 0];
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(w, zAxis))));
    return qNorm(qMul(qAxis(axis, angle), q));
  }

  function showIdle() {
    dice = idle(mode, die).map((d) => ({ ...d, phase: 'rest', z: 0, q: qRandom(), px: 0, py: 0 }));
    place(dice);
    // 随便停在某一面上
    for (const d of dice) {
      const faces = SHAPES[d.shape].faces.map((f) => f.value);
      d.q = restingQ(d, SHAPES[d.shape].corners ? roll(4) : pick(faces));
    }
    render();
    out.textContent = '点「投」看看今天的手气';
  }

  function setMode(next) {
    mode = next;
    store.set('utopia.dice.mode', mode);
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    pickRow.hidden = mode !== 'dnd';
    rules.forEach((p) => (p.hidden = p.dataset.for !== mode));
    showIdle();
  }
  function setDie(next) {
    die = next;
    store.set('utopia.dice.die', die);
    dieBtns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.die) === die)));
    showIdle();
  }

  function showResult(r) {
    out.innerHTML = '';
    const addSpan = (cls, text) => {
      if (!text) return;
      const s = document.createElement('span');
      s.className = cls;
      s.textContent = text;
      out.append(s);
    };
    addSpan('res-num', r.num);
    addSpan(`res-verdict ${r.cls}`, r.verdict);
    addSpan('res-note', r.note);
    // 每颗骰子的点数也写在 data 属性上（画在 canvas 里读不到，测试和读屏都靠这个）
    out.dataset.dice = r.dice.map((d) => (d.tens ? d.value * 10 : d.value)).join(',');
    if (r.react && mascot) mascot.speak(r.react);
  }

  // 一帧物理：飞出来 → 落地弹几下 → 最后 0.4 秒滑到落点、转到结果面朝上
  function step(d, dt) {
    if (d.phase === 'rest') return;
    if (d.delay > 0) {
      d.delay -= dt;
      return;
    }
    d.t += dt;
    if (d.phase === 'fly') {
      d.vz -= G * dt;
      d.z += d.vz * dt;
      d.px += d.vx * dt;
      d.py += d.vy * dt;
      if (d.z < 0) {
        d.z = 0;
        d.vz = -d.vz * 0.42;
        if (d.vz < 60) d.vz = 0;
        d.vx *= 0.72;
        d.vy *= 0.72;
        d.w = add(mul(d.w, 0.6), [rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)]);
      }
      if (d.z === 0 && d.vz === 0) {
        const k = Math.max(0, 1 - 3.2 * dt);
        d.vx *= k;
        d.vy *= k;
        d.w = mul(d.w, Math.max(0, 1 - 2.6 * dt));
      }
      const m = d.s * 1.1;
      if (d.px > W - m) [d.px, d.vx] = [W - m, -Math.abs(d.vx) * 0.5];
      if (d.py < m) [d.py, d.vy] = [m, Math.abs(d.vy) * 0.5];
      if (d.py > H - m * 0.8) [d.py, d.vy] = [H - m * 0.8, -Math.abs(d.vy) * 0.5];
      const ang = len(d.w) * dt;
      if (ang > 0) d.q = qNorm(qMul(qAxis(d.w, ang), d.q));
      if (d.t >= d.flyTime) {
        d.phase = 'settle';
        d.t = 0;
        d.from = { px: d.px, py: d.py, z: d.z, q: d.q };
        d.to = restingQ(d, d.value);
      }
    } else if (d.phase === 'settle') {
      const k = smooth(Math.min(1, d.t / SETTLE));
      d.px = d.from.px + (d.tx - d.from.px) * k;
      d.py = d.from.py + (d.ty - d.from.py) * k;
      d.z = d.from.z * (1 - k);
      d.q = qSlerp(d.from.q, d.to, k);
      if (d.t >= SETTLE) {
        d.phase = 'rest';
        d.px = d.tx;
        d.py = d.ty;
        d.z = 0;
        d.q = d.to;
        d.glow = d.hit ? '#ffd27a' : d.bad ? '#7cf5b8' : null;
      }
    }
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    for (const d of dice) step(d, dt);
    render();
    if (dice.some((d) => d.phase !== 'rest')) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  function go() {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    const r = MODES[mode](die);
    dice = r.dice.map((d, i) => ({
      ...d, phase: 'fly', t: 0, delay: i * 0.09, z: rnd(40, 80), q: qRandom(), glow: null,
      w: norm([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]).map((c) => c * rnd(10, 16)),
    }));
    place(dice);
    for (const d of dice) {
      d.px = -d.s * 1.2;
      d.py = Math.min(H - d.s, Math.max(d.s * 1.2, d.ty + rnd(-18, 18)));
      d.vx = (d.tx - d.px) * rnd(1.9, 2.5);
      d.vy = rnd(-40, 40);
      d.vz = rnd(60, 160);
      d.flyTime = rnd(0.95, 1.2);
    }
    out.textContent = '骰子在塔里滚……';
    const finish = () => {
      for (const d of dice) {
        d.phase = 'rest';
        d.z = 0;
        d.px = d.tx;
        d.py = d.ty;
        d.q = restingQ(d, d.value);
        d.glow = d.hit ? '#ffd27a' : d.bad ? '#7cf5b8' : null;
      }
      render();
      showResult(r);
      busy = false;
      btn.disabled = false;
    };
    if (reduce) return finish();
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
    const total = Math.max(...dice.map((d) => d.delay + d.flyTime)) + SETTLE + 0.05;
    setTimeout(finish, total * 1000);
  }

  modeBtns.forEach((b) => b.addEventListener('click', () => !busy && setMode(b.dataset.mode)));
  dieBtns.forEach((b) => b.addEventListener('click', () => !busy && setDie(Number(b.dataset.die))));
  btn.addEventListener('click', go);
  addEventListener('resize', fit, { passive: true });
  fit();
  setDie(die);
  setMode(mode);
  btn.disabled = false;
  // 数字用的字体到了再重画一遍
  document.fonts?.load('700 20px Cinzel').then(() => render()).catch(() => {});
}
