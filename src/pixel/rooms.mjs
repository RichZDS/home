// 这一层地下室的房间：位置、门、摆设。构建时画背景，运行时拿来做碰撞和走门。
import { Raster, rgba, rng } from './raster.mjs';
import { sprite } from './sprites.mjs';
import {
  ROOM_W, ROOM_H, FLOOR, DOOR_RECT, DOOR_ICON,
  makeDoor, drawWalls, drawDirtFloor, drawPlankFloor, vignette,
  makeBookshelf, makeRug, makeFrame, makePlaque,
} from './art.mjs';

// cell 是小地图上的格子坐标；door 是这间房对外的门的样式；ready=false 的房间门是锁着的（还没做）
export const ROOMS = {
  start: { name: '起始房', path: '/', cell: [1, 1], doors: { up: 'library', left: 'dice', right: 'games', down: 'penglai' }, ready: true },
  library: { name: '图书馆', path: '/library/', cell: [1, 0], doors: { down: 'start' }, door: 'library', icon: 'icon.book', ready: true },
  dice: { name: '骰子房', path: '/dice/', cell: [0, 1], doors: { right: 'start', up: 'planetarium' }, door: 'dice', icon: 'icon.die' },
  planetarium: { name: '星象房', path: '/planetarium/', cell: [0, 0], doors: { down: 'dice' }, door: 'planetarium', icon: 'icon.star' },
  games: { name: '游戏房', path: '/games/', cell: [2, 1], doors: { left: 'start', up: 'shop' }, door: 'treasure', icon: 'icon.crown' },
  shop: { name: '商店', path: '/shop/', cell: [2, 0], doors: { down: 'games' }, door: 'shop', icon: 'icon.coin' },
  penglai: { name: '蓬莱', path: '/penglai/', cell: [1, 2], doors: { up: 'start' }, door: 'angel', icon: 'icon.angel' },
};

export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// 两个房间之间的门用特殊房间那一边的样式
export function doorStyle(a, b) {
  return ROOMS[b].door ?? ROOMS[a].door ?? 'normal';
}

// 每个房间里的摆设。坐标都是房间像素（240×160）
export const LAYOUT = {
  start: {
    spawn: { x: 120, y: 120 },
    portrait: { x: 58, y: 4, w: 28, h: 26 },
    plaque: { x: 150, y: 9, w: 44, h: 16 },
    chalk: [
      { key: 'W', x: 44, y: 94 }, { key: 'A', x: 32, y: 106 }, { key: 'S', x: 44, y: 106 }, { key: 'D', x: 56, y: 106 },
      { arrow: 0, x: 184, y: 94 }, { arrow: 3, x: 172, y: 106 }, { arrow: 2, x: 184, y: 106 }, { arrow: 1, x: 196, y: 106 },
    ],
    entities: [
      { type: 'poop', x: 198, y: 38 },
      { type: 'fly', x: 70, y: 60 },
      { type: 'fly', x: 170, y: 64 },
    ],
  },
  library: {
    spawn: { x: 120, y: 138 },
    shelves: [
      { x: 26, y: 14, w: 52, h: 42, seed: 3, id: 'posts' },
      { x: 94, y: 14, w: 52, h: 42, seed: 8, id: 'projects' },
      { x: 162, y: 14, w: 52, h: 42, seed: 21, id: 'timeline' },
    ],
    plaques: [
      { x: 36, y: 58, w: 32, h: 14 }, { x: 104, y: 58, w: 32, h: 14 }, { x: 172, y: 58, w: 32, h: 14 },
    ],
    rug: { x: 60, y: 80, w: 120, h: 46 },
    entities: [
      { type: 'candle', x: 20, y: 44 }, { type: 'candle', x: 215, y: 44 },
      { type: 'candle', x: 20, y: 126 }, { type: 'candle', x: 215, y: 126 },
      { type: 'fly', x: 150, y: 100 },
    ],
  },
};

// 运行时用的碰撞体（以撒的脚不能进去的矩形）
export function solids(id) {
  const L = LAYOUT[id] ?? {};
  const out = [];
  for (const s of L.shelves ?? []) out.push({ x: s.x, y: FLOOR.y, w: s.w, h: s.y + s.h - FLOOR.y - 2 });
  for (const e of L.entities ?? []) if (e.type === 'candle') out.push({ x: e.x, y: e.y + 6, w: 5, h: 4 });
  return out;
}

function chalk(r, spr, x, y, seed, opts = {}) {
  const rand = rng(seed);
  const s = opts.rot ? rotate(spr, opts.rot) : spr;
  for (let j = 0; j < s.h; j++)
    for (let i = 0; i < s.w; i++) {
      const c = s.px[j * s.w + i];
      if (!c || rand() < (opts.solid ? 0.03 : 0.1)) continue;
      r.set(x + i, y + j, [c[0], c[1], c[2], (opts.solid ? 185 : 150) + rand() * 60]);
    }
}

function rotate(s, rot) {
  let { w, h, px } = s;
  for (let k = 0; k < rot; k++) {
    const out = new Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[i * h + (h - 1 - j)] = px[j * w + i];
    [w, h, px] = [h, w, out];
  }
  return { w, h, px };
}

function blit(r, src, x, y) {
  for (let j = 0; j < src.h; j++)
    for (let i = 0; i < src.w; i++) {
      const c = src.get(i, j);
      if (c[3]) r.set(x + i, y + j, c);
    }
}

function drawDoors(r, id) {
  const room = ROOMS[id];
  for (const [dir, target] of Object.entries(room.doors)) {
    const style = doorStyle(id, target);
    const locked = !ROOMS[target].ready;
    const rect = DOOR_RECT[dir];
    const h = dir === 'up' ? 26 : 16;
    const d = makeDoor(style, h, { locked, seed: rect.x * 31 + rect.y });
    const rot = { up: 0, right: 1, down: 2, left: 3 }[dir];
    r.draw(d, rect.x, rect.y, { rot });
    // 锁和门楣上的小图标都不跟着门旋转
    if (locked) {
      const c = { up: [rect.x + 14, rect.y + rect.h - 8], down: [rect.x + 14, rect.y + 9], left: [rect.x + 9, rect.y + 14], right: [rect.x + 7, rect.y + 14] }[dir];
      r.draw(sprite('icon.lock'), c[0] - 3, c[1] - 3);
    }
    const icon = DOOR_ICON[style];
    if (icon && !locked && dir !== 'down') {
      const at = { up: [rect.x + 10, rect.y - 5], down: [rect.x + 10, rect.y + 9], left: [rect.x + 1, rect.y - 8], right: [rect.x + 8, rect.y - 8] }[dir];
      r.draw(sprite(icon), at[0], at[1]);
    }
  }
}

export function renderRoom(id) {
  const r = new Raster(ROOM_W, ROOM_H);
  const L = LAYOUT[id] ?? {};
  const theme = id === 'library' ? 'library' : 'basement';
  drawWalls(r, theme, id.length * 101 + 7);
  if (id === 'library') drawPlankFloor(r, 42);
  else drawDirtFloor(r, theme, id.charCodeAt(0) * 13);
  if (L.rug) blit(r, makeRug(L.rug.w, L.rug.h), L.rug.x, L.rug.y);
  vignette(r, id === 'library' ? 0.35 : 0.45);
  drawDoors(r, id);

  if (L.portrait) blit(r, makeFrame(L.portrait.w, L.portrait.h), L.portrait.x, L.portrait.y);
  if (L.plaque) blit(r, makePlaque(L.plaque.w, L.plaque.h), L.plaque.x, L.plaque.y);
  for (const [i, c] of (L.chalk ?? []).entries()) {
    chalk(r, sprite('chalk.key'), c.x, c.y, 50 + i);
    if (c.key) chalk(r, sprite(`chalk.${c.key}`), c.x + 3, c.y + 3, 70 + i, { solid: true });
    else chalk(r, sprite('chalk.up'), c.x + 3, c.y + 3, 70 + i, { rot: c.arrow, solid: true });
  }
  for (const s of L.shelves ?? []) {
    // 书架脚下的影子
    for (let x = s.x + 1; x < s.x + s.w - 1; x++) for (let y = s.y + s.h; y < s.y + s.h + 3; y++) r.shade(x, y, 0.6 + (y - s.y - s.h) * 0.12);
    blit(r, makeBookshelf(s.w, s.h, s.seed), s.x, s.y);
  }
  for (const p of L.plaques ?? []) blit(r, makePlaque(p.w, p.h), p.x, p.y);
  return r;
}

export { ROOM_W, ROOM_H, FLOOR, DOOR_RECT };
