// 页面模板：全部是返回 HTML 字符串的函数，没有模板引擎。
// 五个区五种皮肤：首页 / 关于是画廊（lobby），学习是学术（study），游戏是赛博朋克（games），
// 跑团是中世纪 + 克苏鲁（trpg），动漫是水墨（anime）。皮肤由 <html data-theme> 决定，样式在 main.css。
import { esc } from './markdown.mjs';

export const fmtDate = (d) => new Date(new Date(d).getTime() + 8 * 3600e3).toISOString().slice(0, 10);
const pad = (n, w = 2) => String(n).padStart(w, '0');
const strip = (html) => String(html).replace(/<[^>]+>/g, '');

const LANG_COLORS = {
  Go: '#00add8', Java: '#b07219', Vue: '#41b883', TypeScript: '#3178c6', JavaScript: '#f1e05a',
  Python: '#3572a5', CSS: '#663399', HTML: '#e34c26', Dockerfile: '#384d54', Shell: '#89e051', Markdown: '#083fa1',
};
export const langColor = (name) => LANG_COLORS[name] || '#8b8b83';

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

// 脚本里会显示、但不在页面 HTML 里的文字（要一起裁进字体）；塔罗牌名在 build.mjs 里另外加进行书
export const SCRIPT_TEXT = {
  brush: '大成功大失败极难成功困难成功成功失败天然 20！天然 1……Triscendence成功 ×0123456789 个 3',
  cinzel: '0123456789',
  xingshu: '正位逆位',
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
<script type="module" src="/assets/js/main.js?v=${assets.js}" id="main-js" data-sheet="${px.urls['assets/px/sheet.png']}" data-dice="/assets/js/dice.js?v=${assets.dice}" data-tarot="/assets/js/tarot.js?v=${assets.tarot}"></script>
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
  const tarot = theme === 'trpg' ? ' · 塔罗牌面 Pamela Colman Smith 绘于 1909 年（公有领域）' : '';
  return `<footer class="footer">
  <p class="footer-links">
    <a href="https://github.com/${site.github}" target="_blank" rel="noopener">GitHub</a>
    <a href="${site.bilibili.url}" target="_blank" rel="noopener">B 站 · ${esc(site.bilibili.name)}</a>
    <a href="/rss.xml">RSS</a>
  </p>
  <p class="footer-note">© ${new Date().getFullYear()} ${esc(site.author)} · ${esc(site.title)} · 版画插图由 GPT 生成${tarot} · ${CREDITS[theme]}（OFL）</p>
</footer>`;
}

// 页面顶上的主视觉：左边标题，右边一张版画（透明底，直接印在页面的纸色上）。图片还没画好时先用纯色占位
function hero(ctx, id, { kicker, title, sub, alt, extra = '' }) {
  const img = ctx.images[`hero-${id}`];
  const pic = img
    ? `<img class="hero-img" src="${img}" width="1280" height="853" alt="${esc(alt)}" fetchpriority="high">`
    : `<div class="hero-img hero-empty" role="img" aria-label="${esc(alt)}"></div>`;
  return `<section class="hero hero-${id}">
  <div class="hero-text">
    ${kicker ? `<p class="kicker">${kicker}</p>` : ''}
    <h1 class="hero-title">${title}</h1>
    ${sub ? `<p class="hero-sub">${sub}</p>` : ''}
  </div>
  <figure class="hero-art">${pic}${extra}</figure>
</section>`;
}

// ---------------------------------------------------------------- 首页：画廊

const HALLS = [
  { id: 'study', href: '/study/', name: '学习', font: 'serif', style: '学术', desc: (ctx) => `${ctx.posts.length} 篇文章 · ${ctx.site.featured.length} 个重点项目 · ${ctx.gh.repos.length} 个仓库` },
  { id: 'games', href: '/games/', name: '游戏房', font: 'pixel', style: '赛博朋克', desc: (ctx) => ctx.site.games.map((g) => g.name).join(' · ') },
  { id: 'trpg', href: '/trpg/', name: '跑团', font: 'xingshu', style: '中世纪 · 克苏鲁', desc: () => '骰塔 · 塔罗 · 三角机构 · CoC · DnD' },
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
  const halls = HALLS.map((h) => {
    const img = ctx.images[`hero-${h.id}`];
    return `<a class="hall hall-${h.id}" href="${h.href}">
      <span class="hall-pic">${img ? `<img src="${img}" width="1280" height="853" alt="" loading="lazy">` : ''}</span>
      <span class="hall-cap">
        <b class="hall-name">${use(h.font, h.name)}</b>
        <span class="hall-desc">${esc(h.desc(ctx))}</span>
        <em class="hall-style">${esc(h.style)}</em>
      </span>
    </a>`;
  }).join('\n    ');
  const body = `<section class="lobby-hero">
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
  <figure class="portrait">
    <img class="portrait-img" src="/assets/img/avatar.jpg" width="220" height="220" alt="头像：《日月同错》里的海山" fetchpriority="high">
    <figcaption><b>${use('xiaowei', esc(site.intro.name))}</b><span>海山 · 《${esc(site.anime.sunMoon.name)}》</span></figcaption>
  </figure>
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

const langDot = (n) => `<span class="lang"><i style="--c:${langColor(n)}"></i>${esc(n)}</span>`;
const REPO_ICON = '<svg class="octicon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>';
const STAR_ICON = '<svg class="octicon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>';
const FORK_ICON = '<svg class="octicon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>';

// 两个重点项目：大卡片，配置在 site.config.mjs 的 featured 里
function featuredItem(ctx, f, i) {
  const repo = ctx.gh.repos.find((r) => r.name === f.repo);
  const langs = repo ? breakdown(repo.languages).slice(0, 3).map((l) => l.name) : f.langs || [];
  if (repo && !langs.length && repo.language) langs.push(repo.language);
  const url = repo ? repo.url : f.url;
  const hasPost = f.post && ctx.posts.some((p) => p.slug === f.post);
  return `<article class="feat" aria-labelledby="feat-${i}">
      <p class="feat-kicker">重点项目 ${pad(i + 1)}</p>
      <h3 class="feat-title" id="feat-${i}"><a href="${url}" target="_blank" rel="noopener">${ctx.use('serif', esc(f.title))}</a></h3>
      <p class="feat-tagline">${esc(f.tagline)}</p>
      <p class="feat-desc">${esc(f.desc)}</p>
      <ul class="feat-facts">${f.facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="feat-meta">
        ${langs.length ? `<span class="feat-langs">${langs.map(langDot).join('')}</span>` : ''}
        ${repo ? `<span>${STAR_ICON} ${repo.stars}</span><span>更新 ${fmtDate(repo.pushedAt)}</span>` : `<span class="feat-status">${esc(f.status || '')}</span>`}
        <a href="${url}" target="_blank" rel="noopener">${REPO_ICON} ${esc(f.repo)} ↗</a>
        ${hasPost ? `<a href="/posts/${f.post}/">相关文章 →</a>` : ''}
      </p>
    </article>`;
}

// 其他仓库：照 GitHub 仓库卡片的样子
function repoCard(ctx, repo) {
  const note = ctx.site.repoNotes[repo.name] || {};
  const lang = breakdown(repo.languages)[0]?.name || repo.language;
  return `<a class="repo" href="${repo.url}" target="_blank" rel="noopener">
      <span class="repo-name">${REPO_ICON}<b>${esc(repo.name)}</b>${repo.fork ? '<i class="repo-badge">fork</i>' : ''}</span>
      <span class="repo-desc">${esc(note.note || repo.description || '还没有描述')}</span>
      <span class="repo-meta">${lang ? langDot(lang) : ''}<span>${STAR_ICON} ${repo.stars}</span><span>${FORK_ICON} ${repo.forks}</span><span>${fmtDate(repo.pushedAt)}</span></span>
    </a>`;
}

export function study(ctx) {
  const { posts, gh, site, stats, use } = ctx;
  const counts = new Map();
  posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const allTags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const featuredNames = new Set(site.featured.map((f) => f.repo));
  const others = gh.repos.filter((r) => !featuredNames.has(r.name));
  const top = stats.languages.slice(0, 6);
  const body = `${hero(ctx, 'study', {
    kicker: `${esc(site.title)} · 第一卷 · ${new Date().getFullYear()}`,
    title: use('serif', '学习'),
    sub: '写过的文章，做过的项目',
    alt: '铜版画：三本叠放的旧书，最上面搁着一副圆框眼镜，旁边是插着羽毛笔的墨水瓶',
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
    <header class="jsec-head"><h2 id="projects-title">${use('serif', '项目')}</h2><span class="jsec-count">${site.featured.length} 个重点 · 共 ${gh.repos.length} 个仓库</span></header>
    <div class="featured">
    ${site.featured.map((f, i) => featuredItem(ctx, f, i)).join('\n    ')}
    </div>
    <h3 class="repos-title">${use('serif', '其他仓库')}<small>GitHub 上的公开仓库，按最近更新排</small></h3>
    <div class="repo-grid">
    ${others.map((r) => repoCard(ctx, r)).join('\n    ')}
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
    alt: '霓虹灯牌：青色霓虹管勾出一台街机的轮廓，屏幕是一整块品红色的光',
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
const SPREADS = [
  ['daily', '每日一张'],
  ['three', '三张牌阵'],
  ['celtic', '凯尔特十字'],
];

export function trpg(ctx) {
  const { site, use } = ctx;
  const T = site.trpg;
  const tower = ctx.images['tower-trpg'];
  const back = ctx.images['tarot-back'];
  const body = `${hero(ctx, 'trpg', {
    kicker: use('fraktur', 'Tabletop Role-Playing'),
    title: use('xingshu', '跑团'),
    sub: T.systems.map((s) => esc(s.name)).join(' · '),
    alt: '木刻版画：一只巨大的海怪从海里升起，触手缠住一艘红帆的中世纪小帆船，天上一弯新月',
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
    <div class="dice-stage">
      ${tower ? `<img class="dice-tower" src="${tower}" width="640" height="960" alt="木刻的骰塔：方形木塔，塔身上有尖拱小窗，塔底一条出口斜坡" loading="lazy">` : ''}
      <div class="dice-tray"><canvas class="dice-cv" aria-hidden="true"></canvas></div>
    </div>
    <div class="dice-bottom">
      <button type="button" class="btn btn-roll dice-roll" disabled>${use('xingshu', '投')}</button>
      <p class="dice-result" aria-live="polite">点「投」看看今天的手气</p>
    </div>
    ${DICE_MODES.map(([id, , rule], i) => `<p class="dice-rule" data-for="${id}"${i ? ' hidden' : ''}>${esc(rule)}</p>`).join('\n    ')}
    <noscript><p class="dice-rule">需要打开 JavaScript 才能投骰子。</p></noscript>
  </section>

  <section class="sheet tarot" id="tarot" aria-labelledby="tarot-title"${back ? ` style="--tarot-back:url('${back}')"` : ''}>
    <header class="sheet-head">
      <h2 id="tarot-title">${use('xingshu', '塔罗')}</h2>
      <span class="sheet-sub">${use('cinzel', 'Tarot')} · 韦特 78 张 · 带逆位</span>
    </header>
    <div class="seg" role="group" aria-label="牌阵">
      ${SPREADS.map(([id, name], i) => `<button type="button" class="seg-btn" data-spread="${id}" aria-pressed="${i === 0}">${name}</button>`).join('')}
    </div>
    <p class="tarot-desc">一天只抽一张。抽之前不用想问题，抽到什么就是今天的关键词，明天再来。</p>
    <div class="tarot-stage">
      <div class="tarot-spread" data-layout="daily"></div>
    </div>
    <div class="tarot-bottom">
      <button type="button" class="btn btn-draw tarot-draw" disabled>抽一张</button>
      <p class="tarot-status" aria-live="polite">洗牌中……</p>
    </div>
    <ol class="tarot-reading" hidden></ol>
    <p class="tarot-note">${use('xingshu', '正位逆位')}各占一半：正位读左边的关键词，逆位读右边的。牌面是 Pamela Colman Smith 1909 年画的韦特原版。</p>
    <noscript><p class="tarot-note">需要打开 JavaScript 才能抽牌。</p></noscript>
  </section>

  <section class="sheet" id="systems" aria-labelledby="systems-title">
    <header class="sheet-head"><h2 id="systems-title">${use('xingshu', '常玩的规则')}</h2></header>
    <p class="sheet-lead">${esc(T.role)}</p>
    <ul class="systems">
      ${T.systems.map((s) => `<li><b>${esc(s.name)}</b><span class="en">${use('fraktur', esc(s.en))}</span><span class="how">${esc(s.note)}</span></li>`).join('\n      ')}
    </ul>
  </section>
</div>`;
  return layout(ctx, { kind: 'trpg', path: '/trpg/', title: '跑团', description: '跑团骰塔：CoC d100、三角机构 6d4、DnD 多面骰；韦特塔罗 78 张，每日一张、三张牌阵、凯尔特十字。', image: ctx.images['hero-trpg'] }, body);
}

// ---------------------------------------------------------------- 动漫：水墨

export function anime(ctx) {
  const { outcast, sunMoon } = ctx.site.anime;
  const { use } = ctx;
  const body = `${hero(ctx, 'anime', {
    kicker: '海上仙山',
    title: use('brush', '动漫'),
    sub: `${esc(outcast.name)} · ${esc(sunMoon.name)}`,
    alt: '水墨画：一座陡峭的海上仙山，峰顶一座小楼阁，三只仙鹤从山前飞过，天上一轮朱砂红的太阳',
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
    <p class="site-note">「${esc(site.title)}」是我的个人主页，四个展厅四种画风：学习是学术风，游戏房是赛博朋克，跑团是中世纪加克苏鲁，动漫是水墨。每个展厅的版画插图是让 GPT 按木刻、铜版、水墨的路子画的；跑团里的骰子是代码现算现画的 3D 多面体，塔罗用的是 1909 年的韦特原版牌面；右下角的像素以撒是用代码一个像素一个像素画的。网站没有用框架，一个零依赖的 Node 脚本把 Markdown 文章和 GitHub 数据生成成静态页面，推到 GitHub 后自动部署到 Cloudflare Pages。源码在 <a href="https://github.com/${site.github}/home" target="_blank" rel="noopener">${site.github}/home</a>。</p>
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
