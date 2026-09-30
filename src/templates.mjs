// 页面模板：全部是返回 HTML 字符串的函数，没有模板引擎。
import { esc } from './markdown.mjs';

const pad = (n, w = 2) => String(n).padStart(w, '0');
export const fmtDate = (d) => new Date(new Date(d).getTime() + 8 * 3600e3).toISOString().slice(0, 10);

const LANG_COLORS = {
  Go: '#00f0ff', Java: '#ff9e3d', Vue: '#05ffa1', TypeScript: '#4d8dff', JavaScript: '#fcee0a',
  Python: '#b967ff', CSS: '#ff2a6d', HTML: '#ff6b3d', Dockerfile: '#7aa2c9', Shell: '#9dff6a',
};
export const langColor = (name) => LANG_COLORS[name] || '#8a94b8';

export function breakdown(languages = {}) {
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(languages)
    .map(([name, bytes]) => ({ name, bytes, pct: (bytes / total) * 100 }))
    .sort((a, b) => b.bytes - a.bytes);
}

// 在首屏渲染前执行：标记 JS 可用、恢复主题色 / 雨幕开关、决定是否播放开机动画
const HEAD_SCRIPT =
  "(function(h){h.classList.add('js');try{var a=localStorage.getItem('accent');if(a)h.dataset.accent=a;" +
  "if(localStorage.getItem('rain')==='off')h.classList.add('no-rain');" +
  "if(!sessionStorage.getItem('booted')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)h.classList.add('booting')}catch(e){}})(document.documentElement)";

const NAV = [
  ['home', '/', '首页', 'HOME'],
  ['posts', '/posts/', '文章', 'LOGS'],
  ['projects', '/projects/', '项目', 'REPOS'],
  ['about', '/about/', '关于', 'ID'],
];

function layout(ctx, page, body) {
  const { site, assets } = ctx;
  const url = site.url + page.path;
  const title = page.title ? `${page.title} · ${site.title}` : `${site.title} · ${site.tagline}`;
  const desc = page.description || site.description;
  return `<!doctype html>
<html lang="zh-CN" data-page="${page.kind}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(site.author)}">
<meta name="theme-color" content="#05060d">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/rss.xml">
<meta property="og:type" content="${page.kind === 'post' ? 'article' : 'website'}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(page.title || site.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}/assets/img/avatar.jpg">
<meta name="twitter:card" content="summary">
<link rel="preload" href="/assets/fonts/orbitron.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/share-tech-mono.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/main.css?v=${assets.css}">
<script>${HEAD_SCRIPT}</script>
<script src="/assets/js/main.js?v=${assets.js}" data-term="/assets/js/terminal.js?v=${assets.term}" defer></script>
</head>
<body>
<a class="skip-link" href="#main">跳到正文</a>
<canvas class="rain" id="rain" aria-hidden="true"></canvas>
<div class="crt" aria-hidden="true"></div>
<div class="boot" aria-hidden="true">
  <div class="boot-box">
    <p class="boot-logo glitch" data-text="RICHZDS">RICHZDS</p>
    <pre class="boot-log"></pre>
    <div class="boot-bar"><i></i></div>
    <p class="boot-skip">PRESS ANY KEY TO SKIP</p>
  </div>
</div>
${page.kind === 'post' ? '<div class="read-progress" aria-hidden="true"><i></i></div>\n' : ''}${header(ctx, page)}
<main id="main" class="main">
${body}
</main>
${footer(ctx)}
</body>
</html>
`;
}

function header(ctx, page) {
  const links = NAV.map(
    ([key, href, zh, en]) =>
      `<a href="${href}"${page.nav === key ? ' aria-current="page"' : ''}><span class="nav-en">${en}</span>${zh}</a>`,
  ).join('');
  return `<header class="topbar">
  <div class="container topbar-inner">
    <a class="logo" href="/" aria-label="${esc(ctx.site.title)} 首页">
      <span class="logo-mark" aria-hidden="true"></span><span class="logo-text">RICHZDS</span><span class="logo-sub">//NET</span>
    </a>
    <nav class="nav" aria-label="主导航">${links}</nav>
    <button class="term-btn" type="button" data-term-open title="打开终端（快捷键 \` 或 Ctrl+K）" aria-label="打开终端"><span aria-hidden="true">&gt;_</span></button>
  </div>
</header>`;
}

function footer(ctx) {
  const { site, gh } = ctx;
  return `<footer class="footer">
  <div class="container footer-inner">
    <div class="footer-brand">
      <p class="footer-logo">RICHZDS<span>//</span>NET</p>
      <p class="footer-bio">${esc(gh.profile.name)} · ${esc(gh.profile.bio)}</p>
    </div>
    <div class="footer-status mono">
      <p><span class="status-dot"></span>SYSTEM ONLINE</p>
      <p>UPTIME <span data-uptime="${esc(site.since)}">--</span></p>
    </div>
    <nav class="footer-links mono" aria-label="站外链接">
      <a href="${gh.profile.url}" target="_blank" rel="noopener">GITHUB ↗</a>
      <a href="/rss.xml">RSS</a>
      <button type="button" data-term-open>TERMINAL &gt;_</button>
    </nav>
  </div>
  <p class="container footer-copy mono">© ${new Date().getFullYear()} ${esc(site.github)} · 零依赖静态生成 · 托管于 Cloudflare Pages</p>
</footer>`;
}

// ---------------------------------------------------------------- 组件

function sectionHead(zh, en, href, more) {
  return `<header class="section-head">
  <h2 class="section-title"><span class="section-en mono">${en}</span><span data-decrypt>${zh}</span></h2>
  ${href ? `<a class="section-more mono" href="${href}">${more} →</a>` : ''}
</header>`;
}

function tags(list, max = 99) {
  return list
    .slice(0, max)
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join('');
}

function tagLinks(list) {
  return list
    .map((t) => `<a class="tag" href="/posts/?tag=${encodeURIComponent(t.toLowerCase())}">${esc(t)}</a>`)
    .join('');
}

function postCard(p, i = 0) {
  return `<article class="card post-card reveal" style="--d:${i * 70}ms">
  <div class="card-shape"><div class="card-body">
    <div class="card-top mono"><span class="card-idx">LOG#${pad(p.index)}</span><time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time><span>${p.minutes} MIN</span></div>
    <h3 class="card-title"><a href="${p.url}">${esc(p.title)}</a></h3>
    <p class="card-text">${esc(p.summary)}</p>
    <div class="card-tags">${tags(p.tags, 4)}</div>
  </div></div>
</article>`;
}

function repoNote(ctx, repo) {
  return ctx.site.repoNotes[repo.name] || {};
}

function repoCard(ctx, repo, i = 0) {
  const note = repoNote(ctx, repo);
  const langs = breakdown(repo.languages);
  const bar = langs.length
    ? langs.map((l) => `<i style="width:${l.pct.toFixed(2)}%;background:${langColor(l.name)}"></i>`).join('')
    : `<i style="width:100%;background:${langColor(repo.language)}"></i>`;
  const langLabel = langs.length
    ? langs.slice(0, 3).map((l) => `<span><b style="--c:${langColor(l.name)}"></b>${esc(l.name)}</span>`).join('')
    : repo.language
      ? `<span><b style="--c:${langColor(repo.language)}"></b>${esc(repo.language)}</span>`
      : '<span><b style="--c:#8a94b8"></b>资料</span>';
  const hasPost = note.post && ctx.posts.some((p) => p.slug === note.post);
  return `<article class="card repo-card reveal" style="--d:${i * 70}ms">
  <div class="card-shape"><div class="card-body">
    <div class="repo-head">
      <span class="repo-icon" aria-hidden="true"></span>
      <h3 class="card-title"><a href="${repo.url}" target="_blank" rel="noopener">${esc(repo.name)}</a></h3>
      ${repo.fork ? '<span class="badge">FORK</span>' : ''}
    </div>
    <p class="card-text">${esc(note.note || repo.description || '暂无描述')}</p>
    <div class="lang-bar" aria-hidden="true">${bar}</div>
    <div class="repo-meta mono">${langLabel}<span>★ ${repo.stars}</span><span>${fmtDate(repo.pushedAt)}</span></div>
    ${hasPost ? `<a class="repo-post mono" href="/posts/${note.post}/">阅读档案 →</a>` : ''}
  </div></div>
</article>`;
}

function langPanel(ctx) {
  const { stats, site } = ctx;
  const top = stats.languages.slice(0, 7);
  return `<div class="lang-panel reveal">
  <div class="lang-stack" aria-hidden="true">${top
    .map((l) => `<i style="flex-basis:${l.pct.toFixed(2)}%;background:${langColor(l.name)}"></i>`)
    .join('')}</div>
  <ul class="lang-list">${top
    .map(
      (l) =>
        `<li style="--c:${langColor(l.name)};--w:${l.pct.toFixed(2)}%"><span class="lang-name">${esc(l.name)}</span><span class="lang-meter"><i></i></span><span class="lang-pct mono">${l.pct.toFixed(1)}%</span></li>`,
    )
    .join('')}</ul>
  <p class="lang-note mono">// 统计自 ${stats.ownRepos} 个非 fork 仓库，共 ${(stats.totalBytes / 1024).toFixed(0)} KB 源码</p>
  <div class="chips">${site.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
</div>`;
}

function pageHead(crumb, cmd, title, desc) {
  return `<section class="container page-head">
  <p class="crumb mono">${crumb} <span class="dim">$ ${cmd}</span></p>
  <h1 class="page-title" data-decrypt>${esc(title)}</h1>
  ${desc ? `<p class="page-desc">${desc}</p>` : ''}
</section>`;
}

// ---------------------------------------------------------------- 页面

export function home(ctx) {
  const { site, gh, posts, stats } = ctx;
  const p = gh.profile;
  const featured = site.featured.map((n) => gh.repos.find((r) => r.name === n)).filter(Boolean);
  const body = `<section class="hero">
  <div class="hero-bg" aria-hidden="true">
    <div class="hero-moon"></div>
    <img class="skyline skyline-far" src="/assets/img/skyline-far.svg" alt="" width="1600" height="320">
    <img class="skyline skyline-near" src="/assets/img/skyline-near.svg" alt="" width="1600" height="260">
    <div class="neon-sign"><span>模</span><span>块</span><span>化</span></div>
    <div class="grid-floor"></div>
    <div class="hero-fog"></div>
  </div>
  <div class="container hero-inner">
    <div class="hero-copy">
      <p class="hud-label mono"><span class="hud-dot"></span>NEURAL LINK ESTABLISHED <span class="dim">// NODE: CF-EDGE</span></p>
      <h1 class="hero-title glitch" data-text="RICHZDS">RICHZDS</h1>
      <p class="hero-sub">${esc(p.name)}<span class="sep">/</span>${esc(p.bio)}</p>
      <p class="typer-line mono"><span class="prompt">guest@richzds:~$</span> <span class="typer" data-typer="${esc(JSON.stringify(site.typer))}">${esc(site.typer[0])}</span><span class="caret" aria-hidden="true"></span></p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/posts/"><span>进入档案</span><small>ENTER</small></a>
        <a class="btn btn-ghost" href="${p.url}" target="_blank" rel="noopener"><span>GitHub</span><small>↗</small></a>
      </div>
    </div>
    <div class="id-card" aria-hidden="true">
      <div class="id-orbit"><i></i><i></i><i></i></div>
      <div class="id-photo"><img src="/assets/img/avatar.jpg" alt="" width="220" height="220"><i class="id-scan"></i></div>
      <p class="id-tag mono">ID#${esc(String(ctx.gh.profile.login).toUpperCase())} <span>// NETRUNNER</span></p>
    </div>
  </div>
  <a class="scroll-hint mono" href="#latest">SCROLL<span aria-hidden="true">▼</span></a>
</section>

<section class="container stats" aria-label="数据面板">
  <div class="stat reveal"><span class="stat-num" data-count="${p.publicRepos}">${p.publicRepos}</span><span class="stat-label">公开仓库</span><span class="stat-en mono">PUBLIC_REPOS</span></div>
  <div class="stat reveal" style="--d:80ms"><span class="stat-num" data-count="${Math.round(stats.totalBytes / 1024)}">${Math.round(stats.totalBytes / 1024)}</span><span class="stat-unit mono">KB</span><span class="stat-label">源码体积</span><span class="stat-en mono">SOURCE_SIZE</span></div>
  <div class="stat reveal" style="--d:160ms"><span class="stat-num" data-count="${posts.length}">${posts.length}</span><span class="stat-label">篇档案</span><span class="stat-en mono">LOGS</span></div>
  <div class="stat reveal" style="--d:240ms"><span class="stat-num">${p.createdAt.slice(0, 4)}</span><span class="stat-label">接入 GitHub</span><span class="stat-en mono">LINKED_SINCE</span></div>
</section>

<section class="container section" id="latest">
  ${sectionHead('最新档案', 'LATEST_LOGS', '/posts/', '全部文章')}
  <div class="post-grid">${posts.slice(0, 6).map(postCard).join('\n')}</div>
</section>

<section class="container section">
  ${sectionHead('项目矩阵', 'PROJECT_MATRIX', '/projects/', '全部项目')}
  <div class="repo-grid">${featured.map((r, i) => repoCard(ctx, r, i)).join('\n')}</div>
</section>

<section class="container section">
  ${sectionHead('技能芯片', 'CYBERWARE')}
  ${langPanel(ctx)}
</section>`;
  return layout(ctx, { kind: 'home', nav: 'home', path: '/' }, body);
}

export function postsIndex(ctx) {
  const { posts } = ctx;
  const counts = new Map();
  posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const allTags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const years = new Map();
  posts.forEach((p) => {
    const y = fmtDate(p.date).slice(0, 4);
    if (!years.has(y)) years.set(y, []);
    years.get(y).push(p);
  });
  const groups = [...years]
    .map(
      ([year, list]) => `<section class="year-group">
  <h2 class="year mono">${year}<span>// ${pad(list.length)} LOGS</span></h2>
  <ol class="log-list">${list
    .map(
      (p) => `<li class="log-item reveal" data-tags="${esc(p.tags.join('|').toLowerCase())}" data-text="${esc(`${p.title} ${p.summary}`.toLowerCase())}">
    <a href="${p.url}">
      <span class="log-idx mono">#${pad(p.index)}</span>
      <time class="log-date mono" datetime="${p.date.toISOString()}">${fmtDate(p.date).slice(5)}</time>
      <span class="log-main"><span class="log-title">${esc(p.title)}</span><span class="log-sum">${esc(p.summary)}</span></span>
      <span class="log-tags mono">${p.tags.slice(0, 3).map((t) => `#${esc(t)}`).join(' ')}</span>
    </a>
  </li>`,
    )
    .join('\n')}</ol>
</section>`,
    )
    .join('\n');

  const body = `${pageHead('~/posts', 'ls -la', '档案库', `共 ${posts.length} 篇：项目拆解、学习笔记和折腾记录`)}
<section class="container filter-bar">
  <label class="search mono"><span>grep</span><input type="search" placeholder="搜索标题、摘要、标签…" autocomplete="off" data-filter-input></label>
  <div class="chips" role="group" aria-label="按标签筛选">
    <button type="button" class="chip is-on" data-tag="">全部<sup>${posts.length}</sup></button>
    ${allTags
      .map(([t, n], i) => `<button type="button" class="chip${i >= 10 ? ' chip-extra' : ''}" data-tag="${esc(t.toLowerCase())}">${esc(t)}<sup>${n}</sup></button>`)
      .join('')}
    ${allTags.length > 10 ? `<button type="button" class="chip chip-more" data-more>更多 +${allTags.length - 10}</button>` : ''}
  </div>
</section>
<section class="container archive">
${groups}
<p class="empty mono" hidden>[ 0 RESULTS ] 没有匹配的档案，换个关键词试试</p>
</section>`;
  return layout(ctx, { kind: 'posts', nav: 'posts', path: '/posts/', title: '档案库', description: `RichZDS 的全部文章，共 ${posts.length} 篇。` }, body);
}

export function post(ctx, p, older, newer) {
  const repo = p.repo && ctx.gh.repos.find((r) => r.name === p.repo);
  const toc =
    p.headings.length >= 3
      ? `<aside class="toc" aria-label="本文目录">
    <p class="toc-title mono">// INDEX</p>
    <ol>${p.headings.map((h) => `<li class="lv${h.level}"><a href="#${h.id}">${h.html}</a></li>`).join('')}</ol>
  </aside>`
      : '';
  const navLink = (item, dir, label) =>
    item
      ? `<a class="post-nav-${dir}" href="${item.url}"><span class="mono">${label}</span>${esc(item.title)}</a>`
      : '<span></span>';
  const body = `<article class="post">
  <header class="container post-head">
    <p class="crumb mono"><a href="/posts/">~/posts</a>/${esc(p.slug)}</p>
    <h1 class="post-title" data-decrypt>${esc(p.title)}</h1>
    <div class="post-meta mono">
      <span class="accent">LOG#${pad(p.index)}</span>
      <time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time>
      <span>${p.minutes} MIN READ</span>
      ${p.period ? `<span>PROJECT ${esc(p.period)}</span>` : ''}
      ${repo ? `<a href="${repo.url}" target="_blank" rel="noopener">REPO ↗ ${esc(repo.name)}</a>` : ''}
    </div>
    <div class="post-tags">${tagLinks(p.tags)}</div>
  </header>
  <div class="container post-layout${toc ? ' has-toc' : ''}">
    <div class="prose">
${p.html}
    </div>
    ${toc}
  </div>
  <nav class="container post-nav" aria-label="上一篇和下一篇">
    ${navLink(newer, 'newer', '← NEWER')}
    ${navLink(older, 'older', 'OLDER →')}
  </nav>
</article>`;
  return layout(ctx, { kind: 'post', nav: 'posts', path: p.url, title: p.title, description: p.summary }, body);
}

export function projects(ctx) {
  const { gh } = ctx;
  const repos = [...gh.repos].sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt));
  const own = repos.filter((r) => !r.fork).length;
  const body = `${pageHead('~/projects', 'git remote -v', '项目矩阵', `${repos.length} 个公开仓库，其中 ${own} 个原创、${repos.length - own} 个 fork，按最近推送排序`)}
<section class="container">
  <div class="repo-grid repo-grid-all">${repos.map((r, i) => repoCard(ctx, r, i % 4)).join('\n')}</div>
</section>`;
  return layout(ctx, { kind: 'projects', nav: 'projects', path: '/projects/', title: '项目矩阵', description: 'RichZDS 在 GitHub 上的公开项目。' }, body);
}

export function about(ctx) {
  const { gh, site, posts } = ctx;
  const p = gh.profile;
  const timeline = [
    ...gh.repos.map((r) => ({
      date: r.createdAt,
      title: r.name,
      text: (repoNote(ctx, r).note || r.description || '').split('：')[0],
      href: r.url,
      fork: r.fork,
    })),
    { date: site.since, title: 'RICHZDS//NET', text: '这个博客上线', href: '/' },
  ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const body = `${pageHead('~/about', 'cat dossier.txt', '身份档案', '')}
<section class="container dossier">
  <div class="dossier-card reveal">
    <div class="dossier-photo"><img src="/assets/img/avatar.jpg" alt="${esc(p.name)} 的 GitHub 头像" width="240" height="240"><i class="id-scan"></i></div>
    <dl class="dossier-fields mono">
      <div><dt>HANDLE</dt><dd>${esc(p.login)}</dd></div>
      <div><dt>ALIAS</dt><dd>${esc(p.name)}</dd></div>
      <div><dt>CLASS</dt><dd>NETRUNNER / 全栈学徒</dd></div>
      <div><dt>LINKED</dt><dd>${fmtDate(p.createdAt)}</dd></div>
      <div><dt>REPOS</dt><dd>${p.publicRepos} PUBLIC</dd></div>
      <div><dt>LOGS</dt><dd>${posts.length} POSTS</dd></div>
      <div><dt>STATUS</dt><dd class="ok">● ONLINE</dd></div>
    </dl>
  </div>
  <div class="dossier-main">
    <section class="panel reveal">
      <h2 class="panel-title"><span class="mono">SELF_REPORT</span>自述</h2>
      <p class="bio-quote">「${esc(p.bio)}」</p>
      <p>这里是 ${esc(p.login)} 的个人站点。GitHub 签名写着「${esc(p.bio)}」，所以这里的文章也尽量按模块拆开讲：接口怎么定、分层怎么切、数据怎么流，再加上踩过的坑。</p>
      <p>仓库里能看到的方向：Go 后端（GoFrame、并发与锁）、Java 后端（Spring Boot、MyBatis-Plus）、Vue / React 前端，以及接大模型的 AI 应用；另外还给《三角机构》TRPG 搭了一个社区论坛。</p>
    </section>
    <section class="panel reveal">
      <h2 class="panel-title"><span class="mono">CYBERWARE</span>技能植入</h2>
      ${langPanel(ctx)}
    </section>
    <section class="panel reveal">
      <h2 class="panel-title"><span class="mono">MISSION_LOG</span>任务日志</h2>
      <ol class="timeline">${timeline
        .map(
          (t) => `<li class="reveal"><time class="mono">${fmtDate(t.date).slice(0, 7).replace('-', '.')}</time><div><a href="${t.href}"${t.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(t.title)}</a>${t.fork ? ' <span class="badge">FORK</span>' : ''}<p>${esc(t.text)}</p></div></li>`,
        )
        .join('')}</ol>
    </section>
    <section class="panel reveal">
      <h2 class="panel-title"><span class="mono">CONTACT</span>联络频段</h2>
      <ul class="contact mono">
        <li><span>GITHUB</span><a href="${p.url}" target="_blank" rel="noopener">github.com/${esc(p.login)}</a></li>
        <li><span>RSS</span><a href="/rss.xml">${esc(site.url.replace(/^https?:\/\//, ''))}/rss.xml</a></li>
        <li><span>TERMINAL</span><button type="button" data-term-open>按 \` 键打开站内终端</button></li>
      </ul>
    </section>
  </div>
</section>`;
  return layout(ctx, { kind: 'about', nav: 'about', path: '/about/', title: '身份档案', description: `${p.name}（${p.login}）的个人档案。` }, body);
}

export function notFound(ctx) {
  const body = `<section class="container notfound">
  <p class="hud-label mono"><span class="hud-dot is-red"></span>CONNECTION LOST</p>
  <h1 class="nf-code glitch" data-text="404">404</h1>
  <p class="nf-title">信号丢失：目标节点不存在</p>
  <pre class="nf-log mono">&gt; traceroute $REQUEST_PATH
  1  cf-edge         2ms
  2  richzds.core    4ms
  3  * * *           ICE 拦截
&gt; 可能原因：链接已失效 / 地址输错 / 文章被移走了</pre>
  <div class="hero-cta">
    <a class="btn btn-primary" href="/"><span>返回主节点</span><small>HOME</small></a>
    <a class="btn btn-ghost" href="/posts/"><span>浏览档案</span><small>LOGS</small></a>
  </div>
</section>`;
  return layout(ctx, { kind: 'notfound', nav: '', path: '/404', title: '404 信号丢失' }, body);
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
<title>${esc(site.title)} · ${esc(site.tagline)}</title>
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
  const urls = [
    ['/', today],
    ['/posts/', today],
    ['/projects/', today],
    ['/about/', today],
    ...posts.map((p) => [p.url, fmtDate(p.updated || p.date)]),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `<url><loc>${site.url}${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}
</urlset>
`;
}

export function searchIndex(ctx) {
  const { posts, gh, site } = ctx;
  return {
    user: { login: gh.profile.login, name: gh.profile.name, bio: gh.profile.bio, url: gh.profile.url },
    posts: posts.map((p) => ({
      n: p.index,
      slug: p.slug,
      url: p.url,
      title: p.title,
      date: fmtDate(p.date),
      tags: p.tags,
      summary: p.summary,
    })),
    repos: gh.repos.map((r) => ({
      name: r.name,
      url: r.url,
      lang: r.language,
      stars: r.stars,
      fork: r.fork,
      note: repoNote(ctx, r).note || r.description,
    })),
    langs: ctx.stats.languages.slice(0, 6).map((l) => [l.name, +l.pct.toFixed(1)]),
    since: site.since,
  };
}
