#!/usr/bin/env node
// 静态站点生成：content/posts/*.md + GitHub 数据 + static/ → dist/
// 用法：node build.mjs [--refresh 强制刷新 GitHub 数据] [--drafts 包含草稿]
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import site from './site.config.mjs';
import { renderMarkdown } from './src/markdown.mjs';
import { loadGitHub } from './src/github.mjs';
import { skylineSVG } from './src/skyline.mjs';
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

async function hash(rel) {
  const buf = await fs.readFile(path.join(ROOT, 'static', rel));
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
}

async function main() {
  const t0 = Date.now();
  const [gh, posts] = await Promise.all([loadGitHub(site.github, { refresh: args.has('--refresh') }), loadPosts()]);

  await fs.rm(DIST, { recursive: true, force: true });
  await copyDir(path.join(ROOT, 'static'), DIST);

  const assets = {
    css: await hash('assets/css/main.css'),
    js: await hash('assets/js/main.js'),
    term: await hash('assets/js/terminal.js'),
  };
  const ctx = { site, gh, posts, assets, stats: computeStats(gh) };

  await write('assets/img/skyline-far.svg', skylineSVG('far'));
  await write('assets/img/skyline-near.svg', skylineSVG('near'));
  await write('index.html', T.home(ctx));
  await write('posts/index.html', T.postsIndex(ctx));
  for (const [i, p] of posts.entries()) {
    await write(`posts/${p.slug}/index.html`, T.post(ctx, p, posts[i + 1], posts[i - 1]));
  }
  await write('projects/index.html', T.projects(ctx));
  await write('about/index.html', T.about(ctx));
  await write('404.html', T.notFound(ctx));
  await write('rss.xml', T.rss(ctx));
  await write('sitemap.xml', T.sitemap(ctx));
  await write('search.json', JSON.stringify(T.searchIndex(ctx)));
  await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

  console.log(`built ${posts.length} posts + ${gh.repos.length} repos → dist/ (${Date.now() - t0} ms)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
