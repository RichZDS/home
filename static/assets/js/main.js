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

/* ---------------------------------------------------------------- 404：按 R 重来 */

if (root.dataset.page === 'notfound') {
  addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) location.href = '/';
  });
}

postFilter();
postPage();

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
