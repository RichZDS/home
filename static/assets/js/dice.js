/* 跑团页的骰塔：CoC d100（对 50 检定）、三角机构 6d4、DnD 多面骰。
   每次都是新的随机数（crypto.getRandomValues，拒绝采样避免取模偏差）。骰子从塔底滚出来，停下后给出判定。 */

const $ = (s, el) => el.querySelector(s);
const $$ = (s, el) => Array.from(el.querySelectorAll(s));

function roll(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return (buf[0] % n) + 1;
}
const pick = (list) => list[roll(list.length) - 1];

// 各种骰子的样子：形状 + 颜色（对应构建时画好的精灵 .px-die-形状-颜色）
const LOOK = {
  4: ['d4', 'blue'], 6: ['d6', 'ivory'], 8: ['d8', 'green'], 10: ['d10', 'purple'], 12: ['d12', 'orange'], 20: ['d20', 'red'],
};

const NOTES = {
  crit: ['今天宜开团，骰子站在你这边', '这份运气记得留到正式团里'],
  extreme: ['手感烫得吓人', '这把 KP 也拦不住'],
  hard: ['稳稳地过了', '难不倒你'],
  ok: ['过了，不多不少', '有惊无险'],
  bad: ['没过……KP 在笑', '这把不太行'],
  close: ['差一点点', '就差那么一口气'],
  fumble: ['今天还是别碰骰子了', '先来个理智检定吧'],
};

// 每种规则：投哪些骰子、怎么判定。返回 { dice: [{ shape, color, label, hit, bad }], num, verdict, cls, note, react }
const MODES = {
  coc() {
    const tens = roll(10) - 1, units = roll(10) - 1;
    const total = tens * 10 + units || 100;
    let key, verdict;
    if (total === 1) [key, verdict] = ['crit', '大成功'];
    else if (total === 100) [key, verdict] = ['fumble', '大失败'];
    else if (total <= 10) [key, verdict] = ['extreme', '极难成功'];
    else if (total <= 25) [key, verdict] = ['hard', '困难成功'];
    else if (total <= 50) [key, verdict] = ['ok', '成功'];
    else [key, verdict] = ['bad', '失败'];
    const cls = { crit: 'v-crit', extreme: 'v-good', hard: 'v-good', ok: 'v-ok', bad: 'v-bad', fumble: 'v-fumble' }[key];
    const glow = { hit: key === 'crit', bad: key === 'fumble' };
    return {
      dice: [
        { shape: 'd10', color: 'ivory', label: `${tens}0`, ...glow },
        { shape: 'd10', color: 'red', label: String(units), ...glow },
      ],
      num: String(total).padStart(2, '0'),
      verdict,
      cls,
      note: `对 50 · ${pick(NOTES[key === 'bad' && total <= 60 ? 'close' : key])}`,
      react: key === 'crit' ? 'crit' : key === 'fumble' ? 'fumble' : null,
    };
  },
  ta() {
    const values = Array.from({ length: 6 }, () => roll(4));
    const threes = values.filter((v) => v === 3).length;
    const chaos = threes === 3 ? 0 : 6 - threes;
    let verdict, cls, note;
    if (threes === 3) [verdict, cls, note] = ['Triscendence', 'v-crit', '正好三个 3：自动成功，不产生混沌'];
    else if (threes === 0) [verdict, cls, note] = ['失败', 'v-bad', `一个 3 都没有，产生 ${chaos} 点混沌`];
    else [verdict, cls, note] = [`成功 ×${threes}`, 'v-good', `产生 ${chaos} 点混沌`];
    return {
      dice: values.map((v) => ({ shape: 'd4', color: v === 3 ? 'gold' : 'ivory', label: String(v), hit: v === 3 })),
      num: `${threes} 个 3`,
      verdict,
      cls,
      note,
      react: threes === 3 ? 'crit' : null,
    };
  },
  dnd(die) {
    if (die === 100) {
      const tens = roll(10) - 1, units = roll(10) - 1;
      const total = tens * 10 + units || 100;
      return {
        dice: [
          { shape: 'd10', color: 'purple', label: `${tens}0` },
          { shape: 'd10', color: 'ivory', label: String(units) },
        ],
        num: String(total),
        verdict: '',
        cls: 'v-ok',
        note: 'd100',
      };
    }
    const v = roll(die);
    const [shape, color] = LOOK[die];
    const nat20 = die === 20 && v === 20, nat1 = die === 20 && v === 1;
    return {
      dice: [{ shape, color, label: String(v), hit: nat20, bad: nat1 }],
      num: String(v),
      verdict: nat20 ? '天然 20！' : nat1 ? '天然 1……' : '',
      cls: nat20 ? 'v-crit' : nat1 ? 'v-fumble' : 'v-ok',
      note: `d${die}`,
      react: nat20 ? 'crit' : nat1 ? 'fumble' : null,
    };
  },
};

// 还没投的时候托盘里摆的骰子
function idle(mode, die) {
  if (mode === 'coc') return [{ shape: 'd10', color: 'ivory', label: '?' }, { shape: 'd10', color: 'red', label: '?' }];
  if (mode === 'ta') return Array.from({ length: 6 }, () => ({ shape: 'd4', color: 'ivory', label: '?' }));
  if (die === 100) return [{ shape: 'd10', color: 'purple', label: '?' }, { shape: 'd10', color: 'ivory', label: '?' }];
  const [shape, color] = LOOK[die];
  return [{ shape, color, label: '?' }];
}

function dieEl(d) {
  const el = document.createElement('i');
  el.className = `die px px-die-${d.shape}-${d.color}${d.hit ? ' is-hit' : ''}${d.bad ? ' is-bad' : ''}`;
  el.dataset.shape = d.shape;
  el.dataset.color = d.color;
  el.innerHTML = `<b>${d.label}</b>`;
  return el;
}

export function init(box, { mascot, store, reduce }) {
  const tray = $('.dice-tray', box);
  const btn = $('.dice-roll', box);
  const out = $('.dice-result', box);
  const modeBtns = $$('.seg-btn', box);
  const pickRow = $('.dice-pick', box);
  const dieBtns = $$('[data-die]', box);
  const rules = $$('.dice-rule[data-for]', box);
  let mode = store.get('utopia.dice.mode', 'coc');
  let die = store.get('utopia.dice.die', 20);
  if (!MODES[mode]) mode = 'coc';
  if (!dieBtns.some((b) => Number(b.dataset.die) === die)) die = 20;
  let busy = false;

  function showIdle() {
    tray.replaceChildren(...idle(mode, die).map((d) => {
      const el = dieEl(d);
      el.classList.add('is-idle');
      return el;
    }));
    out.textContent = '点「投！」看看今天的手气';
  }

  function setMode(next) {
    mode = next;
    store.set('utopia.dice.mode', mode);
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    pickRow.hidden = mode !== 'dnd';
    rules.forEach((p) => (p.hidden = p.dataset.for !== mode));
    showIdle();
  }
  function setDie(next) {
    die = next;
    store.set('utopia.dice.die', die);
    dieBtns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.die) === die)));
    showIdle();
  }

  function showResult(r) {
    out.innerHTML = '';
    const add = (cls, text) => {
      if (!text) return;
      const s = document.createElement('span');
      s.className = cls;
      s.textContent = text;
      out.append(s);
    };
    add('res-num', r.num);
    add(`res-verdict ${r.cls}`, r.verdict);
    add('res-note', r.note);
    if (r.react && mascot) mascot.speak(r.react);
  }

  // 骰子从左边塔底的出口滚进托盘：边走边转，点数乱跳，最后停在结果上
  function tumble(el, final, i) {
    const b = el.firstChild;
    const trayBox = tray.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const dx = trayBox.left - box.left - box.width / 2;
    const dy = trayBox.bottom - box.bottom - 6;
    const spin = (roll(2) === 1 ? 1 : -1) * 360 * (1 + roll(2));
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.3 - 18}px) rotate(${spin * 0.45}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx * 0.2}px, 0px) rotate(${spin * 0.8}deg)`, offset: 0.7 },
        { transform: `translate(${dx * 0.06}px, -6px) rotate(${spin * 0.95}deg)`, offset: 0.85 },
        { transform: 'translate(0, 0) rotate(' + spin + 'deg)' },
      ],
      { duration: 720 + i * 60, delay: i * 90, easing: 'cubic-bezier(.25,.7,.35,1)', fill: 'backwards' },
    );
    const faces = el.dataset.shape === 'd10' ? 10 : Number(el.dataset.shape.slice(1));
    const flicker = setInterval(() => (b.textContent = String(roll(faces))), 70);
    return anim.finished.then(() => {
      clearInterval(flicker);
      b.textContent = final;
    });
  }

  async function go() {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    const r = MODES[mode](die);
    const els = r.dice.map((d) => dieEl({ ...d, hit: false, bad: false }));
    tray.replaceChildren(...els);
    out.textContent = '骰子在塔里滚……';
    if (!reduce) await Promise.all(els.map((el, i) => tumble(el, r.dice[i].label, i)).map((p) => p.catch(() => {})));
    els.forEach((el, i) => {
      const d = r.dice[i];
      el.firstChild.textContent = d.label;
      el.classList.toggle('is-hit', !!d.hit);
      el.classList.toggle('is-bad', !!d.bad);
    });
    showResult(r);
    busy = false;
    btn.disabled = false;
  }

  modeBtns.forEach((b) => b.addEventListener('click', () => !busy && setMode(b.dataset.mode)));
  dieBtns.forEach((b) => b.addEventListener('click', () => !busy && setDie(Number(b.dataset.die))));
  btn.addEventListener('click', go);
  setDie(die);
  setMode(mode);
  btn.disabled = false;
}
