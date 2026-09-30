// 页面模板：全部是返回 HTML 字符串的函数，没有模板引擎。
// 整个网站是一层以撒风格的地下室：首页是起始房，每个主题是一个房间。
import { esc } from './markdown.mjs';
import { ROOMS, LAYOUT, solids } from './pixel/rooms.mjs';
import { DOOR_RECT } from './pixel/art.mjs';

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

// 首屏渲染前执行：标记 JS 可用；记下从哪扇门进来的（决定转场方向和以撒出现的位置）；决定要不要播开场
const HEAD_SCRIPT =
  "(function(h){h.classList.add('js');try{var s=sessionStorage,d=s.getItem('utopia.door');" +
  "if(d){h.dataset.door=d;s.removeItem('utopia.door')}" +
  "if(h.dataset.page==='home'&&!d&&!s.getItem('utopia.intro')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)h.classList.add('intro')" +
  '}catch(e){}' +
  // 快速连点时转场会被浏览器跳过，吞掉它的 promise，免得控制台报错
  "function q(e){var v=e.viewTransition,n=function(){};if(v){v.ready.catch(n);v.finished.catch(n);v.updateCallbackDone&&v.updateCallbackDone.catch(n)}}" +
  "addEventListener('pagereveal',q);addEventListener('pageswap',q)" +
  '})(document.documentElement)';

const DIR_ZH = { up: '往上', down: '往下', left: '往左', right: '往右' };

// ---------------------------------------------------------------- 框架

function layout(ctx, page, body) {
  const { site, assets, px } = ctx;
  const url = site.url + page.path;
  const title = page.title ? `${page.title} · ${site.title}` : `${site.title} · ${site.author}的地下室`;
  const desc = page.description || site.description;
  return `<!doctype html>
<html lang="zh-CN" data-page="${page.kind}" data-room="${page.room || ''}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(site.author)}">
<meta name="theme-color" content="#140c0a">
<meta name="color-scheme" content="dark">
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
<style>@font-face{font-family:"Fusion Pixel";src:url(__PIXEL_FONT__) format("woff2");font-display:swap}${px.css}</style>
<link rel="stylesheet" href="/assets/css/main.css?v=${assets.css}">
<script>${HEAD_SCRIPT}</script>
<script type="module" src="/assets/js/main.js?v=${assets.js}" id="main-js" data-stage="/assets/js/stage.js?v=${assets.stage}" data-sheet="${px.urls['assets/px/sheet.png']}"></script>
</head>
<body>
<a class="skip-link" href="#main">跳到正文</a>
${minimap(ctx, page.room)}
${page.kind === 'post' ? '<div class="read-progress" aria-hidden="true"><i></i></div>\n' : ''}<main id="main" class="main">
${body}
</main>
${footer(ctx)}
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

function minimap(ctx, current) {
  const cells = Object.entries(ROOMS)
    .map(([id, r]) => {
      const style = `--c:${r.cell[0]};--r:${r.cell[1]}`;
      const inner = r.icon ? icon(r.icon) : '';
      const here = id === current;
      if (!r.ready) return `<span class="mm-room is-locked" data-room="${id}" style="${style}" title="${r.name} · 施工中">${inner}<span class="sr-only">${r.name}（施工中）</span></span>`;
      return `<a class="mm-room${here ? ' is-here' : ''}" data-room="${id}" href="${r.path}" style="${style}"${here ? ' aria-current="page"' : ''} title="${r.name}">${inner}<span class="sr-only">${r.name}</span></a>`;
    })
    .join('');
  return `<nav class="minimap" aria-label="楼层地图">
  <div class="mm-grid">${cells}</div>
  <a class="mm-name" href="/">${esc(ctx.site.title)}</a>
</nav>`;
}

function footer(ctx) {
  const { site } = ctx;
  return `<footer class="footer">
  <p class="footer-links">
    <a href="https://github.com/${site.github}" target="_blank" rel="noopener">GitHub</a>
    <a href="${site.bilibili.url}" target="_blank" rel="noopener">B 站 · ${esc(site.bilibili.name)}</a>
    <a href="/rss.xml">RSS</a>
  </p>
  <p class="footer-note">© ${new Date().getFullYear()} ${esc(site.author)} · ${esc(site.title)}。以撒的结合同人风格，像素画全部用代码自己画的 · 像素字体 <a href="https://github.com/TakWolf/fusion-pixel-font" target="_blank" rel="noopener">Fusion Pixel</a>（OFL）</p>
</footer>`;
}

// ---------------------------------------------------------------- 舞台（房间）

function pos(x, y, w, h) {
  return `--x:${x};--y:${y}${w != null ? `;--w:${w};--h:${h}` : ''}`;
}

function doors(id) {
  return Object.entries(ROOMS[id].doors)
    .map(([dir, target]) => {
      const t = ROOMS[target];
      const r = DOOR_RECT[dir];
      const style = pos(r.x, r.y, r.w, r.h);
      if (!t.ready)
        return `<button class="door is-locked" type="button" data-dir="${dir}" style="${style}" aria-label="${DIR_ZH[dir]}：${t.name}（施工中）"><span class="tip">${t.name} · 施工中</span></button>`;
      return `<a class="door" data-dir="${dir}" data-room="${target}" href="${t.path}" style="${style}" aria-label="${DIR_ZH[dir]}：${t.name}"><span class="tip">${t.name}</span></a>`;
    })
    .join('\n    ');
}

function hud() {
  return `<div class="hud" aria-hidden="true">
      <span class="hud-hearts">${icon('heart')}${icon('heart')}${icon('heart')}</span>
      <span class="hud-row">${icon('coin')}<b data-hud="coins">00</b></span>
      <span class="hud-row">${icon('bomb')}<b data-hud="bombs">01</b></span>
      <span class="hud-row">${icon('key')}<b data-hud="keys">00</b></span>
    </div>`;
}

function stage(ctx, id, overlay, alt) {
  const room = ROOMS[id];
  const L = LAYOUT[id];
  const data = {
    id,
    spawn: L.spawn,
    entities: L.entities ?? [],
    solids: solids(id),
    portrait: L.portrait ?? null,
    doors: Object.entries(room.doors).map(([dir, target]) => ({ dir, href: ROOMS[target].path, locked: !ROOMS[target].ready, name: ROOMS[target].name })),
  };
  return `<section class="stage" data-room="${id}" aria-label="${room.name}">
  <div class="stage-box">
    <img class="stage-bg" src="${ctx.px.urls[`assets/px/room-${id}.png`]}" width="240" height="160" alt="${esc(alt)}">
    <canvas class="stage-cv" width="240" height="160" aria-hidden="true"></canvas>
    ${doors(id)}
    ${overlay}
    ${hud()}
    <div class="floor-banner" aria-hidden="true"><span>${esc(ctx.site.title)}</span></div>
  </div>
  <script type="application/json" class="stage-data">${JSON.stringify(data)}</script>
</section>`;
}

// ---------------------------------------------------------------- 首页：起始房

export function home(ctx) {
  const { site } = ctx;
  const L = LAYOUT.start;
  const overlay = `<p class="chalk chalk-big" style="${pos(120, 40)}">${esc(site.intro.name)}</p>
    ${site.intro.lines.map((l, i) => `<p class="chalk" style="${pos(120, 57 + i * 9)}">${esc(l)}</p>`).join('\n    ')}
    <p class="chalk chalk-hint keys-only" style="${pos(50, 121)}">移动</p>
    <p class="chalk chalk-hint keys-only" style="${pos(190, 121)}">眼泪</p>
    <p class="chalk chalk-hint touch-only" style="${pos(120, 134)}">点地面走路 · 点门进房间</p>
    <p class="plaque-text" style="${pos(L.plaque.x + L.plaque.w / 2, L.plaque.y + 3)}">${esc(site.title)}</p>
    <span class="portrait" style="${pos(L.portrait.x, L.portrait.y, L.portrait.w, L.portrait.h)}" title="头像：日月同错 · 海山"></span>`;

  const guide = Object.entries(ROOMS)
    .filter(([id]) => id !== 'start')
    .map(([id, r]) => {
      const desc = {
        library: '文章 · 项目 · 经历',
        dice: '3D 骰塔：CoC · 三角机构 · DnD',
        planetarium: '韦特塔罗：每日一张 · 三张牌阵 · 凯尔特十字',
        games: '以撒的结合 · 黎明杀机',
        shop: 'B 站 · GitHub',
        penglai: '一人之下 · 日月同错',
      }[id];
      const inner = `${icon(r.icon)}<b>${r.name}</b><span>${desc}</span>`;
      return r.ready
        ? `<li><a class="guide-item" href="${r.path}" data-room="${id}">${inner}</a></li>`
        : `<li><span class="guide-item is-locked">${inner}<em>施工中</em></span></li>`;
    })
    .join('\n    ');

  const body = `<h1 class="sr-only">${esc(site.title)} · ${esc(site.author)}的个人主页</h1>
${stage(ctx, 'start', overlay, `起始房：石墙地下室，地上用粉笔写着「${site.intro.name}」，四面各有一扇门`)}
<section class="guide" aria-labelledby="guide-title">
  <h2 class="guide-title" id="guide-title">楼层导览</h2>
  <ul class="guide-list">
    ${guide}
  </ul>
</section>`;
  return layout(ctx, { kind: 'home', room: 'start', path: '/' }, body);
}

// ---------------------------------------------------------------- 图书馆

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

function repoNote(ctx, repo) {
  return ctx.site.repoNotes[repo.name] || {};
}

function repoCard(ctx, repo) {
  const note = repoNote(ctx, repo);
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

function timeline(ctx) {
  const items = ctx.site.timeline;
  return items
    .map((t, i) => {
      const last = i === items.length - 1;
      return `<li class="floor${last ? ' is-here' : ''}" data-kind="${t.kind}">
      <span class="floor-no">${i + 1}</span>
      <span class="floor-main">
        <b class="floor-name">${esc(t.name)}</b>${t.role ? `<span class="floor-role">${esc(t.role)}</span>` : ''}${t.period ? `<span class="floor-period">${esc(t.period)}</span>` : ''}
      </span>
      ${last ? `<span class="floor-you">${icon('isaac.face')}<em>你在这里</em></span>` : ''}
    </li>`;
    })
    .join('\n    ');
}

export function library(ctx) {
  const { posts, gh, site, stats } = ctx;
  const counts = new Map();
  posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const allTags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const featured = site.featured.map((n) => gh.repos.find((r) => r.name === n)).filter(Boolean);
  const L = LAYOUT.library;
  const labels = [
    ['posts', '文章', `${posts.length} 篇`],
    ['projects', '项目', `${featured.length} 个`],
    ['timeline', '经历', `${site.timeline.length} 层`],
  ];
  const overlay = L.shelves
    .map((s, i) => {
      const [id, name, count] = labels[i];
      const p = L.plaques[i];
      return `<a class="shelf-hot" href="#${id}" style="${pos(s.x, s.y, s.w, s.h)}" aria-label="${name}书架（${count}）"><span class="tip">${name} · ${count}</span></a>
    <p class="plaque-text" style="${pos(p.x + p.w / 2, p.y + 1)}">${name}</p>`;
    })
    .join('\n    ');

  const top = stats.languages.slice(0, 6);
  const body = `<h1 class="sr-only">图书馆</h1>
${stage(ctx, 'library', overlay, '图书馆：三排摆满书的书架、红色地毯和四根蜡烛')}
<div class="library">
  <section class="sheet" id="posts" aria-labelledby="posts-title">
    <header class="sheet-head">${icon('icon.book')}<h2 id="posts-title">文章</h2><span class="sheet-count">${posts.length} 篇</span></header>
    <div class="book-tools">
      <label class="search"><span class="sr-only">搜索文章</span><input type="search" placeholder="搜标题、摘要、标签……" autocomplete="off" data-filter-input></label>
      <div class="tag-row" role="group" aria-label="按标签筛选">
        ${tagChip('', posts.length, true)}${allTags.map(([t, n], i) => tagChip(t, n, false, i >= TAGS_SHOWN)).join('')}${allTags.length > TAGS_SHOWN ? `<button type="button" class="tag tag-more" data-more>更多 +${allTags.length - TAGS_SHOWN}</button>` : ''}
      </div>
    </div>
    <ol class="books">
    ${posts.map(bookItem).join('\n    ')}
    </ol>
    <p class="empty" hidden>书架上没有这本……换个词试试</p>
  </section>

  <section class="sheet" id="projects" aria-labelledby="projects-title">
    <header class="sheet-head">${icon('icon.crown')}<h2 id="projects-title">项目</h2><span class="sheet-count">${featured.length} / ${gh.repos.length}</span></header>
    <div class="repos">
    ${featured.map((r) => repoCard(ctx, r)).join('\n    ')}
    </div>
    <div class="langs">
      <div class="lang-stack" aria-hidden="true">${top.map((l) => `<i style="flex-basis:${l.pct.toFixed(2)}%;background:${langColor(l.name)}"></i>`).join('')}</div>
      <p class="lang-legend">${top.map((l) => `<span><b style="--c:${langColor(l.name)}"></b>${esc(l.name)} ${l.pct.toFixed(1)}%</span>`).join('')}</p>
      <p class="lang-note">统计自 ${stats.ownRepos} 个非 fork 仓库 · <a href="https://github.com/${site.github}?tab=repositories" target="_blank" rel="noopener">全部仓库 →</a></p>
      <p class="stack">${site.stack.map((s) => `<span class="tag tag-sm">${esc(s)}</span>`).join('')}</p>
    </div>
  </section>

  <section class="sheet" id="timeline" aria-labelledby="timeline-title">
    <header class="sheet-head">${icon('icon.skull')}<h2 id="timeline-title">经历</h2><span class="sheet-count">一局以撒，一层一层往下走</span></header>
    <ol class="floors">
    ${timeline(ctx)}
    </ol>
  </section>
</div>`;
  return layout(ctx, { kind: 'library', room: 'library', path: '/library/', title: '图书馆', description: `${site.author}的文章、项目和经历。` }, body);
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
    <nav class="crumbs" aria-label="位置"><a href="/">${esc(ctx.site.title)}</a><span>›</span><a href="/library/">图书馆</a><span>›</span><a href="/library/#posts">文章</a></nav>
    <h1 class="post-title">${esc(p.title)}</h1>
    <p class="post-meta">
      <span>第 ${pad(p.index)} 本</span>
      <time datetime="${p.date.toISOString()}">${fmtDate(p.date)}</time>
      <span>${p.minutes} 分钟</span>
      ${p.period ? `<span>项目时间 ${esc(p.period)}</span>` : ''}
      ${repo ? `<a href="${repo.url}" target="_blank" rel="noopener">仓库 ${esc(repo.name)} ↗</a>` : ''}
    </p>
    <p class="post-tags">${p.tags.map((t) => `<a class="tag tag-sm" href="/library/?tag=${encodeURIComponent(t.toLowerCase())}#posts">${esc(t)}</a>`).join('')}</p>
  </header>
  <div class="post-layout${toc ? ' has-toc' : ''}">
    <div class="paper prose">
${p.html}
    </div>
    ${toc}
  </div>
  <nav class="post-nav" aria-label="上一本和下一本">
    ${navLink(newer, 'newer', '← 新一点的')}
    ${navLink(older, 'older', '旧一点的 →')}
  </nav>
</article>`;
  return layout(ctx, { kind: 'post', room: 'library', path: p.url, title: p.title, description: p.summary }, body);
}

// ---------------------------------------------------------------- 404：以撒的死亡笔记

export function notFound(ctx) {
  const body = `<section class="death">
  <div class="death-note">
    <p class="death-kicker">乌托邦 · 未知房间</p>
    <h1 class="death-title">你死了</h1>
    <p class="death-cause">${icon('isaac.dead', 6)}<span>死因<b>404</b></span></p>
    <p class="death-text">这扇门后面什么都没有：可能门牌号写错了，也可能房间已经被炸掉了。</p>
    <p class="death-restart"><kbd>R</kbd> 重来 · <a href="/">回起始房</a> · <a href="/library/">去图书馆</a></p>
  </div>
</section>`;
  return layout(ctx, { kind: 'notfound', room: '', path: '/404', title: '你死了' }, body);
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
  const urls = [
    ...Object.values(ROOMS).filter((r) => r.ready).map((r) => [r.path, today]),
    ...posts.map((p) => [p.url, fmtDate(p.updated || p.date)]),
  ];
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

// 旧版网址跳到新房间
export function redirects() {
  return ['/posts /library/#posts 301', '/posts/ /library/#posts 301', '/projects /library/#projects 301', '/projects/ /library/#projects 301', '/about /library/#timeline 301', '/about/ /library/#timeline 301'].join('\n') + '\n';
}
