#!/usr/bin/env node
// 静态站点生成：content/posts/*.md + GitHub 数据 + 像素素材 + static/ → dist/
// 用法：node build.mjs [--refresh 强制刷新 GitHub 数据] [--drafts 包含草稿]
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import site from './site.config.mjs';
import { renderMarkdown } from './src/markdown.mjs';
import { loadGitHub } from './src/github.mjs';
import { buildPixelAssets } from './src/pixel/assets.mjs';
import * as T from './src/templates.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const args = new Set(process.argv.slice(2));

// 文章日期按北京时间解释：2026-09-29 或 2026-09-29 20:30
function parseDate(value, file) {
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?$/);
  if (!m) throw new Error(`${file}: date 格式应为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm，实际是 "${value}"`);
  return new Date(`${m[1]}T${m[2] || '00:00'}:00+08:00`);
}

function frontmatter(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error(`${file}: 缺少 --- 包起来的 frontmatter`);
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else if (v === 'true' || v === 'false') {
      v = v === 'true';
    } else {
      v = v.replace(/^['"]|['"]$/g, '');
    }
    data[kv[1]] = v;
  }
  return { data, body: raw.slice(m[0].length) };
}

async function loadPosts() {
  const dir = path.join(ROOT, 'content/posts');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const file of files) {
    const { data, body } = frontmatter(await fs.readFile(path.join(dir, file), 'utf8'), file);
    if (data.draft === true && !args.has('--drafts')) continue;
    if (!data.title) throw new Error(`${file}: 缺少 title`);
    const slug = data.slug || file.replace(/\.md$/, '');
    const { html, headings } = renderMarkdown(body);
    const text = html
      .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/g, ' ');
    const cjk = (text.match(/[一-鿿]/g) || []).length;
    const latin = (text.match(/[A-Za-z0-9_]+/g) || []).length;
    const codeLines = (html.match(/<pre[\s\S]*?<\/pre>/g) || [])
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .filter((l) => l.trim()).length;
    posts.push({
      ...data,
      slug,
      url: `/posts/${slug}/`,
      html,
      headings,
      tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
      date: parseDate(data.date, file),
      updated: data.updated ? parseDate(data.updated, file) : null,
      // 中文 300 字/分钟、英文 200 词/分钟、代码 20 行/分钟
      minutes: Math.max(1, Math.round(cjk / 300 + latin / 200 + codeLines / 20)),
      summary: data.summary || text.replace(/\s+/g, ' ').trim().slice(0, 110) + '…',
      // 给图书馆的全文搜索用
      text: text.replace(/\s+/g, ' ').trim().slice(0, 3000),
    });
  }
  posts.sort((a, b) => b.date - a.date);
  posts.forEach((p, i) => (p.index = posts.length - i));
  return posts;
}

function computeStats(gh) {
  const totals = new Map();
  let totalBytes = 0;
  const own = gh.repos.filter((r) => !r.fork);
  for (const r of own) {
    for (const [lang, bytes] of Object.entries(r.languages || {})) {
      totals.set(lang, (totals.get(lang) || 0) + bytes);
      totalBytes += bytes;
    }
  }
  const languages = [...totals]
    .map(([name, bytes]) => ({ name, bytes, pct: totalBytes ? (bytes / totalBytes) * 100 : 0 }))
    .sort((a, b) => b.bytes - a.bytes);
  return { languages, totalBytes, ownRepos: own.length };
}

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, dst);
    else await fs.copyFile(src, dst);
  }
}

async function write(rel, content) {
  const file = path.join(DIST, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

const digest = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

async function hash(rel) {
  return digest(await fs.readFile(path.join(ROOT, 'static', rel)));
}

// 用 fonttools 把字体裁成只含 text 里的字，返回 woff2 的 Buffer；没装 fonttools 时返回 null
function subsetFont(src, text) {
  const out = path.join(DIST, `font-${process.pid}.tmp.woff2`);
  try {
    execFileSync(process.env.PYTHON || 'python3', [
      '-m', 'fontTools.subset', src, `--text=${text}`, '--flavor=woff2', `--output-file=${out}`,
      '--layout-features=kern', '--no-hinting', '--desubroutinize', '--drop-tables+=vhea,vmtx',
    ], { stdio: 'pipe' });
    return fsSync.readFileSync(out);
  } catch (err) {
    console.warn(`[font] 没能裁剪 ${path.basename(src)}（${String(err.message).split('\n')[0]}）`);
    return null;
  } finally {
    fsSync.rmSync(out, { force: true });
  }
}

// 像素字体只保留网站上真正出现过的字。需要 fonttools（pip install fonttools brotli）；
// 没装的话退回完整字体（约 650 KB），网站照样能用，只是第一次打开慢一点。
async function pixelFont(pages) {
  const src = path.join(ROOT, 'fonts-src/fusion-pixel-12px-proportional-zh_hans.otf.woff2');
  const jsDir = path.join(ROOT, 'static/assets/js');
  const js = await Promise.all((await fs.readdir(jsDir)).map((f) => fs.readFile(path.join(jsDir, f), 'utf8')));
  const chars = new Set([...pages.join(''), ...js.join('')]);
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const c of '，。、：；！？“”‘’「」『』（）《》【】…—·～×←→↑↓') chars.add(c);
  const text = [...chars].filter((c) => c >= ' ' && c !== '\u007f').join('');
  const buf = subsetFont(src, text) ?? (await fs.readFile(src));
  const rel = `assets/fonts/pixel.${digest(buf)}.woff2`;
  await write(rel, buf);
  await write('assets/fonts/OFL.txt', await fs.readFile(path.join(ROOT, 'fonts-src/OFL-fusion-pixel.txt')));
  return { url: `/${rel}`, size: buf.length, chars: chars.size };
}

// 动漫页的毛笔字（马善政楷书，OFL）。完整字体 3 MB 多，只裁出页面上用到的几十个字；
// 没装 fonttools 就不用毛笔字，退回系统的楷体。
async function brushFont(text) {
  const buf = subsetFont(path.join(ROOT, 'fonts-src/ma-shan-zheng-regular.woff2'), [...new Set(text)].join(''));
  if (!buf) return null;
  const rel = `assets/fonts/brush.${digest(buf)}.woff2`;
  await write(rel, buf);
  await write('assets/fonts/OFL-ma-shan-zheng.txt', await fs.readFile(path.join(ROOT, 'fonts-src/OFL-ma-shan-zheng.txt')));
  return `/${rel}`;
}

async function main() {
  const t0 = Date.now();
  const [gh, posts] = await Promise.all([loadGitHub(site.github, { refresh: args.has('--refresh') }), loadPosts()]);

  await fs.rm(DIST, { recursive: true, force: true });
  await copyDir(path.join(ROOT, 'static'), DIST);

  const px = buildPixelAssets();
  for (const [rel, buf] of Object.entries(px.files)) await write(rel, buf);

  const assets = {
    css: await hash('assets/css/main.css'),
    js: await hash('assets/js/main.js'),
    dice: await hash('assets/js/dice.js'),
  };
  const brush = await brushFont(T.brushText(site));
  const ctx = { site, gh, posts, assets, px, brushFont: brush, stats: computeStats(gh) };

  const pages = new Map();
  pages.set('index.html', T.home(ctx));
  pages.set('study/index.html', T.study(ctx));
  pages.set('games/index.html', T.games(ctx));
  pages.set('trpg/index.html', T.trpg(ctx));
  pages.set('anime/index.html', T.anime(ctx));
  pages.set('about/index.html', T.about(ctx));
  for (const [i, p] of posts.entries()) pages.set(`posts/${p.slug}/index.html`, T.post(ctx, p, posts[i + 1], posts[i - 1]));
  pages.set('404.html', T.notFound(ctx));

  const font = await pixelFont([...pages.values()]);
  for (const [rel, html] of pages) await write(rel, html.replaceAll('__PIXEL_FONT__', font.url));

  await write('rss.xml', T.rss(ctx));
  await write('sitemap.xml', T.sitemap(ctx));
  await write('search.json', JSON.stringify(T.searchIndex(ctx)));
  await write('_redirects', T.redirects());
  await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

  console.log(
    `built ${posts.length} posts + ${gh.repos.length} repos → dist/ ` +
      `(pixel font ${font.chars} chars, ${(font.size / 1024).toFixed(0)} KiB; brush font ${brush ? 'subset' : 'skipped'}; ${Date.now() - t0} ms)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
