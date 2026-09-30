/* RICHZDS//NET — 页面动效与交互。没有依赖，终端模块按需懒加载。 */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const page = root.dataset.page;
  const termSrc = doc.currentScript && doc.currentScript.dataset.term;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = doc) => el.querySelector(s);
  const $$ = (s, el = doc) => Array.from(el.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');

  const storage = (kind) => ({
    get(k) {
      try { return window[kind].getItem(k); } catch { return null; }
    },
    set(k, v) {
      try { window[kind].setItem(k, v); } catch {}
    },
  });
  const local = storage('localStorage');
  const session = storage('sessionStorage');

  /* ---------------------------------------------------------- 开机动画 */
  const bootQueue = [];
  const afterBoot = (fn) => (root.classList.contains('booting') ? bootQueue.push(fn) : fn());

  function boot() {
    if (!root.classList.contains('booting')) return;
    const box = $('.boot');
    const log = $('.boot-log');
    const bar = $('.boot-bar');
    const lines = [
      ['ok', '初始化神经接口', 'done'],
      ['ok', '挂载模块 /posts /projects /about', 'done'],
      ['ok', '建立加密通道 → cloudflare edge', '12ms'],
      ['ok', '同步 GitHub 仓库索引', 'cached'],
      ['warn', '检测到咖啡因水平偏低', 'ignored'],
      ['ok', '欢迎回来，netrunner', ''],
    ];
    let i = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      session.set('booted', '1');
      box.classList.add('out');
      removeEventListener('keydown', finish);
      setTimeout(() => {
        root.classList.remove('booting');
        bootQueue.splice(0).forEach((fn) => fn());
      }, 430);
    };
    const step = () => {
      if (done) return;
      if (i >= lines.length) return void setTimeout(finish, 280);
      const [kind, text, tail] = lines[i++];
      const tag = kind === 'ok' ? '[ OK ]' : '[WARN]';
      log.insertAdjacentHTML(
        'beforeend',
        `<span class="${kind}">${tag}</span> ${text}${tail ? ` <span class="dim">… ${tail}</span>` : ''}\n`,
      );
      bar.style.setProperty('--p', `${(i / lines.length) * 100}%`);
      setTimeout(step, 120 + Math.random() * 90);
    };
    addEventListener('keydown', finish);
    box.addEventListener('pointerdown', finish);
    setTimeout(step, 160);
  }

  /* ---------------------------------------------------------- 数字雨 */
  const rain = (() => {
    const canvas = $('#rain');
    if (!canvas || reduce) return { start() {}, stop() {}, recolor() {} };
    const ctx = canvas.getContext('2d');
    const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF<>/{}=+*#模块赛博';
    const size = 16;
    let w = 0, h = 0, cols = 0, drops = [], palette = [], raf = 0, last = 0, running = false;

    const recolor = () => {
      const cs = getComputedStyle(root);
      const a = cs.getPropertyValue('--accent').trim() || '#00f0ff';
      const b = cs.getPropertyValue('--accent-2').trim() || '#ff2a6d';
      palette = [a, a, a, a, b, '#b967ff'];
    };
    const resize = () => {
      w = canvas.width = innerWidth;
      h = canvas.height = innerHeight;
      const n = Math.ceil(w / size);
      if (n !== cols) {
        let saved = null;
        try { saved = JSON.parse(session.get('rain') || 'null'); } catch {}
        drops = Array.from({ length: n }, (_, i) =>
          saved && saved.cols === n ? saved.drops[i] : Math.random() * (-h / size) * 1.5,
        );
        cols = n;
      }
      ctx.font = `${size - 2}px "Share Tech Mono", monospace`;
      ctx.textBaseline = 'top';
    };
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 55) return;
      last = t;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.09)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < cols; i++) {
        const y = Math.floor(drops[i]) * size;
        if (y >= 0) {
          ctx.fillStyle = Math.random() < 0.025 ? '#ffffff' : palette[(i * 7) % palette.length];
          ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, y);
        }
        if (y > h && Math.random() > 0.97) drops[i] = Math.random() * -24;
        else drops[i] += 0.6 + (i % 4) * 0.18;
      }
    };
    const start = () => {
      if (running || root.classList.contains('no-rain')) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    recolor();
    resize();
    addEventListener('resize', resize, { passive: true });
    doc.addEventListener('visibilitychange', () => (doc.hidden ? stop() : start()));
    addEventListener('pagehide', () => session.set('rain', JSON.stringify({ cols, drops: drops.map((d) => Math.round(d)) })));
    start();
    return { start, stop, recolor };
  })();

  /* ---------------------------------------------------------- 打字机 */
  function typer() {
    const el = $('[data-typer]');
    if (!el || reduce) return;
    let words;
    try { words = JSON.parse(el.dataset.typer); } catch { return; }
    if (!Array.isArray(words) || words.length < 2) return;
    let w = 0;
    let i = words[0].length;
    let deleting = true;
    const tick = () => {
      const word = words[w];
      if (deleting) {
        el.textContent = word.slice(0, --i);
        if (i > 0) return void setTimeout(tick, 28);
        deleting = false;
        w = (w + 1) % words.length;
        return void setTimeout(tick, 380);
      }
      el.textContent = words[w].slice(0, ++i);
      if (i < words[w].length) return void setTimeout(tick, 60 + Math.random() * 70);
      deleting = true;
      setTimeout(tick, 2400);
    };
    setTimeout(tick, 2600);
  }

  /* ---------------------------------------------------------- 标题解密 */
  const LATIN = 'ABCDEF0123456789#$%&*<>/\\|=+ｱｲｳｴｵｶｷｸ';
  const HAN = '模块赛博霓虹协议节点数据信号终端网络档案矩阵';
  function decrypt(el) {
    if (reduce || el.dataset.decrypted) return;
    el.dataset.decrypted = '1';
    const final = el.textContent;
    const chars = Array.from(final);
    const total = Math.min(26, 10 + chars.length * 2);
    let frame = 0;
    el.setAttribute('aria-label', final);
    const run = () => {
      frame++;
      const shown = Math.floor((frame / total) * chars.length);
      el.textContent = chars
        .map((c, k) => {
          if (k < shown || /\s/.test(c)) return c;
          const set = /[一-鿿]/.test(c) ? HAN : LATIN;
          return set[(Math.random() * set.length) | 0];
        })
        .join('');
      if (frame < total) setTimeout(run, 34);
      else {
        el.textContent = final;
        el.removeAttribute('aria-label');
      }
    };
    run();
  }

  /* ---------------------------------------------------------- 数字滚动 */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (reduce || !Number.isFinite(target) || target === 0) return;
    const t0 = performance.now();
    const dur = 1300;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------- 进场观察 */
  function observe() {
    const targets = $$('.reveal, [data-decrypt], [data-count]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target;
          io.unobserve(el);
          if (el.classList.contains('reveal')) el.classList.add('in');
          if (el.hasAttribute('data-decrypt')) decrypt(el);
          if (el.hasAttribute('data-count')) countUp(el);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );
    targets.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------- 卡片光斑 */
  doc.addEventListener(
    'pointermove',
    (e) => {
      const body = e.target.closest && e.target.closest('.card-body');
      if (!body) return;
      const r = body.getBoundingClientRect();
      body.style.setProperty('--mx', `${e.clientX - r.left}px`);
      body.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );

  /* ---------------------------------------------------------- 代码复制 */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = doc.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      doc.body.append(ta);
      ta.select();
      const ok = doc.execCommand('copy');
      ta.remove();
      return ok;
    }
  }
  doc.addEventListener('click', async (e) => {
    const btn = e.target.closest('.code-copy');
    if (!btn) return;
    const ok = await copyText(btn.closest('.code').querySelector('code').textContent);
    btn.textContent = ok ? 'COPIED' : 'FAILED';
    btn.classList.toggle('done', ok);
    setTimeout(() => {
      btn.textContent = 'COPY';
      btn.classList.remove('done');
    }, 1600);
  });

  /* ---------------------------------------------------------- 滚动：阅读进度 / 目录高亮 / 天际线视差 */
  function scrollFx() {
    const bar = $('.read-progress i');
    const toc = $$('.toc a');
    const heads = toc.map((a) => doc.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
    const far = $('.skyline-far');
    const near = $('.skyline-near');
    const parallax = far && near && !reduce;
    let px = 0;
    let queued = false;

    const update = () => {
      queued = false;
      const y = scrollY;
      if (bar) {
        const max = root.scrollHeight - innerHeight;
        bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
      }
      if (heads.length) {
        let current = 0;
        heads.forEach((hd, i) => {
          if (hd.getBoundingClientRect().top < 140) current = i;
        });
        toc.forEach((a, i) => a.classList.toggle('active', i === current));
      }
      if (parallax && y < innerHeight * 1.2) {
        far.style.transform = `translate3d(${px * -12}px, ${y * 0.18}px, 0)`;
        near.style.transform = `translate3d(${px * -26}px, ${y * 0.08}px, 0)`;
      }
    };
    const queue = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    if (parallax && matchMedia('(pointer: fine)').matches) {
      addEventListener(
        'pointermove',
        (e) => {
          px = e.clientX / innerWidth - 0.5;
          queue();
        },
        { passive: true },
      );
    }
    update();
  }

  /* ---------------------------------------------------------- 档案库筛选 */
  function postFilter() {
    const input = $('[data-filter-input]');
    if (!input) return;
    const chips = $$('.filter-bar .chip[data-tag]');
    const more = $('.filter-bar [data-more]');
    if (more) {
      more.addEventListener('click', () => {
        more.parentElement.classList.add('show-all');
        more.remove();
      });
    }
    const items = $$('.log-item');
    const groups = $$('.year-group');
    const empty = $('.archive .empty');
    let tag = '';
    let q = '';
    const apply = () => {
      let shown = 0;
      items.forEach((li) => {
        const tags = li.dataset.tags.split('|');
        const ok = (!tag || tags.includes(tag)) && (!q || li.dataset.text.includes(q) || tags.some((t) => t.includes(q)));
        li.hidden = !ok;
        if (ok) {
          shown++;
          li.classList.add('in');
        }
      });
      groups.forEach((g) => (g.hidden = !g.querySelector('.log-item:not([hidden])')));
      empty.hidden = shown > 0;
    };
    const select = (value) => {
      tag = value;
      chips.forEach((c) => c.classList.toggle('is-on', c.dataset.tag === value));
      apply();
    };
    input.addEventListener('input', () => {
      q = input.value.trim().toLowerCase();
      apply();
    });
    chips.forEach((c) => c.addEventListener('click', () => select(c.dataset.tag)));
    const fromUrl = new URLSearchParams(location.search).get('tag');
    const target = fromUrl && chips.find((c) => c.dataset.tag === fromUrl.toLowerCase());
    if (target) {
      if (more && target.classList.contains('chip-extra')) more.click();
      select(target.dataset.tag);
    }
  }

  /* ---------------------------------------------------------- 页脚 UPTIME */
  function uptime() {
    const el = $('[data-uptime]');
    if (!el) return;
    const since = Date.parse(el.dataset.uptime);
    if (!Number.isFinite(since)) return;
    const tick = () => {
      let s = Math.max(0, Math.floor((Date.now() - since) / 1000));
      const d = Math.floor(s / 86400);
      s %= 86400;
      el.textContent = `${String(d).padStart(3, '0')}d ${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------- 终端 & 彩蛋 */
  const api = {
    reduce,
    setRain(on) {
      root.classList.toggle('no-rain', !on);
      local.set('rain', on ? 'on' : 'off');
      on ? rain.start() : rain.stop();
    },
    setAccent(name) {
      if (name === 'cyan') delete root.dataset.accent;
      else root.dataset.accent = name;
      local.set('accent', name);
      rain.recolor();
    },
    glitch() {
      root.classList.remove('glitching');
      void root.offsetWidth;
      root.classList.add('glitching');
      setTimeout(() => root.classList.remove('glitching'), 760);
    },
    overdrive() {
      return root.classList.toggle('overdrive');
    },
  };

  let term = null;
  async function openTerminal() {
    if (!termSrc) return;
    try {
      term = term || (await import(termSrc));
      term.open(api);
    } catch (err) {
      console.error('terminal failed to load', err);
    }
  }
  doc.addEventListener('click', (e) => {
    if (e.target.closest('[data-term-open]')) openTerminal();
  });

  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let konami = 0;
  doc.addEventListener('keydown', (e) => {
    const typing = e.target.closest && e.target.closest('input, textarea, [contenteditable]');
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'k') {
      e.preventDefault();
      openTerminal();
      return;
    }
    if (typing) return;
    if (e.key === '`' || e.code === 'Backquote') {
      e.preventDefault();
      openTerminal();
      return;
    }
    konami = key === KONAMI[konami] ? konami + 1 : key === KONAMI[0] ? 1 : 0;
    if (konami === KONAMI.length) {
      konami = 0;
      api.overdrive();
      api.glitch();
    }
  });

  /* ---------------------------------------------------------- 启动 */
  boot();
  afterBoot(() => {
    observe();
    typer();
  });
  scrollFx();
  postFilter();
  uptime();
  if (page === 'home' && !reduce) {
    // 首页标题每隔一阵自己抖一下，鼠标悬停时立刻抖
    const title = $('.hero-title');
    if (title) title.addEventListener('pointerenter', api.glitch);
  }
})();
