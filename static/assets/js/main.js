/* 乌托邦 — 全站交互：精灵绘制、小地图、过门转场、看板娘以撒、图书馆筛选、文章目录。
   房间里的小游戏在 stage.js，只有带房间的页面才加载。 */

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
const session = {
  get(k) {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      sessionStorage.setItem(k, v);
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

function drawSprite(ctx, img, name, x, y, { flip = false, alpha = 1 } = {}) {
  const a = atlas[name];
  if (!a) return;
  const [sx, sy, w, h] = a;
  x = Math.round(x);
  y = Math.round(y);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (flip) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, sx, sy, w, h, x, y, w, h);
  }
  if (alpha !== 1) ctx.globalAlpha = 1;
}

// 以撒：x, y 是 18×23 精灵的左上角
function drawIsaac(ctx, img, x, y, s = {}) {
  drawSprite(ctx, img, s.body || 'isaac.body', x, y + 16);
  const hy = y + (s.bob || 0);
  if (s.dir === 'up') {
    drawSprite(ctx, img, 'isaac.head.back', x, hy);
  } else {
    drawSprite(ctx, img, 'isaac.head', x, hy);
    const off = s.dir === 'left' ? -2 : s.dir === 'right' ? 2 : 0;
    const eye = s.eye || 'isaac.eye';
    const lx = s.lookX || 0, ly = s.lookY || 0;
    drawSprite(ctx, img, eye, x + 3 + off + lx, hy + 5 + ly);
    drawSprite(ctx, img, eye, x + 11 + off + lx, hy + 5 + ly);
    const mouth = s.mouth || 'isaac.mouth';
    drawSprite(ctx, img, mouth, x + 9 - (atlas[mouth][2] >> 1) + off, hy + 12);
  }
  if (s.horns) drawSprite(ctx, img, 'isaac.horns', x, hy - 2);
}

const px = { atlas, loadSheet, drawSprite, drawIsaac, store, session, reduce };

/* ---------------------------------------------------------------- 小地图、过门方向 */

const here = root.dataset.room;
const visited = new Set(store.get('utopia.visited', []));
if (here) {
  visited.add(here);
  store.set('utopia.visited', [...visited]);
}
$$('.mm-room').forEach((el) => {
  if (visited.has(el.dataset.room)) el.classList.add('is-visited');
});

function cellOf(room) {
  const el = $(`.mm-room[data-room="${room}"]`);
  if (!el) return null;
  return [Number(el.style.getPropertyValue('--c')), Number(el.style.getPropertyValue('--r'))];
}

// 从当前房间去 target，镜头往哪个方向滑
function dirTo(target) {
  const a = cellOf(here), b = cellOf(target);
  if (!a || !b || target === here) return null;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

doc.addEventListener('click', (e) => {
  const a = e.target.closest('a.mm-room, a.guide-item');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const dir = dirTo(a.dataset.room);
  if (dir) session.set('utopia.door', dir);
});

/* ---------------------------------------------------------------- 看板娘以撒 */

const LINES = {
  poke: ['别戳了……', '呜……', '你戳我干嘛', '我要告诉妈妈……算了', '眼泪不要钱的吗', '再戳就哭给你看', '……'],
  flood: ['哭成河了，你满意了吧', '地下室要被淹了'],
  done: ['看完啦？去图书馆再挑一本', '读完了……我可以下班了吗'],
  lost: ['这里什么都没有……跟我的口袋一样'],
};

const mascot = (() => {
  const box = $('.mascot');
  if (!box) return null;
  const cv = $('.mascot-cv', box);
  const ctx = cv.getContext('2d');
  const say = $('.mascot-say', box);
  const W = cv.width, H = cv.height;
  const IX = 50, IY = 36, GROUND = 60;
  const st = { blink: 2, cry: 0, bob: 0, lookX: 0, lookY: 0, pokes: [], tears: [], drops: [], shown: false, stageVisible: false };
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
      if (t.delay > 0) { t.delay -= dt; continue; }
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
    ctx.clearRect(0, 0, W, H);
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

  function sync() {
    const show = !st.stageVisible && !doc.hidden;
    if (show === st.shown) return;
    st.shown = show;
    box.hidden = false;
    box.classList.toggle('is-away', !show);
    if (show) wake();
    else sleep();
  }

  addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    const cx = r.left + ((IX + 9) / W) * r.width, cy = r.top + ((IY + 8) / H) * r.height;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    st.lookX = Math.abs(dx) < 40 ? 0 : Math.sign(dx);
    st.lookY = dy < -60 ? -1 : dy > 60 ? 1 : 0;
  }, { passive: true });
  $('.mascot-hit', box).addEventListener('click', poke);
  doc.addEventListener('visibilitychange', sync);
  doc.addEventListener('utopia:stage', (e) => {
    st.stageVisible = e.detail.visible;
    sync();
  });

  loadSheet().then((i) => {
    img = i;
    st.stageVisible = !!$('.stage') && scrollY < innerHeight * 0.5;
    sync();
    if (root.dataset.page === 'notfound') setTimeout(() => speak('lost'), 900);
  });

  return { speak, poke };
})();

/* ---------------------------------------------------------------- 图书馆：搜索和标签 */

function libraryFilter() {
  const input = $('[data-filter-input]');
  if (!input) return;
  const books = $$('.book');
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
      const slug = li.querySelector('a').getAttribute('href');
      const hit = !q || li.dataset.text.includes(q) || tags.some((t) => t.includes(q)) || (fullText && fullText.get(slug)?.includes(q));
      const ok = (!tag || tags.includes(tag)) && hit;
      li.hidden = !ok;
      if (ok) shown++;
    }
    empty.hidden = shown > 0;
  };
  const select = (value) => {
    tag = value;
    const chip = chips.find((c) => c.dataset.tag === value);
    if (chip?.classList.contains('tag-extra') && more) more.click();
    chips.forEach((c) => c.classList.toggle('is-on', c.dataset.tag === value));
    apply();
  };
  chips.forEach((c) => c.addEventListener('click', () => select(c.dataset.tag)));
  input.addEventListener('input', apply);
  // 第一次输入时再去拿全文索引
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

/* ---------------------------------------------------------------- 404：按 R 重来 */

if (root.dataset.page === 'notfound') {
  addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) location.href = '/';
  });
}

libraryFilter();
postPage();

const stageEl = $('.stage');
if (stageEl) {
  import(me.dataset.stage)
    .then((m) => m.init(stageEl, px, mascot))
    .catch((err) => console.warn('房间加载失败', err));
}
