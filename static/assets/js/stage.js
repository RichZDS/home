/* 房间里的小游戏：以撒走路、射眼泪、打苍蝇和便便、捡硬币、过门。
   坐标全部是房间像素（240×160），画布交给 CSS 放大，像素保持锐利。
   操作：WASD 走、方向键射眼泪；鼠标或手指点地面走过去，点苍蝇或便便就朝它射。 */

const W = 240, H = 160;
const FLOOR = { x: 16, y: 32, w: 208, h: 112 };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SPEED = 74;
const TEAR_SPEED = 135;
const FIRE_DELAY = 0.3;

// 以撒的脚能站的范围
const B = { x0: FLOOR.x + 7, x1: FLOOR.x + FLOOR.w - 7, y0: FLOOR.y + 10, y1: FLOOR.y + FLOOR.h - 1 };
// 门口：脚进了这个框、又朝门的方向走，就算进门
const DOOR_ZONE = {
  up: { x0: 107, x1: 133, y0: 0, y1: B.y0 + 1, to: [120, B.y0] },
  down: { x0: 107, x1: 133, y0: B.y1 - 1, y1: H, to: [120, B.y1] },
  left: { x0: 0, x1: B.x0 + 1, y0: 82, y1: 110, to: [B.x0, 97] },
  right: { x0: B.x1 - 1, x1: W, y0: 82, y1: 110, to: [B.x1, 97] },
};
// 从某扇门进房间时出现的位置
const DOOR_IN = { up: [120, B.y0 + 2], down: [120, B.y1 - 2], left: [B.x0 + 2, 97], right: [B.x1 - 2, 97] };

const MOVE = { w: 'up', a: 'left', s: 'down', d: 'right' };
const SHOOT = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dirOf = (x, y) => (Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up');
const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function init(section, px) {
  const data = JSON.parse(section.querySelector('.stage-data').textContent);
  const box = section.querySelector('.stage-box');
  const cv = box.querySelector('.stage-cv');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const { drawSprite, drawIsaac, store, session, reduce } = px;
  const root = document.documentElement;
  const doors = new Map(data.doors.map((d) => [d.dir, d]));
  const doorEls = new Map([...box.querySelectorAll('.door')].map((el) => [el.dataset.dir, el]));
  const shelfEls = [...box.querySelectorAll('.shelf-hot')];
  const hudCoins = box.querySelector('[data-hud="coins"]');
  let img = null;

  /* ---------- 状态 */
  const P = {
    x: data.spawn.x, y: data.spawn.y, vx: 0, vy: 0, z: 0, vz: 0, hold: 0,
    dir: 'down', face: 'down', walk: 0, blink: 2, shoot: 0, cooldown: 0, cry: 0, frozen: 0, target: null,
  };
  const flies = [], tears = [], parts = [], coins = [], decals = [], candles = [];
  let poop = null, portrait = null, leaving = false, bumpCd = 0, flyTimer = 0, time = 0;
  let coinCount = store.get('utopia.coins', 0);

  for (const e of data.entities) {
    if (e.type === 'fly') flies.push(newFly(e.x + 3, e.y + 3));
    if (e.type === 'poop') poop = { x: e.x, y: e.y, hp: 4, shake: 0 };
    if (e.type === 'candle') candles.push({ x: e.x, y: e.y, phase: Math.random() * 3 });
  }
  const solids = data.solids.slice();

  // 从哪扇门进来的：上一个房间往 came 方向走，这边就从反方向的门出来
  const came = root.dataset.door;
  const entry = came && OPP[came];
  if (entry && doors.has(entry)) {
    [P.x, P.y] = DOOR_IN[entry];
    P.dir = P.face = came;
    const [vx, vy] = VEC[came];
    P.target = { x: P.x + vx * 14, y: P.y + vy * 14 };
  }

  // 开场：以撒从天而降
  const intro = root.classList.contains('intro');
  if (intro) {
    P.z = 120;
    P.hold = 0.75;
    P.frozen = 1.6;
    setTimeout(() => {
      root.classList.remove('intro');
      session.set('utopia.intro', '1');
    }, 2500);
  }

  function newFly(x, y) {
    return { x, y, tx: x, ty: y, t: Math.random() * 10, alive: true };
  }

  function setCoins(n) {
    coinCount = n;
    store.set('utopia.coins', n);
    if (hudCoins) hudCoins.textContent = String(n).padStart(2, '0');
  }
  setCoins(coinCount);

  /* ---------- 头像：缩小成像素画挂在墙上 */
  if (data.portrait) {
    const pic = new Image();
    pic.onload = () => {
      const pw = data.portrait.w - 8, ph = data.portrait.h - 8;
      const oc = document.createElement('canvas');
      oc.width = pw;
      oc.height = ph;
      const o = oc.getContext('2d');
      o.imageSmoothingQuality = 'high';
      const s = Math.max(pw / pic.width, ph / pic.height);
      const sw = pw / s, sh = ph / s;
      o.drawImage(pic, (pic.width - sw) / 2, (pic.height - sh) / 2, sw, sh, 0, 0, pw, ph);
      portrait = oc;
    };
    pic.src = '/assets/img/avatar.jpg';
  }

  /* ---------- 输入 */
  const keys = new Set();
  let active = true;

  addEventListener('keydown', (e) => {
    if (!active || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k in MOVE || k in SHOOT) {
      keys.delete(k);
      keys.add(k);
      if (k in MOVE) P.target = null;
      if (k in SHOOT) e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  function toRoom(e) {
    const r = cv.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  }

  cv.addEventListener('pointerdown', (e) => {
    if (P.frozen > 0) return;
    const [x, y] = toRoom(e);
    const fly = flies.find((f) => f.alive && Math.hypot(f.x - x, f.y - y) < 12);
    if (fly) return shootAt(fly.x, fly.y + 6);
    if (poop && poop.hp > 0 && x > poop.x - 2 && x < poop.x + 18 && y > poop.y - 2 && y < poop.y + 16) return shootAt(poop.x + 8, poop.y + 12);
    P.target = { x: clamp(x, B.x0, B.x1), y: clamp(y, B.y0, B.y1) };
  });

  for (const [dir, el] of doorEls) {
    el.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      const d = doors.get(dir);
      if (e.detail === 0 && !d.locked) {
        // 键盘回车：直接进门
        session.set('utopia.door', dir);
        return;
      }
      e.preventDefault();
      const [x, y] = DOOR_ZONE[dir].to;
      P.target = { x, y, door: dir };
    });
  }

  for (const el of shelfEls) {
    el.addEventListener('click', (e) => {
      if (e.detail === 0) return;
      e.preventDefault();
      const sx = Number(el.style.getPropertyValue('--x')), sw = Number(el.style.getPropertyValue('--w'));
      const sy = Number(el.style.getPropertyValue('--y')), sh = Number(el.style.getPropertyValue('--h'));
      P.target = {
        x: sx + sw / 2, y: Math.max(B.y0, sy + sh + 6),
        then: () => document.querySelector(el.hash)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }),
      };
    });
  }

  /* ---------- 动作 */
  function fire(vx, vy) {
    const len = Math.hypot(vx, vy) || 1;
    vx /= len;
    vy /= len;
    tears.push({
      x: P.x + vx * 5, y: P.y - 1 + (vy < 0 ? -2 : 0), z: 12,
      vx: vx * TEAR_SPEED + P.vx * 0.35, vy: vy * TEAR_SPEED + P.vy * 0.35, life: 0.62,
    });
    P.face = dirOf(vx, vy);
    P.shoot = 0.18;
    P.cooldown = FIRE_DELAY;
  }

  function shootAt(x, y) {
    if (P.cooldown > 0) return;
    fire(x - P.x, y - (P.y - 1));
  }

  function burst(x, y, color, n, speed = 40, life = 0.4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(speed * 0.3, speed);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.4, life: rand(life * 0.5, life), color, g: 160 });
    }
  }

  function splat(x, y, colors, n = 9, r = 4) {
    for (let i = 0; i < n; i++) decals.push({ x: Math.round(x + rand(-r, r)), y: Math.round(y + rand(-r * 0.6, r * 0.6)), c: colors[i % colors.length] });
    if (decals.length > 400) decals.splice(0, decals.length - 400);
  }

  function enter(dir) {
    const d = doors.get(dir);
    P.target = null;
    if (d.locked) return bump(dir);
    if (leaving) return;
    leaving = true;
    session.set('utopia.door', dir);
    P.frozen = 9;
    const [vx, vy] = VEC[dir];
    P.vx = vx * SPEED;
    P.vy = vy * SPEED;
    setTimeout(() => (location.href = d.href), reduce ? 0 : 150);
  }

  function bump(dir) {
    if (bumpCd > 0) return;
    bumpCd = 1;
    const [vx, vy] = VEC[dir];
    P.x -= vx * 7;
    P.y -= vy * 7;
    P.vx = P.vy = 0;
    P.cry = 1.1;
    const el = doorEls.get(dir);
    if (el) {
      el.classList.add('is-near');
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('is-near'), 1800);
    }
  }

  function hitSolid(x, y) {
    for (const s of solids) if (x > s.x - 4 && x < s.x + s.w + 4 && y > s.y - 2 && y < s.y + s.h + 2) return true;
    if (poop && poop.hp > 0 && x > poop.x - 2 && x < poop.x + 18 && y > poop.y + 5 && y < poop.y + 16) return true;
    return false;
  }

  /* ---------- 每一帧 */
  function update(dt) {
    time += dt;
    bumpCd = Math.max(0, bumpCd - dt);
    P.frozen = Math.max(0, P.frozen - dt);
    P.cooldown -= dt;
    P.shoot = Math.max(0, P.shoot - dt);
    P.cry = Math.max(0, P.cry - dt);
    P.blink -= dt;
    if (P.blink < -0.12) P.blink = rand(1.5, 4.5);

    // 从天上掉下来
    if (P.hold > 0) P.hold -= dt;
    else if (P.z > 0 || P.vz) {
      P.vz -= 520 * dt;
      P.z += P.vz * dt;
      if (P.z <= 0) {
        P.z = 0;
        if (P.vz < -160) {
          burst(P.x, P.y, '#5a4535', 10, 45, 0.45);
          P.vz = -P.vz * 0.28;
        } else P.vz = 0;
      }
    }

    // 走路：键盘优先，其次是点出来的目标
    let mx = 0, my = 0;
    for (const k of keys) if (MOVE[k]) { mx += VEC[MOVE[k]][0]; my += VEC[MOVE[k]][1]; }
    if (mx || my) P.target = null;
    if (P.target && !P.frozen) {
      const dx = P.target.x - P.x, dy = P.target.y - P.y, dd = Math.hypot(dx, dy);
      if (dd < 1.5) {
        const t = P.target;
        P.target = null;
        if (t.door) enter(t.door);
        else if (t.then) t.then();
      } else {
        mx = dx / dd;
        my = dy / dd;
      }
    }
    const len = Math.hypot(mx, my) || 1;
    const moving = (mx || my) && !P.frozen && P.z === 0;
    const k = 1 - Math.exp(-dt * 14);
    if (!leaving) {
      P.vx += ((moving ? (mx / len) * SPEED : 0) - P.vx) * k;
      P.vy += ((moving ? (my / len) * SPEED : 0) - P.vy) * k;
    }
    const nx = P.x + P.vx * dt, ny = P.y + P.vy * dt;
    if (leaving) {
      P.x = nx;
      P.y = ny;
    } else {
      if (!hitSolid(nx, P.y)) P.x = clamp(nx, B.x0, B.x1);
      else P.vx = 0;
      if (!hitSolid(P.x, ny)) P.y = clamp(ny, B.y0, B.y1);
      else P.vy = 0;
    }
    if (moving) P.dir = dirOf(mx, my);
    P.walk += Math.hypot(P.vx, P.vy) * dt;

    // 进门 / 门口提示
    if (!leaving) {
      for (const [dir, z] of Object.entries(DOOR_ZONE)) {
        if (!doors.has(dir)) continue;
        const inZone = P.x >= z.x0 && P.x <= z.x1 && P.y >= z.y0 && P.y <= z.y1;
        const push = VEC[dir][0] ? Math.sign(mx) === VEC[dir][0] : Math.sign(my) === VEC[dir][1];
        if (inZone && push && (mx || my) && !P.target) enter(dir);
        const el = doorEls.get(dir);
        if (el && !el._t) el.classList.toggle('is-near', inZone);
      }
      for (const el of shelfEls) {
        const sx = Number(el.style.getPropertyValue('--x')), sw = Number(el.style.getPropertyValue('--w'));
        const sb = Number(el.style.getPropertyValue('--y')) + Number(el.style.getPropertyValue('--h'));
        el.classList.toggle('is-near', P.x > sx && P.x < sx + sw && P.y < sb + 18);
      }
    }

    // 射眼泪：最后按下的方向键
    let shootDir = null;
    for (const k2 of keys) if (SHOOT[k2]) shootDir = SHOOT[k2];
    if (shootDir && P.cooldown <= 0 && P.z === 0 && !leaving) fire(...VEC[shootDir]);
    if (!shootDir && P.shoot <= 0) P.face = P.dir;
    if (P.cry > 0 && Math.random() < dt * 10) parts.push({ x: P.x + rand(-6, 6), y: P.y - 12, vx: rand(-15, 15), vy: rand(-20, 0), life: 0.4, color: '#a8defa', g: 180 });

    // 眼泪
    for (const t of tears) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.life < 0.15) t.z = Math.max(0, 12 * (t.life / 0.15));
      let hit = t.life <= 0 || t.x < FLOOR.x + 1 || t.x > FLOOR.x + FLOOR.w - 1 || t.y < FLOOR.y + 1 || t.y > FLOOR.y + FLOOR.h;
      if (!hit && solids.some((s) => t.x > s.x && t.x < s.x + s.w && t.y > s.y && t.y < s.y + s.h)) hit = true;
      if (!hit && poop && poop.hp > 0 && t.x > poop.x && t.x < poop.x + 16 && t.y > poop.y + 2 && t.y < poop.y + 15) {
        hit = true;
        poop.hp--;
        poop.shake = 0.15;
        burst(t.x, t.y - 4, '#7b4b2a', 5, 40, 0.35);
        if (poop.hp === 0) {
          splat(poop.x + 8, poop.y + 12, ['#4a2e17', '#58331b', '#3b2412'], 22, 7);
          if (Math.random() < 0.65) coins.push({ x: poop.x + 8, y: poop.y + 12, z: 0, vz: 70, vx: rand(-20, 20), vy: rand(5, 20) });
        }
      }
      if (!hit) {
        for (const f of flies) {
          if (f.alive && Math.hypot(f.x - t.x, f.y - (t.y - t.z)) < 6) {
            f.alive = false;
            hit = true;
            burst(f.x, f.y, '#c41e24', 8, 50, 0.45);
            splat(f.x, f.y + 10, ['#7a0f14', '#c41e24', '#5c0b0f'], 8, 3);
          }
        }
      }
      if (hit) {
        t.dead = true;
        burst(t.x, t.y - t.z, '#a8defa', 6, 38, 0.3);
      }
    }
    for (let i = tears.length - 1; i >= 0; i--) if (tears[i].dead) tears.splice(i, 1);

    // 苍蝇到处乱飞；全打死了过一会儿从墙缝里再钻出来一只
    for (const f of flies) {
      if (!f.alive) continue;
      f.t += dt;
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
      if (d < 3) {
        f.tx = rand(FLOOR.x + 10, FLOOR.x + FLOOR.w - 10);
        f.ty = rand(FLOOR.y + 4, FLOOR.y + FLOOR.h - 26);
      }
      f.x += (dx / (d || 1)) * 22 * dt + Math.sin(f.t * 9) * 0.3;
      f.y += (dy / (d || 1)) * 22 * dt + Math.cos(f.t * 11) * 0.3;
    }
    if (flies.length && flies.every((f) => !f.alive)) {
      flyTimer += dt;
      if (flyTimer > 20) {
        flyTimer = 0;
        flies.length = 0;
        flies.push(newFly(rand(40, 200), FLOOR.y + 4));
      }
    }
    if (poop) poop.shake = Math.max(0, poop.shake - dt);

    // 硬币弹两下，走过去就捡起来
    for (const c of coins) {
      c.vz -= 300 * dt;
      c.z = Math.max(0, c.z + c.vz * dt);
      if (c.z === 0) {
        c.vz = Math.abs(c.vz) > 30 ? -c.vz * 0.4 : 0;
        c.vx *= 0.9;
        c.vy *= 0.9;
      }
      c.x = clamp(c.x + c.vx * dt, B.x0, B.x1);
      c.y = clamp(c.y + c.vy * dt, B.y0, B.y1);
      if (c.z < 3 && Math.hypot(c.x - P.x, c.y - P.y) < 9) {
        c.dead = true;
        setCoins(coinCount + 1);
        burst(c.x, c.y - 4, '#fff1a8', 8, 45, 0.4);
      }
    }
    for (let i = coins.length - 1; i >= 0; i--) if (coins[i].dead) coins.splice(i, 1);

    for (const p of parts) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    for (const d of decals) {
      ctx.fillStyle = d.c;
      ctx.fillRect(d.x, d.y, 1, 1);
    }
    if (portrait) ctx.drawImage(portrait, data.portrait.x + 4, data.portrait.y + 4);

    // 烛光
    if (candles.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const c of candles) {
        const f = 0.85 + Math.sin(time * 9 + c.phase * 3) * 0.08 + Math.random() * 0.05;
        const g = ctx.createRadialGradient(c.x + 2, c.y + 2, 1, c.x + 2, c.y + 2, 30 * f);
        g.addColorStop(0, 'rgba(255,170,70,.22)');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(c.x - 30, c.y - 30, 64, 64);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // 影子
    const shadowAlpha = 0.35 * Math.max(0.2, 1 - P.z / 90);
    drawSprite(ctx, img, 'shadow', P.x - 7, P.y - 3, { alpha: shadowAlpha });
    for (const t of tears) drawSprite(ctx, img, 'shadow', t.x - 7, t.y - 2, { alpha: 0.18 });

    // 按脚的位置从上往下画
    const list = [];
    if (poop && poop.hp > 0) list.push([poop.y + 14, () => drawSprite(ctx, img, ['', 'poop.1', 'poop.2', 'poop.3', 'poop'][poop.hp], poop.x + (poop.shake > 0 ? (Math.random() < 0.5 ? -1 : 1) : 0), poop.y)]);
    for (const c of candles) list.push([c.y + 11, () => drawSprite(ctx, img, ['candle', 'candle.2', 'candle.3'][Math.floor(time * 7 + c.phase) % 3], c.x, c.y)]);
    for (const c of coins) list.push([c.y, () => drawSprite(ctx, img, 'coin', c.x - 3, c.y - 7 - c.z)]);
    list.push([P.y, () => {
      const speed = Math.hypot(P.vx, P.vy);
      const body = speed > 8 ? (Math.floor(P.walk / 7) % 2 ? 'isaac.body.walk1' : 'isaac.body.walk2') : 'isaac.body';
      const sad = P.shoot > 0 || P.cry > 0;
      drawIsaac(ctx, img, P.x - 9, P.y - 23 - P.z, {
        dir: P.face, body,
        eye: sad ? 'isaac.eye.shut' : P.blink < 0 ? 'isaac.eye.blink' : 'isaac.eye',
        mouth: sad ? 'isaac.mouth.open' : 'isaac.mouth',
        bob: speed > 8 && Math.floor(P.walk / 7) % 2 ? 1 : 0,
      });
    }]);
    list.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw());

    for (const f of flies) if (f.alive) drawSprite(ctx, img, Math.floor(f.t * 20) % 2 ? 'fly.1' : 'fly.2', f.x - 3, f.y - 3);
    for (const t of tears) drawSprite(ctx, img, 'tear', t.x - 3, t.y - 3 - t.z);
    for (const p of parts) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }

  /* ---------- 循环、可见性、整数倍缩放 */
  let raf = 0, last = 0, running = false;
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    update(dt);
    render();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || !img) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    keys.clear();
  }

  new IntersectionObserver(
    ([entry]) => {
      active = entry.intersectionRatio >= 0.35;
      document.dispatchEvent(new CustomEvent('utopia:stage', { detail: { visible: entry.intersectionRatio >= 0.25 } }));
      if (entry.intersectionRatio > 0 && !document.hidden) start();
      else stop();
    },
    { threshold: [0, 0.25, 0.35, 0.6] },
  ).observe(box);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  // 宽度凑成 240 的整数倍（按设备像素），像素才一样大；凑不整就保持流式
  function snap() {
    box.style.width = '';
    const avail = box.getBoundingClientRect().width;
    const dpr = devicePixelRatio || 1;
    const k = Math.floor((avail * dpr) / W);
    const snapped = (k * W) / dpr;
    if (k >= 2 && snapped >= avail * 0.88) box.style.width = `${snapped}px`;
  }
  snap();
  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(snap, 100);
  });

  px.loadSheet().then((i) => {
    img = i;
    start();
  });
}
