// 构建时生成全部像素素材：精灵图集、页面横幅、骰塔、界面边框、底纹、网站图标。
import crypto from 'node:crypto';
import { Raster } from './raster.mjs';
import { sprite } from './sprites.mjs';
import { makeUIFrame, makePaperTile, makeDirtTile, makeDiceTower } from './art.mjs';
import { renderBanners } from './banners.mjs';
import { makeDie, DICE } from './dice.mjs';

// 看板娘以撒要用的零件
const MASCOT = [
  'isaac.head', 'isaac.eye', 'isaac.eye.blink', 'isaac.eye.shut', 'isaac.mouth', 'isaac.mouth.open', 'isaac.body', 'shadow', 'tear',
];
// 页面里当图标用的精灵（生成 .px-xxx 类）
const UI = ['icon.book', 'icon.die', 'icon.moon', 'icon.heart', 'icon.skull', 'heart', 'isaac.face', 'isaac.dead', 'tarot.back'];

function fromRaster(r, name) {
  return {
    name, w: r.w, h: r.h,
    px: Array.from({ length: r.w * r.h }, (_, i) => {
      const c = r.get(i % r.w, Math.floor(i / r.w));
      return c[3] ? c : null;
    }),
  };
}

// 以撒的正脸（头 + 眼睛 + 嘴），给图标、网站图标、404 用
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

// 简单的货架式装箱，精灵之间留 1px 空隙，缩放时不会串色
function pack(sprites, width = 160) {
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
const cls = (n) => `px-${n.replace(/\./g, '-')}`;

// 返回 { files: { 相对路径: Buffer }, atlas, urls, css, banners: { id: { url, w, h } } }
export function buildPixelAssets() {
  const list = [...new Set([...MASCOT, ...UI])].filter((n) => !n.startsWith('isaac.face') && !n.startsWith('isaac.dead')).map((n) => sprite(n));
  list.push(face('isaac.eye', 'isaac.face'), face('isaac.eye.dead', 'isaac.dead'));
  const dice = DICE.map(([shape, color]) => fromRaster(makeDie(shape, color), `die.${shape}.${color}`));
  list.push(...dice);
  const { sheet, atlas } = pack(list);

  const files = {};
  const urls = {};
  const add = (rel, buf) => {
    files[rel] = buf;
    urls[rel] = `/${rel}?v=${digest(buf)}`;
  };
  add('assets/px/sheet.png', sheet.png());
  const banners = {};
  for (const [id, r] of Object.entries(renderBanners())) {
    add(`assets/px/banner-${id}.png`, r.png());
    banners[id] = { url: urls[`assets/px/banner-${id}.png`], w: r.w, h: r.h };
  }
  const tower = makeDiceTower();
  add('assets/px/dice-tower.png', tower.png());
  for (const kind of ['paper', 'stone', 'wood']) add(`assets/px/frame-${kind}.png`, makeUIFrame(kind).png());
  add('assets/px/paper.png', makePaperTile().png());
  add('assets/px/dirt.png', makeDirtTile().png());

  const faceR = new Raster(18, 16);
  faceR.draw(list.find((s) => s.name === 'isaac.face'), 0, 0);
  files['favicon.png'] = upscale(faceR, 2, 2).png();
  files['apple-touch-icon.png'] = upscale(faceR, 8, 18, [26, 17, 14, 255]).png();

  const [SW, SH] = [sheet.w, sheet.h];
  const vars = ['frame-paper', 'frame-stone', 'frame-wood', 'paper', 'dirt', 'dice-tower']
    .map((n) => `--px-${n}:url(${urls[`assets/px/${n}.png`]})`)
    .join(';');
  const css =
    `:root{${vars}}` +
    `.px{display:inline-block;vertical-align:middle;flex:none;--s:3px;width:calc(var(--w)*var(--s));height:calc(var(--h)*var(--s));` +
    `background:url(${urls['assets/px/sheet.png']}) no-repeat;background-size:calc(${SW}*var(--s)) calc(${SH}*var(--s));` +
    `background-position:calc(var(--x)*var(--s)*-1) calc(var(--y)*var(--s)*-1);image-rendering:pixelated}` +
    [...UI, ...dice.map((d) => d.name)]
      .map((n) => {
        const [x, y, w, h] = atlas[n];
        return `.${cls(n)}{--x:${x};--y:${y};--w:${w};--h:${h}}`;
      })
      .join('');

  return { files, atlas, urls, css, banners, tower: { w: tower.w, h: tower.h } };
}
