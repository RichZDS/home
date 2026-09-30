// 页面模板：全部是返回 HTML 字符串的函数，没有模板引擎。
// 五个区五种皮肤：首页 / 关于是画廊（lobby），学习是学术（study），游戏是赛博朋克（games），
// 跑团是中世纪 + 克苏鲁（trpg），动漫是水墨（anime）。皮肤由 <html data-theme> 决定，样式在 main.css。
import { esc } from './markdown.mjs';

export const fmtDate = (d) => new Date(new Date(d).getTime() + 8 * 3600e3).toISOString().slice(0, 10);
const pad = (n, w = 2) => String(n).padStart(w, '0');
const strip = (html) => String(html).replace(/<[^>]+>/g, '');

const LANG_COLORS = {
  Go: '#2f6f8f', Java: '#b8641e', Vue: '#2f7d4a', TypeScript: '#2b4b8a', JavaScript: '#b08a1a',
  Python: '#5a4a9a', CSS: '#9a3a6a', HTML: '#b04a2a', Dockerfile: '#4f6f8f', Shell: '#5a7a3a',
};
export const langColor = (name) => LANG_COLORS[name] || '#7a7a72';

export function breakdown(languages = {}) {
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(languages)
    .map(([name, bytes]) => ({ name, bytes, pct: (bytes / total) * 100 }))
    .sort((a, b) => b.bytes - a.bytes);
}

// 导航栏目：[地址, 名字, 栏目 id]
export const NAV = [
  ['/', '首页', 'home'],
  ['/study/', '学习', 'study'],
  ['/games/', '游戏', 'games'],
  ['/trpg/', '跑团', 'trpg'],
  ['/anime/', '动漫', 'anime'],
  ['/about/', '关于', 'about'],
];
const THEME = { home: 'lobby', about: 'lobby', notfound: 'lobby', study: 'study', post: 'study', games: 'games', trpg: 'trpg', anime: 'anime' };

// 脚本里会显示、但不在页面 HTML 里的文字（要一起裁进字体）
export const SCRIPT_TEXT = {
  brush: '大成功大失败极难成功困难成功成功失败天然 20！天然 1……Triscendence成功 ×0123456789 个 3',
};

// 首屏渲染前执行：标记 JS 可用；页面切换时浏览器可能会跳过淡入淡出，吞掉它的 promise，免得控制台报错
const HEAD_SCRIPT =
  "(function(h){h.classList.add('js');" +
  "function q(e){var v=e.viewTransition,n=function(){};if(v){v.ready.catch(n);v.finished.catch(n);v.updateCallbackDone&&v.updateCallbackDone.catch(n)}}" +
  "addEventListener('pagereveal',q);addEventListener('pageswap',q)" +
  '})(document.documentElement)';

// ---------------------------------------------------------------- 框架

function layout(ctx, page, body) {
  const { site, assets, px, use } = ctx;
  const url = site.url + page.path;
  const title = page.title ? `${page.title} · ${site.title}` : `${site.title} · ${site.author}的个人主页`;
  const desc = page.description || site.description;
  const theme = THEME[page.kind];
  const section = page.section ?? page.kind;
  const dark = theme === 'games';
  const themeColor = { lobby: '#f1efe9', study: '#fbfaf6', games: '#0a0c13', trpg: '#e4d6b6', anime: '#efe6d2' }[theme];
  use('xiaowei', site.title);
  return `<!doctype html>
<html lang="zh-CN" data-page="${page.kind}" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(site.author)}">
<meta name="theme-color" content="${themeColor}">
<meta name="color-scheme" content="${dark ? 'dark' : 'light'}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/rss.xml">
<meta property="og:type" content="${page.kind === 'post' ? 'article' : 'website'}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(page.title || site.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}${(page.image || '/apple-touch-icon.png').split('?')[0]}">
<meta name="twitter:card" content="${page.image ? 'summary_large_image' : 'summary'}">
<style>__FONTFACES__${px.css}</style>
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
${footer(ctx, theme)}
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

function header(ctx, section) {
  const links = NAV.map(([href, name, kind]) => `<a href="${href}"${kind === section ? ' aria-current="page"' : ''}>${name}</a>`).join('');
  return `<header class="top">
  <div class="top-in">
    <a class="brand" href="/">${esc(ctx.site.title)}</a>
    <nav class="nav" aria-label="栏目">${links}</nav>
  </div>
</header>`;
}

const CREDITS = {
  lobby: '标题字体 <a href="https://github.com/googlefonts/zcool-xiaowei" target="_blank" rel="noopener">站酷小薇体</a>',
  study: '标题字体 <a href="https://github.com/notofonts/noto-cjk" target="_blank" rel="noopener">思源宋体</a>',
  games: '像素字体 <a href="https://github.com/TakWolf/fusion-pixel-font" target="_blank" rel="noopener">Fusion Pixel</a>',
  trpg: '标题字体 <a href="https://github.com/googlefonts/zhimangxing" target="_blank" rel="noopener">志莽行书</a>',
  anime: '毛笔字 <a href="https://github.com/googlefonts/mashanzheng" target="_blank" rel="noopener">马善政楷书</a>',
};

function footer(ctx, theme) {
  const { site } = ctx;
  return `<footer class="footer">
  <p class="footer-links">
    <a href="https://github.com/${site.github}" target="_blank" rel="noopener">GitHub</a>
    <a href="${site.bilibili.url}" target="_blank" rel="noopener">B 站 · ${esc(site.bilibili.name)}</a>
    <a href="/rss.xml">RSS</a>
  </p>
  <p class="footer-note">© ${new Date().getFullYear()} ${esc(site.author)} · ${esc(site.title)} · 插画由 GPT 生成 · ${CREDITS[theme]}（OFL）</p>
</footer>`;
}

// 页面顶上的主视觉：一张插画 + 标题。图片还没画好时先用纯色占位
function hero(ctx, id, { kicker, title, sub, alt, cls = '', extra = '' }) {
  const img = ctx.images[`hero-${id}`];
  const pic = img
    ? `<img class="hero-img" src="${img}" width="1536" height="1024" alt="${esc(alt)}" fetchpriority="high">`
    : `<div class="hero-img hero-empty" role="img" aria-label="${esc(alt)}"></div>`;
  return `<section class="hero hero-${id}${cls ? ` ${cls}` : ''}">
  ${pic}${extra}
  <div class="hero-text">
    ${kicker ? `<p class="kicker">${kicker}</p>` : ''}
    <h1 class="hero-title">${title}</h1>
    ${sub ? `<p class="hero-sub">${sub}</p>` : ''}
  </div>
</section>`;
}

// ---------------------------------------------------------------- 首页：画廊

const HALLS = [
  { id: 'study', href: '/study/', name: '学习', font: 'serif', style: '学术', desc: (ctx) => `${ctx.posts.length} 篇文章 · ${ctx.featured.length} 个项目` },
  { id: 'games', href: '/games/', name: '游戏房', font: 'pixel', style: '赛博朋克', desc: (ctx) => ctx.site.games.map((g) => g.name).join(' · ') },
  { id: 'trpg', href: '/trpg/', name: '跑团', font: 'xingshu', style: '中世纪 · 克苏鲁', desc: () => '骰塔 · 三角机构 · CoC · DnD' },
  { id: 'anime', href: '/anime/', name: '动漫', font: 'brush', style: '水墨', desc: (ctx) => `${ctx.site.anime.outcast.name} · ${ctx.site.anime.sunMoon.name}` },
];

function postRow(p) {
  return `<li class="post-row">
        <time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time>
        <a href="${p.url}">${esc(p.title)}</a>
        <span class="post-row-tags">${p.tags.slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>
      </li>`;
}

export function home(ctx) {
  const { site, posts, use } = ctx;
  ctx.featured = site.featured.map((n) => ctx.gh.repos.find((r) => r.name === n)).filter(Boolean);
  const mascot = ctx.images['mascot-isaac'];
  const halls = HALLS.map((h) => {
    const img = ctx.images[`hero-${h.id}`];
    return `<a class="hall hall-${h.id}" href="${h.href}">
      ${img ? `<img src="${img}" width="1536" height="1024" alt="" loading="lazy">` : '<span class="hall-empty" aria-hidden="true"></span>'}
      <span class="hall-cap">
        <b class="hall-name">${use(h.font, h.name)}</b>
        <span class="hall-desc">${esc(h.desc(ctx))}</span>
        <em class="hall-style">${esc(h.style)}</em>
      </span>
    </a>`;
  }).join('\n    ');
  const body = `<section class="lobby-hero${mascot ? ' has-art' : ''}">
  <div class="lobby-text">
    <p class="kicker">${esc(site.author)}的个人主页</p>
    <h1 class="wordmark">${use('xiaowei', esc(site.title))}</h1>
    <p class="lead">${esc(site.intro.bio)}</p>
    <p class="intro-lines">${site.intro.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</p>
    <p class="intro-links">
      <a class="btn" href="https://github.com/${site.github}" target="_blank" rel="noopener">GitHub</a>
      <a class="btn" href="${site.bilibili.url}" target="_blank" rel="noopener">B 站</a>
      <a class="btn btn-ghost" href="/about/">关于我 →</a>
    </p>
  </div>
  ${mascot
    ? `<figure class="lobby-art" data-isaac><img src="${mascot}" width="1024" height="1536" alt="以撒：这个网站的吉祥物，一个坐在木箱上抱着膝盖的光头小孩，眼角挂着泪珠" fetchpriority="high"></figure>`
    : `<figure class="lobby-art"><img class="avatar" src="/assets/img/avatar.jpg" width="160" height="160" alt="头像：《日月同错》里的海山"></figure>`}
</section>
<section class="halls" aria-labelledby="halls-title">
  <h2 class="sec-title" id="halls-title">${use('xiaowei', '四个展厅')}<small>每个展厅一种画风</small></h2>
  <div class="hall-grid">
    ${halls}
  </div>
</section>
<section class="latest" aria-labelledby="latest-title">
  <h2 class="sec-title" id="latest-title">${use('xiaowei', '最近写的')}<small><a href="/study/#posts">全部 ${posts.length} 篇 →</a></small></h2>
  <ol class="post-list">
    ${posts.slice(0, 5).map(postRow).join('\n    ')}
  </ol>
</section>`;
  return layout(ctx, { kind: 'home', path: '/', image: ctx.images['hero-anime'] || ctx.images['hero-study'] }, body);
}

// ---------------------------------------------------------------- 学习：学术风

function tagChip(t, n, on = false, extra = false) {
  return `<button type="button" class="tag${on ? ' is-on' : ''}${extra ? ' tag-extra' : ''}" data-tag="${esc(t.toLowerCase())}">${esc(t || '全部')}<sup>${n}</sup></button>`;
}
const TAGS_SHOWN = 12;

function articleItem(ctx, p) {
  return `<li class="article" data-tags="${esc(p.tags.join('|').toLowerCase())}" data-text="${esc(`${p.title} ${p.summary}`.toLowerCase())}">
      <span class="article-no">${pad(p.index)}</span>
      <div class="article-main">
        <a class="article-title" href="${p.url}">${ctx.use('serif', esc(p.title))}</a>
        <p class="article-abs">${esc(p.summary)}</p>
        <p class="article-meta"><time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time><span>${p.minutes} 分钟</span>${p.tags.slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</p>
      </div>
    </li>`;
}

function projectItem(ctx, repo) {
  const note = ctx.site.repoNotes[repo.name] || {};
  const langs = breakdown(repo.languages);
  const names = langs.length ? langs.slice(0, 3).map((l) => l.name) : [repo.language || '资料'];
  const hasPost = note.post && ctx.posts.some((p) => p.slug === note.post);
  return `<article class="project">
      <h3 class="project-name"><a href="${repo.url}" target="_blank" rel="noopener">${ctx.use('serif', esc(repo.name))}</a>${repo.fork ? '<span class="badge">fork</span>' : ''}</h3>
      <p class="project-note">${esc(note.note || repo.description || '暂无描述')}</p>
      <p class="project-kw"><b>关键词</b>${names.map((n) => `<span><i style="--c:${langColor(n)}"></i>${esc(n)}</span>`).join('')}</p>
      <p class="project-meta"><span>★ ${repo.stars}</span><span>更新 ${fmtDate(repo.pushedAt)}</span>${hasPost ? `<a href="/posts/${note.post}/">相关文章 →</a>` : ''}</p>
    </article>`;
}

export function study(ctx) {
  const { posts, gh, site, stats, use } = ctx;
  const counts = new Map();
  posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const allTags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const featured = site.featured.map((n) => gh.repos.find((r) => r.name === n)).filter(Boolean);
  const top = stats.languages.slice(0, 6);
  const body = `${hero(ctx, 'study', {
    kicker: `${esc(site.title)} · 第一卷 · ${new Date().getFullYear()}`,
    title: use('serif', '学习'),
    sub: '写过的文章，做过的项目',
    alt: '铜版画：一张靠窗的书桌，摊开的书、黄铜台灯、一杯茶和几张手稿',
    cls: 'hero-plate',
  })}
<div class="wrap wrap-journal">
  <section class="jsec" id="posts" aria-labelledby="posts-title">
    <header class="jsec-head"><h2 id="posts-title">${use('serif', '文章')}</h2><span class="jsec-count">共 ${posts.length} 篇</span></header>
    <div class="article-tools">
      <label class="search"><span class="sr-only">搜索文章</span><input type="search" placeholder="搜标题、摘要、标签或正文" autocomplete="off" data-filter-input></label>
      <div class="tag-row" role="group" aria-label="按标签筛选">
        ${tagChip('', posts.length, true)}${allTags.map(([t, n], i) => tagChip(t, n, false, i >= TAGS_SHOWN)).join('')}${allTags.length > TAGS_SHOWN ? `<button type="button" class="tag tag-more" data-more>更多 +${allTags.length - TAGS_SHOWN}</button>` : ''}
      </div>
    </div>
    <ol class="articles">
    ${posts.map((p) => articleItem(ctx, p)).join('\n    ')}
    </ol>
    <p class="empty" hidden>没有找到相关文章。</p>
  </section>

  <section class="jsec" id="projects" aria-labelledby="projects-title">
    <header class="jsec-head"><h2 id="projects-title">${use('serif', '项目')}</h2><span class="jsec-count">${featured.length} 个精选 · 共 ${gh.repos.length} 个仓库</span></header>
    <div class="projects">
    ${featured.map((r) => projectItem(ctx, r)).join('\n    ')}
    </div>
    <div class="langs">
      <div class="lang-stack" aria-hidden="true">${top.map((l) => `<i style="flex-basis:${l.pct.toFixed(2)}%;background:${langColor(l.name)}"></i>`).join('')}</div>
      <p class="lang-legend">${top.map((l) => `<span><i style="--c:${langColor(l.name)}"></i>${esc(l.name)} ${l.pct.toFixed(1)}%</span>`).join('')}</p>
      <p class="lang-note">语言比例统计自 ${stats.ownRepos} 个非 fork 仓库的代码量。<a href="https://github.com/${site.github}?tab=repositories" target="_blank" rel="noopener">全部仓库 →</a></p>
      <p class="stack"><b>常用</b>${site.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</p>
    </div>
  </section>
</div>`;
  return layout(ctx, { kind: 'study', path: '/study/', title: '学习', description: `${site.author}写的文章和做过的项目。`, image: ctx.images['hero-study'] }, body);
}

// ---------------------------------------------------------------- 游戏房：赛博朋克

export function games(ctx) {
  const { site, use } = ctx;
  const items = site.games
    .map(
      (g, i) => `<article class="hud" aria-labelledby="game-${i}">
    <header class="hud-head">
      <p class="hud-tag">${use('orbitron', `PLAYER PROFILE ${pad(i + 1)}`)}</p>
      <h2 id="game-${i}">${use('pixel', esc(g.name))}</h2>
      <p class="hud-en">${use('orbitron', esc(g.en))}</p>
    </header>
    <p class="hud-stat"><span class="hud-label">${use('orbitron', 'STATUS')}</span><b>${use('pixel', esc(g.stat))}</b></p>
    <p class="hud-note">${esc(g.note)}</p>
    <div class="loadout">
      <p class="hud-label">${esc(g.fav.label)}</p>
      <p class="loadout-name">${use('pixel', esc(g.fav.name))}<span>${use('orbitron', esc(g.fav.en))}</span></p>
      <ul class="loadout-facts">${g.fav.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    </div>
  </article>`,
    )
    .join('\n  ');
  const body = `${hero(ctx, 'games', {
    kicker: use('orbitron', 'GAME ROOM // 02'),
    title: `<span class="glitch" data-text="游戏房">${use('pixel', '游戏房')}</span>`,
    sub: site.games.map((g) => esc(g.name)).join(' · '),
    alt: '雨夜的霓虹小巷，一道深红激光横贯画面，前景雾里挂着一只铁钩',
  })}
<div class="wrap">
  <div class="hud-grid">
  ${items}
  </div>
</div>`;
  return layout(ctx, { kind: 'games', path: '/games/', title: '游戏房', description: `${site.author}喜欢的游戏：${site.games.map((g) => g.name).join('、')}。`, image: ctx.images['hero-games'] }, body);
}

// ---------------------------------------------------------------- 跑团：中世纪 + 克苏鲁

const DICE_MODES = [
  ['coc', 'CoC · d100', '对技能值 50 检定：01 大成功，≤10 极难成功，≤25 困难成功，≤50 成功，51 以上失败，100 大失败。'],
  ['ta', '三角机构 · 6d4', '投 6 个 d4，数 3 的个数：有一个 3 就算成功，不是 3 的骰子各产生 1 点混沌（Chaos）；正好三个 3 是 Triscendence，自动成功，也不产生混沌。'],
  ['dnd', 'DnD · 多面骰', '挑一颗骰子投。d20 投出 20 是天然 20，投出 1 是天然 1。'],
];
const DND_DICE = [4, 6, 8, 10, 12, 20, 100];

export function trpg(ctx) {
  const { site, use } = ctx;
  const T = site.trpg;
  const body = `${hero(ctx, 'trpg', {
    kicker: use('fraktur', 'Tabletop Role-Playing'),
    title: use('xingshu', '跑团'),
    sub: T.systems.map((s) => esc(s.name)).join(' · '),
    alt: '油画：烛光下的橡木桌上摊着魔法书、骰子和一座骰塔，哥特窗外的海面升起巨大的触手',
  })}
<div class="wrap">
  <section class="sheet dice" id="dice" aria-labelledby="dice-title">
    <header class="sheet-head">
      <h2 id="dice-title">${use('xingshu', '骰塔')}</h2>
      <span class="sheet-sub">${use('cinzel', 'Dice Tower')} · 每次都是新的随机数</span>
    </header>
    <div class="seg" role="group" aria-label="规则">
      ${DICE_MODES.map(([id, name], i) => `<button type="button" class="seg-btn" data-mode="${id}" aria-pressed="${i === 0}">${name}</button>`).join('')}
    </div>
    <div class="dice-pick" data-for="dnd" hidden role="group" aria-label="选骰子">
      ${DND_DICE.map((d) => `<button type="button" class="tag" data-die="${d}" aria-pressed="${d === 20}">d${d}</button>`).join('')}
    </div>
    <div class="dice-tray" aria-hidden="true"></div>
    <div class="dice-bottom">
      <button type="button" class="btn btn-roll dice-roll" disabled>${use('xingshu', '投')}</button>
      <p class="dice-result" aria-live="polite">点「投」看看今天的手气</p>
    </div>
    ${DICE_MODES.map(([id, , rule], i) => `<p class="dice-rule" data-for="${id}"${i ? ' hidden' : ''}>${esc(rule)}</p>`).join('\n    ')}
    <noscript><p class="dice-rule">需要打开 JavaScript 才能投骰子。</p></noscript>
  </section>
  <div class="two-col">
    <section class="sheet" id="systems" aria-labelledby="systems-title">
      <header class="sheet-head"><h2 id="systems-title">${use('xingshu', '常玩的规则')}</h2></header>
      <p class="sheet-lead">${esc(T.role)}</p>
      <ul class="systems">
        ${T.systems.map((s) => `<li><b>${esc(s.name)}</b><span class="en">${use('fraktur', esc(s.en))}</span><span class="how">${esc(s.note)}</span></li>`).join('\n        ')}
      </ul>
    </section>
    <section class="sheet tarot" id="tarot" aria-labelledby="tarot-title">
      <header class="sheet-head"><h2 id="tarot-title">${use('xingshu', '塔罗')}</h2><span class="sheet-sub">${use('cinzel', 'Tarot')} · 施工中</span></header>
      <p class="sheet-lead">韦特塔罗 78 张，带逆位：每日一张、三张牌阵、凯尔特十字。牌还在画，做好了就放在这里。</p>
      <div class="tarot-backs" aria-hidden="true"><i></i><i></i><i></i></div>
    </section>
  </div>
</div>`;
  return layout(ctx, { kind: 'trpg', path: '/trpg/', title: '跑团', description: '跑团骰塔：CoC d100、三角机构 6d4、DnD 多面骰；韦特塔罗施工中。', image: ctx.images['hero-trpg'] }, body);
}

// ---------------------------------------------------------------- 动漫：水墨

export function anime(ctx) {
  const { outcast, sunMoon } = ctx.site.anime;
  const { use } = ctx;
  const body = `${hero(ctx, 'anime', {
    kicker: '海上仙山',
    title: use('brush', '动漫'),
    sub: `${esc(outcast.name)} · ${esc(sunMoon.name)}`,
    alt: '水墨画的蓬莱：云雾里的山峰，主峰顶上有座楼阁，一轮红日和一轮淡月同时挂在天上，仙鹤飞过，山脚下是海',
    extra: `<span class="seal" aria-hidden="true">${use('brush', '蓬莱')}</span>`,
  })}
<div class="wrap">
  <section class="ink-card outcast" aria-labelledby="outcast-title">
    <h2 id="outcast-title" class="brush">${use('brush', esc(outcast.name))}</h2>
    <p>${esc(outcast.note)}</p>
    <figure class="scroll-wrap">
      <div class="scroll">
        <blockquote class="brush"><span class="sr-only">${esc(outcast.quote)}</span>${outcast.quote
          .split(/[，。！？、]/)
          .filter(Boolean)
          .map((l) => `<span aria-hidden="true">${use('brush', esc(l))}</span>`)
          .join('')}</blockquote>
      </div>
      <figcaption class="quote-by">—— ${esc(outcast.by)}</figcaption>
    </figure>
  </section>
  <section class="ink-card sun-moon" aria-labelledby="sunmoon-title">
    <img class="avatar avatar-ink" src="/assets/img/avatar.jpg" width="120" height="120" alt="《日月同错》里的海山">
    <div class="ink-text">
      <h2 id="sunmoon-title" class="brush">${use('brush', esc(sunMoon.name))}</h2>
      <p>${esc(sunMoon.note)}</p>
    </div>
  </section>
</div>`;
  return layout(ctx, { kind: 'anime', path: '/anime/', title: '动漫', description: `${ctx.site.author}喜欢的动漫：${outcast.name}、${sunMoon.name}。`, image: ctx.images['hero-anime'] }, body);
}

// ---------------------------------------------------------------- 关于：画廊

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
  const { site, use } = ctx;
  const body = `<div class="wrap wrap-narrow">
  <header class="page-head">
    <p class="kicker">ABOUT</p>
    <h1>${use('xiaowei', '关于')}</h1>
  </header>
  <section class="intro">
    <img class="avatar" src="/assets/img/avatar.jpg" width="120" height="120" alt="头像：《日月同错》里的海山">
    <div class="intro-main">
      <p class="intro-name">${use('xiaowei', esc(site.intro.name))}</p>
      <p class="intro-lines">${site.intro.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</p>
      <p class="intro-bio">${esc(site.intro.bio)}</p>
    </div>
  </section>
  <section class="block" aria-labelledby="timeline-title">
    <h2 class="sec-title" id="timeline-title">${use('xiaowei', '经历')}<small>从小学到现在</small></h2>
    <ol class="steps">
    ${timeline(ctx)}
    </ol>
  </section>
  <section class="block" aria-labelledby="contact-title">
    <h2 class="sec-title" id="contact-title">${use('xiaowei', '找到我')}</h2>
    <ul class="contact">
      <li><b>GitHub</b><a href="https://github.com/${site.github}" target="_blank" rel="noopener">github.com/${site.github}</a></li>
      <li><b>B 站</b><a href="${site.bilibili.url}" target="_blank" rel="noopener">${esc(site.bilibili.name)}</a></li>
      <li><b>RSS</b><a href="/rss.xml">订阅文章更新</a></li>
    </ul>
  </section>
  <section class="block" aria-labelledby="site-title">
    <h2 class="sec-title" id="site-title">${use('xiaowei', '关于这个网站')}</h2>
    <p class="site-note">「${esc(site.title)}」是我的个人主页，四个展厅四种画风：学习是学术风，游戏房是赛博朋克，跑团是中世纪加克苏鲁，动漫是水墨。插画由 GPT 生成，右下角的像素以撒是用代码一个像素一个像素画的。网站没有用框架，一个零依赖的 Node 脚本把 Markdown 文章和 GitHub 数据生成成静态页面，推到 GitHub 后自动部署到 Cloudflare Pages。源码在 <a href="https://github.com/${site.github}/home" target="_blank" rel="noopener">${site.github}/home</a>。</p>
  </section>
</div>`;
  return layout(ctx, { kind: 'about', path: '/about/', title: '关于', description: `关于${site.author}：经历和联系方式。` }, body);
}

// ---------------------------------------------------------------- 文章：学术风

export function post(ctx, p, older, newer) {
  const { use } = ctx;
  const repo = p.repo && ctx.gh.repos.find((r) => r.name === p.repo);
  for (const h of p.headings) use('serif', strip(h.html));
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
    <h1 class="post-title">${use('serif', esc(p.title))}</h1>
    <p class="post-meta">
      <span class="post-author">${esc(ctx.site.author)}</span>
      <time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time>
      <span>${p.minutes} 分钟</span>
      ${p.period ? `<span>项目时间 ${esc(p.period)}</span>` : ''}
      ${repo ? `<a href="${repo.url}" target="_blank" rel="noopener">仓库 ${esc(repo.name)} ↗</a>` : ''}
    </p>
    <p class="post-abs"><b>摘要</b>${esc(p.summary)}</p>
    <p class="post-tags"><b>关键词</b>${p.tags.map((t) => `<a class="tag" href="/study/?tag=${encodeURIComponent(t.toLowerCase())}#posts">${esc(t)}</a>`).join('')}</p>
  </header>
  <div class="post-layout${toc ? ' has-toc' : ''}">
    <div class="prose">
${p.html}
    </div>
    ${toc}
  </div>
  <nav class="post-nav" aria-label="上一篇和下一篇">
    ${navLink(newer, 'newer', '← 新一点的')}
    ${navLink(older, 'older', '旧一点的 →')}
  </nav>
</article>`;
  return layout(ctx, { kind: 'post', section: 'study', path: p.url, title: p.title, description: p.summary, image: ctx.images['hero-study'] }, body);
}

// ---------------------------------------------------------------- 404

export function notFound(ctx) {
  const { use } = ctx;
  const body = `<section class="lost">
  <p class="kicker">404</p>
  <h1>${use('xiaowei', '这个展厅不存在')}</h1>
  <p>可能网址写错了，也可能已经被搬走了。</p>
  <p class="lost-links"><a class="btn" href="/">回首页</a><a class="btn btn-ghost" href="/study/">看文章</a><span class="lost-hint"><kbd>R</kbd> 也能回首页</span></p>
</section>`;
  return layout(ctx, { kind: 'notfound', path: '/404', title: '页面不存在' }, body);
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
