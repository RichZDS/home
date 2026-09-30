/* 乌托邦 — 全站交互：看板娘以撒、「学习」页的搜索和标签、文章目录。
   跑团页的骰塔在 dice.js、塔罗在 tarot.js，只有那一页才加载。 */

const doc = document;
const root = doc.documentElement;
const me = doc.getElementById('main-js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = doc) => el.querySelector(s);
const $$ = (s, el = doc) => Array.from(el.querySelectorAll(s));

const store = {
  get(k, fallback = null) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

/* ---------------------------------------------------------------- 精灵 */

const atlas = JSON.parse($('#px-atlas')?.textContent || '{}');
let sheet;
function loadSheet() {
  sheet ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = me.dataset.sheet;
  });
  return sheet;
}

function drawSprite(ctx, img, name, x, y, { alpha = 1 } = {}) {
  const a = atlas[name];
  if (!a) return;
  const [sx, sy, w, h] = a;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(img, sx, sy, w, h, Math.round(x), Math.round(y), w, h);
  if (alpha !== 1) ctx.globalAlpha = 1;
}

// 以撒：x, y 是 18×23 精灵的左上角
function drawIsaac(ctx, img, x, y, s = {}) {
  drawSprite(ctx, img, 'isaac.body', x, y + 16);
  const hy = y + (s.bob || 0);
  drawSprite(ctx, img, 'isaac.head', x, hy);
  const eye = s.eye || 'isaac.eye';
  const lx = s.lookX || 0, ly = s.lookY || 0;
  drawSprite(ctx, img, eye, x + 3 + lx, hy + 5 + ly);
  drawSprite(ctx, img, eye, x + 11 + lx, hy + 5 + ly);
  const mouth = s.mouth || 'isaac.mouth';
  drawSprite(ctx, img, mouth, x + 9 - (atlas[mouth][2] >> 1), hy + 12);
}

/* ---------------------------------------------------------------- 看板娘以撒 */

const LINES = {
  poke: ['别戳了……', '呜……', '你戳我干嘛', '我要告诉妈妈……算了', '眼泪不要钱的吗', '再戳就哭给你看', '……'],
  flood: ['哭成河了，你满意了吧', '地下室要被淹了'],
  done: ['看完啦？去「学习」再挑一篇', '读完了……我可以下班了吗'],
  lost: ['这里什么都没有……跟我的口袋一样'],
  crit: ['大成功！今天宜开团', '这手气，留到正式团里用吧'],
  fumble: ['大失败……今天别碰骰子了', '先过个理智检定吧'],
};

const mascot = (() => {
  const box = $('.mascot');
  if (!box) return null;
  const cv = $('.mascot-cv', box);
  const ctx = cv.getContext('2d');
  const say = $('.mascot-say', box);
  const W = cv.width;
  const IX = 50, IY = 36, GROUND = 60;
  const st = { blink: 2, cry: 0, bob: 0, lookX: 0, lookY: 0, pokes: [], tears: [], drops: [], shown: false };
  let img = null, raf = 0, last = 0, sayTimer = 0;

  function speak(pool) {
    const list = LINES[pool];
    say.textContent = list[Math.floor(Math.random() * list.length)];
    say.hidden = false;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => (say.hidden = true), 2600);
  }

  function poke() {
    const now = performance.now();
    st.pokes = st.pokes.filter((t) => now - t < 4000).concat(now);
    st.cry = 1.3;
    const burst = st.pokes.length >= 5 ? 14 : 5;
    for (let i = 0; i < burst; i++) spawnTear(i * 0.07);
    speak(st.pokes.length >= 5 ? 'flood' : 'poke');
    if (st.pokes.length >= 5) st.pokes = [];
    wake();
  }

  function spawnTear(delay = 0) {
    const side = Math.random() < 0.5 ? -1 : 1;
    st.tears.push({
      x: IX + (side < 0 ? 4 : 13), y: IY + 8, vx: side * (14 + Math.random() * 30), vy: -(40 + Math.random() * 35), delay,
    });
  }

  function update(dt) {
    st.blink -= dt;
    if (st.blink < -0.12) st.blink = 1.5 + Math.random() * 3.5;
    st.bob = (st.bob + dt) % 1.2;
    st.cry = Math.max(0, st.cry - dt);
    for (const t of st.tears) {
      if (t.delay > 0) {
        t.delay -= dt;
        continue;
      }
      t.vy += 170 * dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      if (t.y > GROUND) {
        t.dead = true;
        for (let i = 0; i < 3; i++) st.drops.push({ x: t.x, y: GROUND, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, life: 0.35 });
      }
    }
    st.tears = st.tears.filter((t) => !t.dead && t.x > -8 && t.x < W + 8);
    for (const d of st.drops) {
      d.vy += 150 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
    }
    st.drops = st.drops.filter((d) => d.life > 0);
  }

  function render() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawSprite(ctx, img, 'shadow', IX + 2, IY + 20, { alpha: 0.35 });
    drawIsaac(ctx, img, IX, IY, {
      eye: st.cry > 0 ? 'isaac.eye.shut' : st.blink < 0 ? 'isaac.eye.blink' : 'isaac.eye',
      mouth: st.cry > 0 ? 'isaac.mouth.open' : 'isaac.mouth',
      bob: st.bob > 0.6 ? 1 : 0,
      lookX: st.cry > 0 ? 0 : st.lookX,
      lookY: st.cry > 0 ? 0 : st.lookY,
    });
    for (const t of st.tears) if (t.delay <= 0) drawSprite(ctx, img, 'tear', t.x - 3, t.y - 3);
    ctx.fillStyle = '#a8defa';
    for (const d of st.drops) ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    update(dt);
    render();
    const busy = st.cry > 0 || st.tears.length || st.drops.length;
    // 空闲时降到每秒 8 帧，省电
    raf = busy ? requestAnimationFrame(frame) : setTimeout(() => (raf = requestAnimationFrame(frame)), 120);
  }

  function wake() {
    if (!img || !st.shown || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function sleep() {
    cancelAnimationFrame(raf);
    clearTimeout(raf);
    raf = 0;
  }

  // 页面切到后台时停下来
  function sync() {
    const show = !doc.hidden;
    if (show === st.shown) return;
    st.shown = show;
    box.hidden = false;
    box.classList.toggle('is-away', !show);
    if (show) wake();
    else sleep();
  }

  addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    const cx = r.left + ((IX + 9) / W) * r.width, cy = r.top + ((IY + 8) / cv.height) * r.height;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    st.lookX = Math.abs(dx) < 40 ? 0 : Math.sign(dx);
    st.lookY = dy < -60 ? -1 : dy > 60 ? 1 : 0;
  }, { passive: true });
  $('.mascot-hit', box).addEventListener('click', poke);
  doc.addEventListener('visibilitychange', sync);

  loadSheet().then((i) => {
    img = i;
    sync();
    if (root.dataset.page === 'notfound') setTimeout(() => speak('lost'), 900);
  });

  return { speak, poke };
})();

/* ---------------------------------------------------------------- 学习：搜索和标签 */

function postFilter() {
  const input = $('[data-filter-input]');
  if (!input) return;
  const books = $$('.article');
  const chips = $$('.tag-row .tag[data-tag]');
  const row = $('.tag-row');
  const more = $('[data-more]', row);
  more?.addEventListener('click', () => {
    row.classList.add('is-open');
    more.remove();
  });
  const empty = $('.empty');
  let tag = '';
  let fullText = null;

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const li of books) {
      const tags = li.dataset.tags.split('|');
      const url = li.querySelector('a').getAttribute('href');
      const hit = !q || li.dataset.text.includes(q) || tags.some((t) => t.includes(q)) || (fullText && fullText.get(url)?.includes(q));
      const ok = (!tag || tags.includes(tag)) && hit;
      li.hidden = !ok;
      if (ok) shown++;
    }
    empty.hidden = shown > 0;
  };
  const select = (value) => {
    tag = value;
    const chip = chips.find((c) => c.dataset.tag === value);
    if (chip?.classList.contains('tag-extra') && more?.isConnected) more.click();
    chips.forEach((c) => c.classList.toggle('is-on', c.dataset.tag === value));
    apply();
  };
  chips.forEach((c) => c.addEventListener('click', () => select(c.dataset.tag)));
  input.addEventListener('input', apply);
  // 第一次点进搜索框时再去拿全文索引
  input.addEventListener('focus', () => {
    if (fullText) return;
    fullText = new Map();
    fetch('/search.json')
      .then((r) => r.json())
      .then((d) => {
        for (const p of d.posts) fullText.set(p.url, `${p.text || ''}`.toLowerCase());
        apply();
      })
      .catch(() => {});
  }, { once: true });

  const pre = new URLSearchParams(location.search).get('tag');
  if (pre && chips.some((c) => c.dataset.tag === pre.toLowerCase())) select(pre.toLowerCase());
}

/* ---------------------------------------------------------------- 文章：进度、目录、复制代码 */

function postPage() {
  const prose = $('.prose');
  if (!prose) return;
  const bar = $('.read-progress i');
  const links = $$('.toc a');
  const heads = links.map((a) => doc.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  let said = false, queued = false;

  const update = () => {
    queued = false;
    const r = prose.getBoundingClientRect();
    const total = r.height - innerHeight * 0.6;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (p > 0.985 && !said && mascot) {
      said = true;
      mascot.speak('done');
    }
    if (heads.length) {
      let cur = heads[0];
      for (const h of heads) if (h.getBoundingClientRect().top < 120) cur = h;
      links.forEach((a) => a.classList.toggle('is-active', a.hash.slice(1) === cur.id));
    }
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();

  $$('.code-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.closest('.code').querySelector('code').innerText;
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        const ta = Object.assign(doc.createElement('textarea'), { value: code });
        doc.body.append(ta);
        ta.select();
        doc.execCommand('copy');
        ta.remove();
      }
      btn.textContent = '已复制';
      btn.classList.add('is-done');
      setTimeout(() => {
        btn.textContent = 'COPY';
        btn.classList.remove('is-done');
      }, 1400);
    });
  });
}

/* ---------------------------------------------------------------- 游戏房：街机屏幕上的吃豆人、时不时的 ERROR 报警 */

function gamesRoom() {
  if (root.dataset.page !== 'games') return;
  const rand = (a, b) => a + Math.random() * (b - a);

  // 屏幕：一个黄色的吃豆人从左到右一张一合地吃豆子，吃完一排从头再来
  const cv = $('.arcade-screen');
  if (cv) {
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, raf = 0, last = 0, x = 0, dots = [];
    const fit = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const reset = () => {
      x = -H * 0.2;
      dots = Array.from({ length: 7 }, (_, i) => ({ x: W * (0.12 + i * 0.125), eaten: false }));
    };
    const draw = (t) => {
      const r = H * 0.15, y = H * 0.56;
      ctx.clearRect(0, 0, W, H);
      // 迷宫的两道墙
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(1.5, H * 0.02);
      for (const yy of [H * 0.16, H * 0.24, H * 0.88, H * 0.96]) {
        ctx.beginPath();
        ctx.moveTo(H * 0.06, yy);
        ctx.lineTo(W - H * 0.06, yy);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd9e8';
      for (const d of dots) {
        if (d.eaten) continue;
        ctx.fillRect(d.x - H * 0.02, y - H * 0.02, H * 0.04, H * 0.04);
      }
      // 嘴：每秒开合 4 次
      const mouth = 0.12 + 0.62 * Math.abs(Math.sin(t * Math.PI * 4));
      ctx.fillStyle = '#ffe23c';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, mouth, Math.PI * 2 - mouth);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a0612';
      ctx.beginPath();
      ctx.arc(x + r * 0.15, y - r * 0.55, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      // 扫描线
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      for (let yy = 0; yy < H; yy += 3) ctx.fillRect(0, yy, W, 1);
    };
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      x += W * 0.22 * dt;
      for (const d of dots) if (!d.eaten && x + H * 0.05 >= d.x) d.eaten = true;
      if (x > W + H * 0.2) reset();
      draw(now / 1000);
      raf = doc.hidden ? 0 : requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf || doc.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    fit();
    reset();
    if (reduce) {
      x = W * 0.42;
      dots.slice(0, 3).forEach((d) => (d.eaten = true));
      draw(0.06);
    } else {
      start();
      doc.addEventListener('visibilitychange', start);
    }
    addEventListener('resize', () => {
      fit();
      reset();
      if (reduce) draw(0.06);
    }, { passive: true });
  }

  // 方块：16×16 的贴图现画（草、石头、钻石矿），CSS 3D 拼成立方体；点四下挖掉，几秒后长回来
  const blocks = $$('.mc-block');
  if (blocks.length) {
    const texture = (paint) => {
      const c = doc.createElement('canvas');
      c.width = c.height = 16;
      const g = c.getContext('2d');
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const col = paint(x, y);
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
      return `url(${c.toDataURL()})`;
    };
    const shade = (r, g, b, v) => `rgb(${r + v},${g + v},${b + v})`;
    const n = (k) => Math.round(rand(-k, k));
    const grassTop = () => shade(88, 158, 58, n(14));
    const dirt = () => shade(134, 96, 62, n(12));
    const stone = () => shade(124, 124, 124, n(14));
    const TEX = {
      grass: { top: texture(grassTop), side: texture((x, y) => (y < 3 || (y < 5 && Math.random() < 0.45) ? grassTop() : dirt())) },
      stone: { top: texture(stone), side: texture(stone) },
      diamond: (() => {
        const gems = new Set();
        for (let k = 0; k < 5; k++) {
          const cx = 1 + Math.floor(Math.random() * 13), cy = 1 + Math.floor(Math.random() * 13);
          [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]].forEach(([dx, dy], i) => (i < 4 || Math.random() < 0.5) && gems.add(`${cx + dx},${cy + dy}`));
        }
        const ore = (x, y) => (gems.has(`${x},${y}`) ? (Math.random() < 0.25 ? '#dffcff' : shade(64, 220, 232, n(18))) : stone());
        return { top: texture(ore), side: texture(ore) };
      })(),
    };
    const CRACKS = [1, 2, 3].map((stage) => texture((x, y) => {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      const on = ((x * 7 + y * 13 + stage * 5) % 11 < stage + 1) && d < 5 + stage * 3.2 && Math.random() < 0.55;
      return on ? 'rgba(0,0,0,.72)' : null;
    }));
    const art = $('.hero-art');
    const size = () => blocks.forEach((b) => b.style.setProperty('--px', `${Math.round(art.clientWidth * 0.085)}px`));
    size();
    addEventListener('resize', size, { passive: true });
    for (const b of blocks) {
      const t = TEX[b.dataset.tex] || TEX.stone;
      b.innerHTML = '<b class="mc-face mc-top"></b><b class="mc-face mc-front"></b><b class="mc-face mc-right"></b>';
      const faces = $$('.mc-face', b);
      const paint = (stage) => faces.forEach((f) => (f.style.backgroundImage = `${stage ? CRACKS[stage - 1] + ', ' : ''}${f.classList.contains('mc-top') ? t.top : t.side}`));
      paint(0);
      let stage = 0, busy = false;
      b.addEventListener('click', () => {
        if (busy) return;
        stage++;
        if (stage < 4) {
          paint(stage);
          b.classList.remove('is-hit');
          void b.offsetWidth;
          b.classList.add('is-hit');
          return;
        }
        busy = true;
        b.classList.add('is-broken');
        if (!reduce) {
          const r = b.getBoundingClientRect(), host = art.getBoundingClientRect();
          for (let i = 0; i < 10; i++) {
            const bit = doc.createElement('i');
            bit.className = 'mc-bit';
            bit.style.left = `${r.left - host.left + r.width / 2}px`;
            bit.style.top = `${r.top - host.top + r.height / 2}px`;
            bit.style.setProperty('--dx', `${rand(-70, 70)}px`);
            bit.style.setProperty('--dy', `${rand(-90, -20)}px`);
            bit.style.backgroundImage = i % 3 ? t.side : t.top;
            art.append(bit);
            setTimeout(() => bit.remove(), 900);
          }
        }
        setTimeout(() => {
          stage = 0;
          paint(0);
          b.classList.remove('is-broken', 'is-hit');
          busy = false;
        }, 3500);
      });
    }
  }

  // 报警：时不时弹一条红色 ERROR，过 1–3 秒自己变成绿色 APPROVE，再淡出
  const ERRORS = ['SIGNAL LOST', 'CHECKSUM MISMATCH', 'ENTITY 0x1F NOT FOUND', 'MEMORY LEAK DETECTED', 'INPUT LAG > 200 MS', 'COIN JAMMED', 'BRIMSTONE OVERHEAT', 'GENERATOR UNSTABLE'];
  const OKS = ['RECALIBRATED', 'ALL SYSTEMS NOMINAL', 'SYNC RESTORED', 'ACCESS GRANTED', 'CONTINUE? 9… 8…'];
  const pickOne = (l) => l[Math.floor(Math.random() * l.length)];
  const box = doc.createElement('div');
  box.className = 'hud-alert';
  box.hidden = true;
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<b class="hud-alert-tag"></b><span class="hud-alert-msg"></span><span class="hud-alert-code"></span>';
  doc.body.append(box);
  const tag = $('.hud-alert-tag', box), msg = $('.hud-alert-msg', box), code = $('.hud-alert-code', box);
  const hex = () => '0x' + Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  let timer = 0;
  const later = (fn, ms) => (timer = setTimeout(fn, ms));
  function alarm() {
    if (doc.hidden) return later(alarm, 3000);
    box.hidden = false;
    box.classList.remove('is-out', 'is-ok');
    box.classList.add('is-error');
    root.dataset.alert = 'error';
    tag.textContent = 'ERROR';
    msg.textContent = pickOne(ERRORS);
    code.textContent = `ERR ${hex()} · RETRY`;
    later(() => {
      box.classList.remove('is-error');
      box.classList.add('is-ok');
      root.dataset.alert = 'ok';
      tag.textContent = 'APPROVE';
      msg.textContent = pickOne(OKS);
      code.textContent = `OK ${hex()} · RESUME`;
      later(() => {
        box.classList.add('is-out');
        root.dataset.alert = '';
        later(() => {
          box.hidden = true;
          later(alarm, rand(7000, 14000));
        }, 450);
      }, 1600);
    }, rand(1000, 3000));
  }
  later(alarm, rand(2500, 5000));
}

/* ---------------------------------------------------------------- 404：按 R 重来 */

if (root.dataset.page === 'notfound') {
  addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) location.href = '/';
  });
}

postFilter();
postPage();
gamesRoom();

const diceEl = $('.dice');
if (diceEl) {
  import(me.dataset.dice)
    .then((m) => m.init(diceEl, { mascot, store, reduce }))
    .catch((err) => console.warn('骰塔加载失败', err));
}
const tarotEl = $('.tarot');
if (tarotEl) {
  import(me.dataset.tarot)
    .then((m) => m.init(tarotEl, { mascot, store, reduce }))
    .catch((err) => console.warn('塔罗加载失败', err));
}
