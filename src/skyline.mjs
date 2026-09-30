// 构建时用固定种子生成两层城市天际线 SVG（远景 / 近景），窗户灯光的闪烁写在 SVG 自带的 <style> 里。

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STYLE = `
.c{fill:#00f0ff}.p{fill:#ff2a6d}.y{fill:#fcee0a}.w{fill:#dfe6ff}
.b1{animation:b 6s steps(1) infinite}.b2{animation:b 9s steps(1) -3s infinite}.b3{animation:b 13s steps(1) -7s infinite}
.r{fill:#ff2a6d;animation:r 1.8s ease-in-out infinite}.r2{animation-delay:-.9s}
@keyframes b{0%,64%{opacity:.95}65%,100%{opacity:.12}}
@keyframes r{50%{opacity:.1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

export function skylineSVG(layer) {
  const far = layer === 'far';
  const W = 1600;
  const H = far ? 320 : 260;
  const rand = rng(far ? 2077 : 1988);
  const r = (a, b) => a + rand() * (b - a);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const shapes = [];
  const lit = [];
  const lights = [];
  let x = -10;

  while (x < W) {
    const w = Math.round(far ? r(26, 84) : r(44, 132));
    const h = Math.round(far ? r(70, 280) : r(40, 205));
    const top = H - h;
    shapes.push(`<rect x="${x}" y="${top}" width="${w}" height="${h}"/>`);

    // 退台楼顶 / 水箱
    if (rand() < 0.35) {
      const sw = Math.round(w * r(0.3, 0.65));
      const sh = Math.round(r(8, far ? 30 : 22));
      shapes.push(`<rect x="${x + Math.round((w - sw) / 2)}" y="${top - sh}" width="${sw}" height="${sh}"/>`);
    }
    // 天线 + 航空障碍灯
    if (h > (far ? 200 : 150) && rand() < 0.6) {
      const ax = x + Math.round(w * r(0.25, 0.75));
      const ah = Math.round(r(18, 46));
      shapes.push(`<rect x="${ax}" y="${top - ah}" width="2" height="${ah}"/>`);
      lights.push(`<circle class="r${rand() < 0.5 ? ' r2' : ''}" cx="${ax + 1}" cy="${top - ah}" r="2.4"/>`);
    }

    // 近景楼的亮灯窗户，对齐到 8x10 的窗格
    if (!far) {
      for (let wy = top + 8; wy < H - 10; wy += 10) {
        for (let wx = x + 4; wx < x + w - 6; wx += 8) {
          if (rand() < 0.07) {
            const color = pick(['c', 'c', 'p', 'y', 'w']);
            const blink = rand() < 0.3 ? ` ${pick(['b1', 'b2', 'b3'])}` : '';
            lit.push(`<rect class="${color}${blink}" x="${wx + 2}" y="${wy + 2}" width="3" height="4" opacity="${r(0.55, 0.95).toFixed(2)}"/>`);
          }
        }
      }
    }
    x += w + Math.round(r(far ? 0 : 2, far ? 6 : 10));
  }

  const body = far
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a55"/><stop offset="1" stop-color="#120c2a"/></linearGradient></defs>` +
      `<g fill="url(#g)">${shapes.join('')}</g>`
    : `<defs><pattern id="win" width="8" height="10" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="3" height="4" fill="#1a1f3d"/></pattern>` +
      `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1024"/><stop offset="1" stop-color="#05060d"/></linearGradient></defs>` +
      `<g fill="url(#g)">${shapes.join('')}</g>` +
      `<g fill="url(#win)" opacity=".8">${shapes.join('')}</g>` +
      `<g>${lit.join('')}</g>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">` +
    `<style>${STYLE}</style>${body}<g>${lights.join('')}</g></svg>\n`
  );
}
