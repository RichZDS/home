// 构建时生成全部像素素材：精灵图集、房间背景、界面边框、底纹、网站图标。
import crypto from 'node:crypto';
import { Raster } from './raster.mjs';
import { sprite, cropTop } from './sprites.mjs';
import { makeUIFrame, makePaperTile, makeDirtTile } from './art.mjs';
import { renderRoom, ROOMS } from './rooms.mjs';

// 运行时（舞台、看板娘、界面图标）会用到的精灵
const RUNTIME = [
  'isaac.head', 'isaac.head.back', 'isaac.eye', 'isaac.eye.blink', 'isaac.eye.shut', 'isaac.eye.dead',
  'isaac.mouth', 'isaac.mouth.open', 'isaac.body', 'isaac.body.walk1', 'isaac.body.walk2', 'isaac.horns',
  'shadow', 'tear', 'blood.tear', 'fly.1', 'fly.2', 'poop', 'rock', 'candle', 'candle.2', 'candle.3',
  'heart', 'heart.half', 'heart.empty', 'coin', 'bomb', 'key',
  'icon.book', 'icon.die', 'icon.star', 'icon.crown', 'icon.coin', 'icon.angel', 'icon.lock', 'icon.skull',
];
// 需要生成 CSS 类（.px-xxx）的界面图标
const UI = ['heart', 'heart.half', 'heart.empty', 'coin', 'bomb', 'key', 'icon.book', 'icon.die', 'icon.star', 'icon.crown', 'icon.coin', 'icon.angel', 'icon.lock', 'icon.skull', 'isaac.face', 'isaac.dead', 'tear', 'fly.1', 'poop'];

function toRaster(s) {
  const r = new Raster(s.w, s.h);
  r.draw(s, 0, 0);
  return r;
}

function fromRaster(r, name) {
  return { name, w: r.w, h: r.h, px: Array.from({ length: r.w * r.h }, (_, i) => { const c = r.get(i % r.w, Math.floor(i / r.w)); return c[3] ? c : null; }) };
}

// 以撒的正脸（头 + 眼睛 + 嘴），给图标、小地图、经历里的「你在这里」用
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
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
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
    if (x + s.w + 1 > width) { x = 1; y += rowH + 1; rowH = 0; }
    atlas[s.name] = [x, y, s.w, s.h];
    x += s.w + 1;
    rowH = Math.max(rowH, s.h);
  }
  const sheet = new Raster(width, y + rowH + 1);
  for (const s of sorted) sheet.draw(s, atlas[s.name][0], atlas[s.name][1]);
  return { sheet, atlas };
}

const digest = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

// 返回 { files: { 相对路径: Buffer }, atlas, url(name), css }
export function buildPixelAssets() {
  const list = RUNTIME.map((n) => sprite(n));
  const poop = sprite('poop');
  list.push(cropTop(poop, 4, 'poop.3'), cropTop(poop, 8, 'poop.2'), cropTop(poop, 11, 'poop.1'));
  list.push(face('isaac.eye', 'isaac.face'), face('isaac.eye.dead', 'isaac.dead'));
  const { sheet, atlas } = pack(list);

  const files = {};
  const urls = {};
  const add = (rel, buf) => {
    files[rel] = buf;
    urls[rel] = `/${rel}?v=${digest(buf)}`;
  };
  add('assets/px/sheet.png', sheet.png());
  for (const [id, room] of Object.entries(ROOMS)) if (room.ready) add(`assets/px/room-${id}.png`, renderRoom(id).png());
  for (const kind of ['paper', 'stone', 'wood']) add(`assets/px/frame-${kind}.png`, makeUIFrame(kind).png());
  add('assets/px/paper.png', makePaperTile().png());
  add('assets/px/dirt.png', makeDirtTile().png());

  const faceR = toRaster(list.find((s) => s.name === 'isaac.face'));
  files['favicon.png'] = upscale(faceR, 2, 2).png();
  files['apple-touch-icon.png'] = upscale(faceR, 8, 18, [26, 17, 14, 255]).png();

  const [SW, SH] = [sheet.w, sheet.h];
  const cls = (n) => `px-${n.replace(/\./g, '-')}`;
  const vars = ['frame-paper', 'frame-stone', 'frame-wood', 'paper', 'dirt'].map((n) => `--px-${n}:url(${urls[`assets/px/${n}.png`]})`).join(';');
  const css =
    `:root{${vars}}` +
    `.px{display:inline-block;vertical-align:middle;flex:none;--s:3px;width:calc(var(--w)*var(--s));height:calc(var(--h)*var(--s));` +
    `background:url(${urls['assets/px/sheet.png']}) no-repeat;background-size:calc(${SW}*var(--s)) calc(${SH}*var(--s));` +
    `background-position:calc(var(--x)*var(--s)*-1) calc(var(--y)*var(--s)*-1);image-rendering:pixelated}` +
    UI.map((n) => { const [x, y, w, h] = atlas[n]; return `.${cls(n)}{--x:${x};--y:${y};--w:${w};--h:${h}}`; }).join('');

  return { files, atlas, urls, css };
}
