#!/usr/bin/env node
// 本地预览：node scripts/serve.mjs [--watch] [--port 4173]
// --watch 时先构建一次，之后 content/ src/ static/ site.config.mjs 有改动就自动重建。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 4173;
const watch = args.includes('--watch');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};

function build() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'build.mjs')], { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', resolve);
  });
}

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const file = path.normalize(path.join(DIST, clean));
  if (!file.startsWith(DIST)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  const index = path.join(file, 'index.html');
  if (fs.existsSync(index)) return index;
  if (fs.existsSync(file + '.html')) return file + '.html';
  return null;
}

if (watch) {
  await build();
  let timer = null;
  let running = false;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) return rebuild();
      running = true;
      await build();
      running = false;
    }, 150);
  };
  for (const dir of ['content', 'src', 'static']) fs.watch(path.join(ROOT, dir), { recursive: true }, rebuild);
  fs.watch(path.join(ROOT, 'site.config.mjs'), rebuild);
}

http
  .createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    // 和 Cloudflare Pages 一样：/posts 这种不带斜杠的目录地址跳到 /posts/
    if (!pathname.endsWith('/') && !path.extname(pathname) && fs.existsSync(path.join(DIST, pathname, 'index.html'))) {
      res.writeHead(308, { Location: pathname + '/' });
      return res.end();
    }
    const file = resolveFile(pathname);
    const status = file ? 200 : 404;
    const target = file || path.join(DIST, '404.html');
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(target).pipe(res);
  })
  .listen(port, () => console.log(`preview → http://localhost:${port}`));
