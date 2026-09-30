#!/usr/bin/env node
// 静态站点生成：content/posts/*.md + GitHub 数据 + 字体裁剪 + 像素吉祥物 + static/ → dist/
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

// ---------------------------------------------------------------- 字体
// 每种字体只裁出网站上真正用到的字（fonttools），几 KB 到几十 KB。原件放 fonts-src/，
// 大字体不进仓库，缺了就从 Google Fonts 的仓库下载到 fonts-src/cache/（已 gitignore）。
// 没装 fonttools 或下载失败时，页面退回系统字体，照样能用。
const GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl/';
const FONTS = {
  // 像素字：游戏区的标题 + 全站的以撒气泡
  pixel: { family: 'Fusion Pixel', file: 'fusion-pixel-12px-proportional-zh_hans.otf.woff2', license: 'OFL-fusion-pixel.txt', fallback: true },
  // 楷书：动漫区、跑团判定
  brush: { family: 'Ma Shan Zheng', file: 'ma-shan-zheng-regular.woff2', license: 'OFL-ma-shan-zheng.txt', fallback: true },
  // 站酷小薇：首页 / 关于的大标题和站名
  xiaowei: { family: 'ZCOOL XiaoWei', cache: 'zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf', url: `${GF}zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf`, licenseUrl: `${GF}zcoolxiaowei/OFL.txt` },
  // 思源宋体：学习区的标题
  serif: { family: 'Noto Serif SC', cache: 'notoserifsc/NotoSerifSC[wght].ttf', url: `${GF}notoserifsc/NotoSerifSC%5Bwght%5D.ttf`, licenseUrl: `${GF}notoserifsc/OFL.txt`, weight: '400 900' },
  // 志莽行书：跑团区的标题
  xingshu: { family: 'Zhi Mang Xing', cache: 'zhimangxing/ZhiMangXing-Regular.ttf', url: `${GF}zhimangxing/ZhiMangXing-Regular.ttf`, licenseUrl: `${GF}zhimangxing/OFL.txt` },
  // 几种只用在少量拉丁字母上的展示字体
  cinzel: { family: 'Cinzel', cache: 'cinzel/Cinzel[wght].ttf', url: `${GF}cinzel/Cinzel%5Bwght%5D.ttf`, licenseUrl: `${GF}cinzel/OFL.txt`, weight: '400 900' },
  fraktur: { family: 'UnifrakturMaguntia', cache: 'unifrakturmaguntia/UnifrakturMaguntia-Book.ttf', url: `${GF}unifrakturmaguntia/UnifrakturMaguntia-Book.ttf`, licenseUrl: `${GF}unifrakturmaguntia/OFL.txt` },
  orbitron: { family: 'Orbitron', cache: 'orbitron/Orbitron[wght].ttf', url: `${GF}orbitron/Orbitron%5Bwght%5D.ttf`, licenseUrl: `${GF}orbitron/OFL.txt`, weight: '400 900' },
};

async function download(url, to) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.writeFile(to, Buffer.from(await res.arrayBuffer()));
}

// 确保字体原件在本地，返回路径；拿不到返回 null
async function fontSource(f) {
  if (f.file) return path.join(ROOT, 'fonts-src', f.file);
  const file = path.join(ROOT, 'fonts-src/cache', f.cache);
  const lic = path.join(path.dirname(file), 'OFL.txt');
  if (!fsSync.existsSync(file)) {
    try {
      console.log(`[font] 下载 ${f.family} …`);
      await download(f.url, file);
      if (f.licenseUrl) await download(f.licenseUrl, lic);
    } catch (err) {
      console.warn(`[font] 下载 ${f.family} 失败（${err.message}），这次不用它`);
      return null;
    }
  }
  return file;
}

// 用 fonttools 裁剪，返回 woff2 的 Buffer；失败返回 null
function subsetFont(src, text) {
  const out = path.join(DIST, `font-${process.pid}.tmp.woff2`);
  try {
    execFileSync(process.env.PYTHON || 'python3', [
      '-m', 'fontTools.subset', src, `--text=${text}`, '--flavor=woff2', `--output-file=${out}`,
      '--layout-features=kern,liga', '--no-hinting', '--desubroutinize', '--drop-tables+=vhea,vmtx',
    ], { stdio: 'pipe' });
    return fsSync.readFileSync(out);
  } catch (err) {
    console.warn(`[font] 没能裁剪 ${path.basename(src)}（${String(err.message).split('\n')[0]}）`);
    return null;
  } finally {
    fsSync.rmSync(out, { force: true });
  }
}

// texts: { 字体名: Set<字符> }。返回 { css: @font-face 声明, report }
async function buildFonts(texts) {
  const faces = [];
  const report = [];
  for (const [name, f] of Object.entries(FONTS)) {
    const chars = texts[name];
    if (!chars || !chars.size) continue;
    const src = await fontSource(f);
    if (!src) continue;
    const text = [...chars].filter((c) => c >= ' ' && c !== '\u007f').join('');
    let buf = subsetFont(src, text);
    if (!buf && f.fallback) buf = await fs.readFile(src);
    if (!buf) continue;
    const rel = `assets/fonts/${name}.${digest(buf)}.woff2`;
    await write(rel, buf);
    const lic = f.license ? path.join(ROOT, 'fonts-src', f.license) : path.join(path.dirname(src), 'OFL.txt');
    if (fsSync.existsSync(lic)) await write(`assets/fonts/OFL-${name}.txt`, await fs.readFile(lic));
    faces.push(`@font-face{font-family:"${f.family}";src:url(/${rel}) format("woff2");font-weight:${f.weight || 'normal'};font-display:swap}`);
    report.push(`${name} ${chars.size}字 ${(buf.length / 1024).toFixed(0)}K`);
  }
  return { css: faces.join(''), report: report.join(', ') };
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
    tarot: await hash('assets/js/tarot.js'),
  };
  // 模板渲染时把各种字体用到的字收集到这里，渲染完再裁字体
  const texts = Object.fromEntries(Object.keys(FONTS).map((k) => [k, new Set()]));
  const use = (font, text) => {
    for (const c of String(text)) texts[font].add(c);
    return text;
  };
  // 插画：static/assets/img/ 里有哪张就用哪张（hero-study.webp → images['hero-study']），带内容 hash 做版本号。
  // 同名多种格式并存时优先 webp（透明底）
  const images = {};
  const imgDir = path.join(ROOT, 'static/assets/img');
  const rank = { jpg: 0, png: 1, webp: 2 };
  const imgFiles = (await fs.readdir(imgDir))
    .map((f) => [f, f.match(/^(hero-[a-z]+|tower-[a-z]+|tarot-back|mascot-[a-z]+)\.(jpg|png|webp)$/)])
    .filter(([, m]) => m)
    .sort((a, b) => rank[a[1][2]] - rank[b[1][2]]);
  for (const [f, m] of imgFiles) images[m[1]] = `/assets/img/${f}?v=${digest(await fs.readFile(path.join(imgDir, f)))}`;
  const ctx = { site, gh, posts, assets, px, use, images, stats: computeStats(gh) };

  const pages = new Map();
  pages.set('index.html', T.home(ctx));
  pages.set('study/index.html', T.study(ctx));
  pages.set('games/index.html', T.games(ctx));
  pages.set('trpg/index.html', T.trpg(ctx));
  pages.set('anime/index.html', T.anime(ctx));
  pages.set('about/index.html', T.about(ctx));
  for (const [i, p] of posts.entries()) pages.set(`posts/${p.slug}/index.html`, T.post(ctx, p, posts[i + 1], posts[i - 1]));
  pages.set('404.html', T.notFound(ctx));

  // 像素字：全站的以撒气泡和游戏区都用，把所有页面和 main.js（以撒的台词）里出现过的字都裁进去
  const mainJs = await fs.readFile(path.join(ROOT, 'static/assets/js/main.js'), 'utf8');
  for (const c of [...pages.values()].join('') + mainJs) texts.pixel.add(c);
  for (let c = 0x20; c < 0x7f; c++) texts.pixel.add(String.fromCharCode(c));
  for (const c of '，。、：；！？“”‘’「」『』（）《》【】…—·～×←→↑↓') texts.pixel.add(c);
  // 脚本里才会出现的字：骰子判定（楷书）、骰子数字（Cinzel）、塔罗牌名（行书）
  for (const [font, text] of Object.entries(T.SCRIPT_TEXT)) for (const c of text) texts[font].add(c);
  const { CARDS } = await import('./static/assets/js/tarot-cards.js');
  for (const c of CARDS.map((card) => card.name).join('')) texts.xingshu.add(c);
  for (const c of CARDS.map((card) => card.en).join('')) texts.cinzel.add(c);
  const fonts = await buildFonts(texts);
  for (const [rel, html] of pages) await write(rel, html.replaceAll('__FONTFACES__', fonts.css));

  await write('rss.xml', T.rss(ctx));
  await write('sitemap.xml', T.sitemap(ctx));
  await write('search.json', JSON.stringify(T.searchIndex(ctx)));
  await write('_redirects', T.redirects());
  await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

  console.log(
    `built ${posts.length} posts + ${gh.repos.length} repos → dist/ ` +
      `(fonts: ${fonts.report}; ${Date.now() - t0} ms)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
