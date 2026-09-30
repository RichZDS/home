// 一张 RGBA 画布，只提供像素画需要的几个操作：点、矩形、贴精灵（可翻转 / 旋转 / 半透明）。
import { encodePNG } from './png.mjs';

export function rgba(hex, a = 255) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6), 16);
  const alpha = h.length === 8 ? parseInt(h.slice(6), 16) : a;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

// 可复现的随机数（mulberry32），同一个种子每次构建都画出同一面墙
export function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export class Raster {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  get(x, y) {
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  // source-over 混合
  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const a = c[3] / 255;
    if (a >= 1) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = 255;
      return;
    }
    if (a <= 0) return;
    const da = this.data[i + 3] / 255;
    const oa = a + da * (1 - a);
    for (let k = 0; k < 3; k++) this.data[i + k] = (c[k] * a + this.data[i + k] * da * (1 - a)) / oa;
    this.data[i + 3] = oa * 255;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  // 把颜色按系数变亮 / 变暗（f<1 变暗）
  shade(x, y, f) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    for (let k = 0; k < 3; k++) this.data[i + k] = Math.min(255, this.data[i + k] * f);
  }

  // 贴一个精灵。opts: flipX, flipY, rot（顺时针 90° 的次数）, alpha（0..1）, tint（替换所有不透明像素的颜色）
  draw(sprite, x, y, opts = {}) {
    const s = transform(sprite, opts);
    const alpha = opts.alpha ?? 1;
    for (let j = 0; j < s.h; j++) {
      for (let i = 0; i < s.w; i++) {
        let c = s.px[j * s.w + i];
        if (!c) continue;
        if (opts.tint) c = [...opts.tint.slice(0, 3), c[3]];
        this.set(x + i, y + j, alpha === 1 ? c : [c[0], c[1], c[2], c[3] * alpha]);
      }
    }
  }

  png() {
    return encodePNG(this.w, this.h, this.data);
  }
}

// 精灵的翻转和旋转，返回新精灵
export function transform(sprite, { flipX = false, flipY = false, rot = 0 } = {}) {
  let { w, h, px } = sprite;
  if (flipX || flipY) {
    const out = new Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[j * w + i] = px[(flipY ? h - 1 - j : j) * w + (flipX ? w - 1 - i : i)];
    px = out;
  }
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) {
    const out = new Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[i * h + (h - 1 - j)] = px[j * w + i];
    [w, h, px] = [h, w, out];
  }
  return { w, h, px };
}
