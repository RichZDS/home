// 页面模板：全部是返回 HTML 字符串的函数，没有模板引擎。
// 普通的个人博客结构：顶部导航 + 每页一张像素横幅 + 下面正常滚动的内容。
import { esc } from './markdown.mjs';

export const fmtDate = (d) => new Date(new Date(d).getTime() + 8 * 3600e3).toISOString().slice(0, 10);
const pad = (n, w = 2) => String(n).padStart(w, '0');

const LANG_COLORS = {
  Go: '#5ac8e0', Java: '#e8903a', Vue: '#4fbf85', TypeScript: '#4d7fd6', JavaScript: '#e6c84a',
  Python: '#8d6fd6', CSS: '#d65a8a', HTML: '#e0663d', Dockerfile: '#7aa2c9', Shell: '#8fcf6a',
};
export const langColor = (name) => LANG_COLORS[name] || '#9e968a';

export function breakdown(languages = {}) {
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(languages)
    .map(([name, bytes]) => ({ name, bytes, pct: (bytes / total) * 100 }))
    .sort((a, b) => b.bytes - a.bytes);
}

// 导航栏目：[地址, 名字, 页面类型]
export const NAV = [
  ['/', '首页', 'home'],
  ['/study/', '学习', 'study'],
  ['/games/', '游戏', 'games'],
  ['/trpg/', '跑团', 'trpg'],
  ['/anime/', '动漫', 'anime'],
  ['/about/', '关于', 'about'],
];

// 首屏渲染前执行：标记 JS 可用；页面切换时浏览器可能会跳过淡入淡出，吞掉它的 promise，免得控制台报错
const HEAD_SCRIPT =
  "(function(h){h.classList.add('js');" +
  "function q(e){var v=e.viewTransition,n=function(){};if(v){v.ready.catch(n);v.finished.catch(n);v.updateCallbackDone&&v.updateCallbackDone.catch(n)}}" +
  "addEventListener('pagereveal',q);addEventListener('pageswap',q)" +
  '})(document.documentElement)';

// ---------------------------------------------------------------- 框架

function layout(ctx, page, body) {
  const { site, assets, px } = ctx;
  const url = site.url + page.path;
  const title = page.title ? `${page.title} · ${site.title}` : `${site.title} · ${site.author}的个人主页`;
  const desc = page.description || site.description;
  const ink = page.theme === 'ink';
  const section = page.section ?? page.kind;
  const brush = ink && ctx.brushFont ? `@font-face{font-family:"Ma Shan Zheng";src:url(${ctx.brushFont}) format("woff2");font-display:swap}` : '';
  return `<!doctype html>
<html lang="zh-CN" data-page="${page.kind}"${ink ? ' data-theme="ink"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(site.author)}">
<meta name="theme-color" content="${ink ? '#efe6d2' : '#140c0a'}">
<meta name="color-scheme" content="${ink ? 'light' : 'dark'}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/rss.xml">
<meta property="og:type" content="${page.kind === 'post' ? 'article' : 'website'}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(page.title || site.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}/apple-touch-icon.png">
<meta name="twitter:card" content="summary">
<link rel="preload" href="__PIXEL_FONT__" as="font" type="font/woff2" crossorigin>
<style>@font-face{font-family:"Fusion Pixel";src:url(__PIXEL_FONT__) format("woff2");font-display:swap}${brush}${px.css}</style>
<link rel="stylesheet" href="/assets/css/main.css?v=${assets.css}">
<script>${HEAD_SCRIPT}</script>
<script type="module" src="/assets/js/main.js?v=${assets.js}" id="main-js" data-sheet="${px.urls['assets/px/sheet.png']}" data-dice="/assets/js/dice.js?v=${assets.dice}"></script>
</head>
<body>
<a class="skip-link" href="#main">跳到正文</a>
${header(ctx, section)}
${page.kind === 'post' ? '<div class="read-progress" aria-hidden="true"><i></i></div>\n' : ''}<main id="main" class="main">
${body}
</main>
${footer(ctx, ink)}
<div class="mascot" hidden>
  <canvas class="mascot-cv" width="80" height="64" aria-hidden="true"></canvas>
  <button class="mascot-hit" type="button" aria-label="戳一下以撒"></button>
  <p class="mascot-say" role="status" hidden></p>
</div>
<script type="application/json" id="px-atlas">${JSON.stringify(px.atlas)}</script>
</body>
</html>
`;
}

function icon(name, s) {
  return `<i class="px px-${name.replace(/\./g, '-')}"${s ? ` style="--s:${s}px"` : ''} aria-hidden="true"></i>`;
}

function header(ctx, section) {
  const links = NAV.map(([href, name, kind]) => `<a href="${href}"${kind === section ? ' aria-current="page"' : ''}>${name}</a>`).join('');
  return `<header class="top">
  <div class="top-in">
    <a class="brand" href="/">${icon('isaac.face', 2)}<b>${esc(ctx.site.title)}</b></a>
    <nav class="nav" aria-label="栏目">${links}</nav>
  </div>
</header>`;
}

function footer(ctx, ink = false) {
  const { site } = ctx;
  return `<footer class="footer">
  <p class="footer-links">
    <a href="https://github.com/${site.github}" target="_blank" rel="noopener">GitHub</a>
    <a href="${site.bilibili.url}" target="_blank" rel="noopener">B 站 · ${esc(site.bilibili.name)}</a>
    <a href="/rss.xml">RSS</a>
  </p>
  <p class="footer-note">© ${new Date().getFullYear()} ${esc(site.author)} · ${esc(site.title)}。像素画是照着《以撒的结合》的画风用代码画的，没有用游戏素材 · 像素字体 <a href="https://github.com/TakWolf/fusion-pixel-font" target="_blank" rel="noopener">Fusion Pixel</a>（OFL）${ink ? ' · 毛笔字 <a href="https://github.com/googlefonts/mashanzheng" target="_blank" rel="noopener">马善政楷书</a>（OFL）' : ''}</p>
</footer>`;
}

// 页面顶上的像素横幅。有以撒的横幅在视野里时，右下角的看板娘先躲起来
function banner(ctx, id, alt, { isaac = false, extra = '' } = {}) {
  const b = ctx.px.banners[id];
  return `<div class="banner banner-${id}"${isaac ? ' data-isaac' : ''}>
  <img src="${b.url}" width="${b.w * 3}" height="${b.h * 3}" alt="${esc(alt)}" fetchpriority="high">${extra}
</div>`;
}

function pageHead(title, sub) {
  return `<header class="page-head">
  <h1>${esc(title)}</h1>
  ${sub ? `<p>${esc(sub)}</p>` : ''}
</header>`;
}

function card(id, iconName, title, sub, inner, cls = '', iconSize) {
  return `<section class="card${cls ? ` ${cls}` : ''}"${id ? ` id="${id}"` : ''} aria-labelledby="${id}-title">
  <header class="card-head">${iconName ? icon(iconName, iconSize) : ''}<h2 id="${id}-title">${esc(title)}</h2>${sub ? `<span class="card-sub">${esc(sub)}</span>` : ''}</header>
  ${inner}
</section>`;
}

function intro(ctx, { big = false, more = true } = {}) {
  const { site } = ctx;
  return `<div class="intro${big ? ' intro-big' : ''}">
  <img class="avatar" src="/assets/img/avatar.jpg" width="120" height="120" alt="头像：《日月同错》里的海山">
  <div class="intro-main">
    <p class="intro-name">${esc(site.intro.name)}</p>
    <p class="intro-lines">${site.intro.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</p>
    <p class="intro-bio">${esc(site.intro.bio)}</p>
    <p class="intro-links">
      <a class="btn" href="https://github.com/${site.github}" target="_blank" rel="noopener">GitHub</a>
      <a class="btn" href="${site.bilibili.url}" target="_blank" rel="noopener">B 站</a>
      ${more ? '<a class="btn btn-ghost" href="/about/">更多关于我 →</a>' : ''}
    </p>
  </div>
</div>`;
}

// ---------------------------------------------------------------- 首页

export function home(ctx) {
  const { site, posts } = ctx;
  const featured = site.featured.map((n) => ctx.gh.repos.find((r) => r.name === n)).filter(Boolean);
  const latest = posts.slice(0, 5);
  const corners = [
    ['/study/', 'icon.book', '学习', `${posts.length} 篇文章 · ${featured.length} 个项目`],
    ['/games/', 'icon.heart', '游戏房', site.games.map((g) => g.name).join(' · ')],
    ['/trpg/', 'icon.die', '跑团', '骰塔 · 塔罗'],
    ['/anime/', 'icon.moon', '动漫', `${site.anime.outcast.name} · ${site.anime.sunMoon.name}`],
  ];
  const body = `${banner(ctx, 'home', '像素地下室：书架、蜡烛、两座道具台上放着骰子和塔罗牌，以撒站在中间的地毯上', { isaac: true })}
<h1 class="sr-only">${esc(site.title)} · ${esc(site.author)}的个人主页</h1>
<div class="wrap">
  ${intro(ctx, { big: true })}
  <nav class="corners" aria-label="各个栏目">
    ${corners.map(([href, ic, name, desc]) => `<a class="corner" href="${href}">${icon(ic)}<b>${name}</b><span>${esc(desc)}</span></a>`).join('\n    ')}
  </nav>
  ${card('latest', 'icon.book', '最近写的', '', `<ol class="post-list">
      ${latest.map(postRow).join('\n      ')}
    </ol>
    <p class="more"><a href="/study/#posts">全部 ${posts.length} 篇 →</a></p>`)}
</div>`;
  return layout(ctx, { kind: 'home', path: '/' }, body);
}

function postRow(p) {
  return `<li class="post-row">
        <time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time>
        <a href="${p.url}">${esc(p.title)}</a>
        <span class="post-row-tags">${p.tags.slice(0, 3).map((t) => `<span class="tag tag-sm">${esc(t)}</span>`).join('')}</span>
      </li>`;
}

// ---------------------------------------------------------------- 学习：文章 + 项目

function tagChip(t, n, on = false, extra = false) {
  return `<button type="button" class="tag${on ? ' is-on' : ''}${extra ? ' tag-extra' : ''}" data-tag="${esc(t.toLowerCase())}">${esc(t || '全部')}<sup>${n}</sup></button>`;
}
const TAGS_SHOWN = 12;

const SPINES = ['#3a57a8', '#c41e24', '#2f7d4a', '#8a3b8f', '#b8862b', '#355a7a', '#7a2e20'];

function bookItem(p) {
  const color = SPINES[p.index % SPINES.length];
  return `<li class="book" data-tags="${esc(p.tags.join('|').toLowerCase())}" data-text="${esc(`${p.title} ${p.summary}`.toLowerCase())}">
      <a href="${p.url}">
        <span class="book-spine" style="--c:${color}" aria-hidden="true"><b>${pad(p.index)}</b></span>
        <span class="book-main">
          <span class="book-meta"><time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time> · ${p.minutes} 分钟</span>
          <span class="book-title">${esc(p.title)}</span>
          <span class="book-sum">${esc(p.summary)}</span>
          <span class="book-tags">${p.tags.slice(0, 4).map((t) => `<span class="tag tag-sm">${esc(t)}</span>`).join('')}</span>
        </span>
      </a>
    </li>`;
}

function repoCard(ctx, repo) {
  const note = ctx.site.repoNotes[repo.name] || {};
  const langs = breakdown(repo.languages);
  const bar = langs.length
    ? langs.map((l) => `<i style="width:${l.pct.toFixed(2)}%;background:${langColor(l.name)}"></i>`).join('')
    : `<i style="width:100%;background:${langColor(repo.language)}"></i>`;
  const langLabel = (langs.length ? langs.slice(0, 3).map((l) => l.name) : [repo.language || '资料'])
    .map((n) => `<span><b style="--c:${langColor(n)}"></b>${esc(n)}</span>`)
    .join('');
  const hasPost = note.post && ctx.posts.some((p) => p.slug === note.post);
  return `<article class="repo">
      <h3 class="repo-name"><a href="${repo.url}" target="_blank" rel="noopener">${esc(repo.name)}</a>${repo.fork ? '<span class="badge">fork</span>' : ''}</h3>
      <p class="repo-note">${esc(note.note || repo.description || '暂无描述')}</p>
      <div class="lang-bar" aria-hidden="true">${bar}</div>
      <p class="repo-meta">${langLabel}<span>★ ${repo.stars}</span><span>${fmtDate(repo.pushedAt)}</span></p>
      ${hasPost ? `<a class="repo-post" href="/posts/${note.post}/">读这篇文章 →</a>` : ''}
    </article>`;
}

export function study(ctx) {
  const { posts, gh, site, stats } = ctx;
  const counts = new Map();
  posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const allTags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const featured = site.featured.map((n) => gh.repos.find((r) => r.name === n)).filter(Boolean);
  const top = stats.languages.slice(0, 6);

  const postsInner = `<div class="book-tools">
      <label class="search"><span class="sr-only">搜索文章</span><input type="search" placeholder="搜标题、摘要、标签……" autocomplete="off" data-filter-input></label>
      <div class="tag-row" role="group" aria-label="按标签筛选">
        ${tagChip('', posts.length, true)}${allTags.map(([t, n], i) => tagChip(t, n, false, i >= TAGS_SHOWN)).join('')}${allTags.length > TAGS_SHOWN ? `<button type="button" class="tag tag-more" data-more>更多 +${allTags.length - TAGS_SHOWN}</button>` : ''}
      </div>
    </div>
    <ol class="books">
    ${posts.map(bookItem).join('\n    ')}
    </ol>
    <p class="empty" hidden>没找到……换个词试试</p>`;

  const projectsInner = `<div class="repos">
    ${featured.map((r) => repoCard(ctx, r)).join('\n    ')}
    </div>
    <div class="langs">
      <div class="lang-stack" aria-hidden="true">${top.map((l) => `<i style="flex-basis:${l.pct.toFixed(2)}%;background:${langColor(l.name)}"></i>`).join('')}</div>
      <p class="lang-legend">${top.map((l) => `<span><b style="--c:${langColor(l.name)}"></b>${esc(l.name)} ${l.pct.toFixed(1)}%</span>`).join('')}</p>
      <p class="lang-note">统计自 ${stats.ownRepos} 个非 fork 仓库 · <a href="https://github.com/${site.github}?tab=repositories" target="_blank" rel="noopener">全部仓库 →</a></p>
      <p class="stack">${site.stack.map((s) => `<span class="tag tag-sm">${esc(s)}</span>`).join('')}</p>
    </div>`;

  const body = `${banner(ctx, 'study', '像素图书馆：一排书架、四根蜡烛，红地毯中间的台子上摊着一本书')}
<div class="wrap">
  ${pageHead('学习', '写过的文章和做过的项目')}
  ${card('posts', 'icon.book', '文章', `${posts.length} 篇`, postsInner, 'paper-card')}
  ${card('projects', 'icon.die', '项目', `${featured.length} / ${gh.repos.length}`, projectsInner, 'paper-card')}
</div>`;
  return layout(ctx, { kind: 'study', path: '/study/', title: '学习', description: `${site.author}写的文章和做过的项目。` }, body);
}

// ---------------------------------------------------------------- 游戏房

export function games(ctx) {
  const { site } = ctx;
  const items = site.games
    .map(
      (g, i) => `<article class="card game" aria-labelledby="game-${i}">
    <header class="game-head">
      <h2 id="game-${i}">${esc(g.name)}</h2>
      <span class="game-en">${esc(g.en)}</span>
      <span class="game-stat">${esc(g.stat)}</span>
    </header>
    <p class="game-note">${esc(g.note)}</p>
    <div class="fav">
      <p class="fav-label">${esc(g.fav.label)}</p>
      <p class="fav-name">${esc(g.fav.name)}<span>${esc(g.fav.en)}</span></p>
      <ul class="fav-facts">${g.fav.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    </div>
  </article>`,
    )
    .join('\n  ');
  const body = `${banner(ctx, 'games', '长着小角的以撒射出一道血红的硫磺火激光，右边雾里立着黎明杀机的钩子', { isaac: true })}
<div class="wrap">
  ${pageHead('游戏房', site.games.map((g) => g.name).join(' · '))}
  <div class="games">
  ${items}
  </div>
</div>`;
  return layout(ctx, { kind: 'games', path: '/games/', title: '游戏房', description: `${site.author}喜欢的游戏：${site.games.map((g) => g.name).join('、')}。` }, body);
}

// ---------------------------------------------------------------- 跑团：骰塔 + 塔罗

const DICE_MODES = [
  ['coc', 'CoC · d100', '对技能值 50 检定：01 大成功，≤10 极难成功，≤25 困难成功，≤50 成功，51 以上失败，100 大失败。'],
  ['ta', '三角机构 · 6d4', '投 6 个 d4，数 3 的个数：有一个 3 就算成功，不是 3 的骰子各产生 1 点混沌（Chaos）；正好三个 3 是 Triscendence，自动成功，也不产生混沌。'],
  ['dnd', 'DnD · 多面骰', '挑一颗骰子投。d20 投出 20 是天然 20，投出 1 是天然 1。'],
];
const DND_DICE = [4, 6, 8, 10, 12, 20, 100];

export function trpg(ctx) {
  const { site } = ctx;
  const T = site.trpg;
  const diceInner = `<div class="seg" role="group" aria-label="规则">
      ${DICE_MODES.map(([id, name], i) => `<button type="button" class="seg-btn" data-mode="${id}" aria-pressed="${i === 0}">${name}</button>`).join('')}
    </div>
    <div class="dice-pick" data-for="dnd" hidden role="group" aria-label="选骰子">
      ${DND_DICE.map((d) => `<button type="button" class="tag" data-die="${d}"${d === 20 ? ' aria-pressed="true"' : ' aria-pressed="false"'}>d${d}</button>`).join('')}
    </div>
    <div class="dice-stage">
      <div class="dice-tower" aria-hidden="true"></div>
      <div class="dice-tray" aria-hidden="true"></div>
    </div>
    <div class="dice-bottom">
      <button type="button" class="btn btn-big dice-roll" disabled>投！</button>
      <p class="dice-result" aria-live="polite">点「投！」看看今天的手气</p>
    </div>
    ${DICE_MODES.map(([id, , rule], i) => `<p class="dice-rule" data-for="${id}"${i ? ' hidden' : ''}>${esc(rule)}</p>`).join('\n    ')}
    <noscript><p class="dice-rule">需要打开 JavaScript 才能投骰子。</p></noscript>`;

  const systems = `<p class="trpg-role">${esc(T.role)}</p>
    <ul class="systems">
      ${T.systems.map((s) => `<li><b>${esc(s.name)}</b><span class="en">${esc(s.en)}</span><span>${esc(s.note)}</span></li>`).join('\n      ')}
    </ul>`;

  const tarotInner = `<p>韦特塔罗 78 张，带逆位：每日一张、三张牌阵、凯尔特十字。牌还在画，做好了就放在这里。</p>
    <div class="tarot-backs" aria-hidden="true">${icon('tarot.back', 5)}${icon('tarot.back', 5)}${icon('tarot.back', 5)}</div>`;

  const body = `${banner(ctx, 'trpg', '绿色桌垫上立着一座城堡样子的骰塔，旁边散着 d20、d10、d6、d4 和三张塔罗牌')}
<div class="wrap">
  ${pageHead('跑团', '三角机构 · CoC · DnD')}
  ${card('dice', 'icon.die', '骰塔', '每次都是新的随机数', diceInner, 'dice')}
  <div class="trpg-grid">
    ${card('systems', 'icon.book', '常玩的规则', '', systems)}
    ${card('tarot', 'tarot.back', '塔罗', '施工中', tarotInner, 'tarot')}
  </div>
</div>`;
  return layout(ctx, { kind: 'trpg', path: '/trpg/', title: '跑团', description: '跑团骰塔：CoC d100、三角机构 6d4、DnD 多面骰；韦特塔罗施工中。' }, body);
}

// ---------------------------------------------------------------- 动漫：水墨蓬莱

export function anime(ctx) {
  const { outcast, sunMoon } = ctx.site.anime;
  const seal = '<span class="seal" aria-hidden="true">蓬莱</span>';
  const body = `${banner(ctx, 'anime', '水墨画的蓬莱：一轮红日和一轮淡月同时挂在天上，群山浮在云里，主峰顶上有座楼阁，仙鹤飞过，山脚下是海', { extra: seal })}
<div class="wrap">
  ${pageHead('动漫', `${outcast.name} · ${sunMoon.name}`)}
  <section class="ink-card outcast" aria-labelledby="outcast-title">
    <h2 id="outcast-title" class="brush">${esc(outcast.name)}</h2>
    <p>${esc(outcast.note)}</p>
    <figure class="scroll-wrap">
      <div class="scroll">
        <blockquote class="brush"><span class="sr-only">${esc(outcast.quote)}</span>${outcast.quote
          .split(/[，。！？、]/)
          .filter(Boolean)
          .map((l) => `<span aria-hidden="true">${esc(l)}</span>`)
          .join('')}</blockquote>
      </div>
      <figcaption class="quote-by">—— ${esc(outcast.by)}</figcaption>
    </figure>
  </section>
  <section class="ink-card sun-moon" aria-labelledby="sunmoon-title">
    <img class="avatar avatar-ink" src="/assets/img/avatar.jpg" width="120" height="120" alt="《日月同错》里的海山">
    <div class="ink-text">
      <h2 id="sunmoon-title" class="brush">${esc(sunMoon.name)}</h2>
      <p>${esc(sunMoon.note)}</p>
    </div>
  </section>
</div>`;
  return layout(ctx, { kind: 'anime', theme: 'ink', path: '/anime/', title: '动漫', description: `${ctx.site.author}喜欢的动漫：${outcast.name}、${sunMoon.name}。` }, body);
}

// 动漫页里用毛笔字的文字，构建时只把这些字裁进毛笔字体
export function brushText(site) {
  const { outcast, sunMoon } = site.anime;
  return `动漫${outcast.name}${sunMoon.name}${outcast.quote}蓬莱`;
}

// ---------------------------------------------------------------- 关于

function timeline(ctx) {
  const items = ctx.site.timeline;
  return items
    .map((t, i) => {
      const last = i === items.length - 1;
      return `<li class="step${last ? ' is-now' : ''}" data-kind="${t.kind}">
      <span class="step-dot" aria-hidden="true"></span>
      <span class="step-main">
        <b class="step-name">${esc(t.name)}</b>${t.role ? `<span class="step-role">${esc(t.role)}</span>` : ''}${t.period ? `<span class="step-period">${esc(t.period)}</span>` : ''}
      </span>
      <span class="step-kind">${t.kind === 'work' ? '工作' : '学校'}</span>
    </li>`;
    })
    .join('\n    ');
}

export function about(ctx) {
  const { site } = ctx;
  const body = `<div class="wrap wrap-narrow">
  ${pageHead('关于', '')}
  ${intro(ctx, { more: false })}
  ${card('timeline', 'isaac.face', '经历', '从小学到现在', `<ol class="steps">
    ${timeline(ctx)}
    </ol>`, 'paper-card', 2)}
  ${card('contact', 'icon.heart', '找到我', '', `<ul class="contact">
      <li><b>GitHub</b><a href="https://github.com/${site.github}" target="_blank" rel="noopener">github.com/${site.github}</a></li>
      <li><b>B 站</b><a href="${site.bilibili.url}" target="_blank" rel="noopener">${esc(site.bilibili.name)}</a></li>
      <li><b>RSS</b><a href="/rss.xml">订阅文章更新</a></li>
    </ul>`)}
  ${card('site', 'icon.skull', '关于这个网站', '', `<p class="site-note">「${esc(site.title)}」是我的个人主页。没有用框架，一个零依赖的 Node 脚本把 Markdown 文章和 GitHub 数据生成成静态页面，推到 GitHub 后自动部署到 Cloudflare Pages。像素画（包括右下角那个以撒）都是用代码一个像素一个像素画出来的。源码在 <a href="https://github.com/${site.github}/home" target="_blank" rel="noopener">${site.github}/home</a>。</p>`)}
</div>`;
  return layout(ctx, { kind: 'about', path: '/about/', title: '关于', description: `关于${site.author}：经历和联系方式。` }, body);
}

// ---------------------------------------------------------------- 文章

export function post(ctx, p, older, newer) {
  const repo = p.repo && ctx.gh.repos.find((r) => r.name === p.repo);
  const toc =
    p.headings.length >= 3
      ? `<aside class="toc" aria-label="本文目录">
    <p class="toc-title">目录</p>
    <ol>${p.headings.map((h) => `<li class="lv${h.level}"><a href="#${h.id}">${h.html}</a></li>`).join('')}</ol>
  </aside>`
      : '';
  const navLink = (item, dir, label) =>
    item ? `<a class="post-nav-${dir}" href="${item.url}"><span>${label}</span>${esc(item.title)}</a>` : '<span></span>';
  const body = `<article class="post">
  <header class="post-head">
    <nav class="crumbs" aria-label="位置"><a href="/">${esc(ctx.site.title)}</a><span>›</span><a href="/study/">学习</a><span>›</span><a href="/study/#posts">文章</a></nav>
    <h1 class="post-title">${esc(p.title)}</h1>
    <p class="post-meta">
      <time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time>
      <span>${p.minutes} 分钟</span>
      ${p.period ? `<span>项目时间 ${esc(p.period)}</span>` : ''}
      ${repo ? `<a href="${repo.url}" target="_blank" rel="noopener">仓库 ${esc(repo.name)} ↗</a>` : ''}
    </p>
    <p class="post-tags">${p.tags.map((t) => `<a class="tag tag-sm" href="/study/?tag=${encodeURIComponent(t.toLowerCase())}#posts">${esc(t)}</a>`).join('')}</p>
  </header>
  <div class="post-layout${toc ? ' has-toc' : ''}">
    <div class="paper prose">
${p.html}
    </div>
    ${toc}
  </div>
  <nav class="post-nav" aria-label="上一篇和下一篇">
    ${navLink(newer, 'newer', '← 新一点的')}
    ${navLink(older, 'older', '旧一点的 →')}
  </nav>
</article>`;
  return layout(ctx, { kind: 'post', section: 'study', path: p.url, title: p.title, description: p.summary }, body);
}

// ---------------------------------------------------------------- 404：以撒的死亡笔记

export function notFound(ctx) {
  const body = `<section class="death">
  <div class="death-note">
    <p class="death-kicker">${esc(ctx.site.title)} · 未知页面</p>
    <h1 class="death-title">你死了</h1>
    <p class="death-cause">${icon('isaac.dead', 6)}<span>死因<b>404</b></span></p>
    <p class="death-text">这个页面不存在：可能网址写错了，也可能已经被搬走了。</p>
    <p class="death-restart"><kbd>R</kbd> 重来 · <a href="/">回首页</a> · <a href="/study/">看文章</a></p>
  </div>
</section>`;
  return layout(ctx, { kind: 'notfound', path: '/404', title: '你死了' }, body);
}

// ---------------------------------------------------------------- 订阅 / 索引

const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export function rss(ctx) {
  const { site, posts } = ctx;
  const items = posts
    .map(
      (p) => `<item>
<title>${esc(p.title)}</title>
<link>${site.url}${p.url}</link>
<guid isPermaLink="true">${site.url}${p.url}</guid>
<pubDate>${p.date.toUTCString()}</pubDate>
${p.tags.map((t) => `<category>${esc(t)}</category>`).join('')}
<description>${cdata(p.summary)}</description>
<content:encoded>${cdata(p.html)}</content:encoded>
</item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${esc(site.title)} · ${esc(site.author)}</title>
<link>${site.url}/</link>
<description>${esc(site.description)}</description>
<language>zh-CN</language>
<atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;
}

export function sitemap(ctx) {
  const { site, posts } = ctx;
  const today = fmtDate(new Date());
  const urls = [...NAV.map(([href]) => [href, today]), ...posts.map((p) => [p.url, fmtDate(p.updated || p.date)])];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `<url><loc>${site.url}${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}
</urlset>
`;
}

export function searchIndex(ctx) {
  const { posts } = ctx;
  return {
    posts: posts.map((p) => ({ slug: p.slug, url: p.url, title: p.title, tags: p.tags, summary: p.summary, text: p.text })),
  };
}

// 旧网址跳到新位置：第一版的文章列表、项目页，以及改版预览时用过的图书馆
export function redirects() {
  return [
    '/posts /study/#posts 301',
    '/posts/ /study/#posts 301',
    '/projects /study/#projects 301',
    '/projects/ /study/#projects 301',
    '/library /study/ 301',
    '/library/ /study/ 301',
  ].join('\n') + '\n';
}
