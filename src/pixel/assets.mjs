// 构建时生成像素素材：右下角以撒要用的精灵图集，以及网站图标。
import crypto from 'node:crypto';
import { Raster } from './raster.mjs';
import { sprite } from './sprites.mjs';

// 看板娘以撒要用的零件
const MASCOT = ['isaac.head', 'isaac.eye', 'isaac.eye.blink', 'isaac.eye.shut', 'isaac.mouth', 'isaac.mouth.open', 'isaac.body', 'shadow', 'tear'];

function fromRaster(r, name) {
  return {
    name, w: r.w, h: r.h,
    px: Array.from({ length: r.w * r.h }, (_, i) => {
      const c = r.get(i % r.w, Math.floor(i / r.w));
      return c[3] ? c : null;
    }),
  };
}

// 以撒的正脸（头 + 眼睛 + 嘴），给网站图标用
function face(eye, name) {
  const r = new Raster(18, 16);
  r.draw(sprite('isaac.head'), 0, 0);
  r.draw(sprite(eye), 3, 5);
  r.draw(sprite(eye), 11, 5);
  r.draw(sprite('isaac.mouth'), 8, 12);
  return fromRaster(r, name);
}

function upscale(src, k, pad = 0, bg = null) {
  const r = new Raster(src.w * k + pad * 2, src.h * k + pad * 2);
  if (bg) r.rect(0, 0, r.w, r.h, bg);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c[3]) r.rect(pad + x * k, pad + y * k, k, k, c);
    }
  return r;
}

// 简单的货架式装箱，精灵之间留 1px 空隙
function pack(sprites, width = 96) {
  const sorted = [...sprites].sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 1, y = 1, rowH = 0;
  const atlas = {};
  for (const s of sorted) {
    if (x + s.w + 1 > width) {
      x = 1;
      y += rowH + 1;
      rowH = 0;
    }
    atlas[s.name] = [x, y, s.w, s.h];
    x += s.w + 1;
    rowH = Math.max(rowH, s.h);
  }
  const sheet = new Raster(width, y + rowH + 1);
  for (const s of sorted) sheet.draw(s, atlas[s.name][0], atlas[s.name][1]);
  return { sheet, atlas };
}

const digest = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

// 返回 { files: { 相对路径: Buffer }, atlas, urls, css }
export function buildPixelAssets() {
  const list = MASCOT.map((n) => sprite(n));
  list.push(face('isaac.eye', 'isaac.face'));
  const { sheet, atlas } = pack(list);

  const files = {};
  const urls = {};
  const add = (rel, buf) => {
    files[rel] = buf;
    urls[rel] = `/${rel}?v=${digest(buf)}`;
  };
  add('assets/px/sheet.png', sheet.png());

  const faceR = new Raster(18, 16);
  faceR.draw(list.find((s) => s.name === 'isaac.face'), 0, 0);
  files['favicon.png'] = upscale(faceR, 2, 2).png();
  files['apple-touch-icon.png'] = upscale(faceR, 8, 18, [241, 239, 233, 255]).png();

  const [x, y, w, h] = atlas['isaac.face'];
  const css =
    `.px{display:inline-block;vertical-align:middle;flex:none;--s:2px;width:calc(var(--w)*var(--s));height:calc(var(--h)*var(--s));` +
    `background:url(${urls['assets/px/sheet.png']}) no-repeat;background-size:calc(${sheet.w}*var(--s)) calc(${sheet.h}*var(--s));` +
    `background-position:calc(var(--x)*var(--s)*-1) calc(var(--y)*var(--s)*-1);image-rendering:pixelated}` +
    `.px-isaac-face{--x:${x};--y:${y};--w:${w};--h:${h}}`;

  return { files, atlas, urls, css };
}
