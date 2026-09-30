/* 跑团页的塔罗：韦特 78 张，带逆位。三种玩法：每日一张（一天只抽一次）、三张牌阵（过去 / 现在 / 未来）、
   凯尔特十字（十张）。洗牌用 crypto.getRandomValues。牌面是 Pamela Colman Smith 1909 年的原版，公有领域。 */
import { CARDS } from './tarot-cards.js';

const $ = (s, el) => el.querySelector(s);
const $$ = (s, el) => Array.from(el.querySelectorAll(s));

function roll(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return (buf[0] % n) + 1;
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
const SPREADS = {
  daily: {
    n: 1,
    pos: ['今天'],
    desc: '一天只抽一张。抽之前不用想问题，抽到什么就是今天的关键词，明天再来。',
    draw: '抽一张',
    again: '今天抽过了',
  },
  three: {
    n: 3,
    pos: ['过去', '现在', '未来'],
    desc: '心里想一个具体的问题，三张牌从左到右：过去、现在、未来。',
    draw: '抽三张',
    again: '重抽',
  },
  celtic: {
    n: 10,
    pos: ['现状', '阻碍', '根基', '过去', '目标', '近未来', '自己', '环境', '希望与恐惧', '结果'],
    desc: '经典的十张牌阵。左边的十字讲问题本身：现状、横在上面的阻碍、根基、过去、目标、近未来；右边一列讲你和周围：自己的态度、环境、希望与恐惧、结果。',
    draw: '抽十张',
    again: '重抽',
  },
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 洗牌，抽 n 张，每张一半概率逆位
function draw(n) {
  const deck = CARDS.map((_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = roll(i + 1) - 1;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n).map((i) => ({ card: CARDS[i], rev: roll(2) === 1 }));
}

function cardEl({ card, rev }, i, label, { caption = true } = {}) {
  const fig = document.createElement('figure');
  fig.className = `tcard${rev ? ' is-rev' : ''}`;
  fig.style.setProperty('--i', i);
  fig.dataset.card = card.id;
  fig.innerHTML = `<div class="tcard-in">
    <i class="tcard-back" aria-hidden="true"></i>
    <img class="tcard-front" src="/assets/tarot/${card.id}.webp" width="480" height="835" alt="${card.name}（${rev ? '逆位' : '正位'}）">
  </div>${caption ? `<figcaption>${label}</figcaption>` : ''}`;
  return fig;
}

export function init(box, { mascot, store, reduce }) {
  const spreadBtns = $$('.seg-btn[data-spread]', box);
  const desc = $('.tarot-desc', box);
  const stage = $('.tarot-spread', box);
  const btn = $('.tarot-draw', box);
  const status = $('.tarot-status', box);
  const reading = $('.tarot-reading', box);
  let spread = store.get('utopia.tarot.spread', 'daily');
  if (!SPREADS[spread]) spread = 'daily';
  let busy = false;

  function setStatus(text) {
    status.textContent = text;
  }

  function readingList(cards) {
    reading.innerHTML = '';
    cards.forEach(({ card, rev }, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="tr-pos">${CIRCLED[i]} ${SPREADS[spread].pos[i]}</span>
        <span class="tr-main"><b class="tr-name">${card.name}</b><span class="tr-en">${card.en}</span><em class="tr-ori${rev ? ' is-rev' : ''}">${rev ? '逆位' : '正位'}</em></span>
        <span class="tr-kw">${rev ? card.rev : card.up}</span>`;
      reading.append(li);
    });
    reading.hidden = !cards.length;
  }

  // 把牌摆到牌阵上，再一张张翻开
  function lay(cards) {
    stage.innerHTML = '';
    stage.dataset.layout = spread;
    const S = SPREADS[spread];
    const els = [];
    if (spread === 'celtic') {
      const cross = document.createElement('div');
      cross.className = 'tcross';
      const staff = document.createElement('div');
      staff.className = 'tstaff';
      const cell = (cls, ...kids) => {
        const d = document.createElement('div');
        d.className = `tcell ${cls}`;
        d.append(...kids);
        return d;
      };
      const c = cards.map((x, i) => cardEl(x, i, `${CIRCLED[i]} ${S.pos[i]}`, { caption: i !== 1 }));
      c[1].classList.add('tcard-cross');
      const cap = document.createElement('p');
      cap.className = 'tcell-cap';
      cap.textContent = `${CIRCLED[1]} ${S.pos[1]}`;
      cross.append(
        cell('tc-5', c[4]),
        cell('tc-4', c[3]),
        cell('tc-1', c[0], c[1], cap),
        cell('tc-6', c[5]),
        cell('tc-3', c[2]),
      );
      staff.append(c[9], c[8], c[7], c[6]);
      stage.append(cross, staff);
      els.push(...c);
    } else {
      cards.forEach((x, i) => {
        const el = cardEl(x, i, spread === 'daily' ? '' : `${CIRCLED[i]} ${S.pos[i]}`);
        stage.append(el);
        els.push(el);
      });
    }
    // 先摆牌背，下一帧再翻，不然没有动画
    return new Promise((resolve) => {
      if (reduce) {
        els.forEach((el) => el.classList.add('is-up'));
        resolve();
        return;
      }
      requestAnimationFrame(() => {
        els.forEach((el, i) => setTimeout(() => el.classList.add('is-up'), 120 + i * 260));
        setTimeout(resolve, 120 + els.length * 260 + 500);
      });
    });
  }

  function react(cards) {
    if (!mascot) return;
    const ids = cards.map(({ card, rev }) => `${card.id}${rev ? 'r' : ''}`);
    if (ids.includes('m19') || ids.includes('m21')) mascot.speak('crit');
    else if (ids.includes('m16') || ids.includes('m13')) mascot.speak('fumble');
  }

  function summary(cards) {
    const S = SPREADS[spread];
    if (spread === 'daily') {
      const { card, rev } = cards[0];
      return `今天的牌：${card.name}${rev ? '（逆位）' : ''}。关键词：${rev ? card.rev : card.up}。`;
    }
    return cards.map(({ card, rev }, i) => `${S.pos[i]}：${card.name}${rev ? '（逆位）' : ''}`).join('；') + '。';
  }

  async function show(cards, { stored = false } = {}) {
    busy = true;
    btn.disabled = true;
    setStatus(stored ? '今天已经抽过了，这是今天的牌。' : '洗牌中……');
    reading.hidden = true;
    await lay(cards);
    setStatus(summary(cards));
    readingList(cards);
    if (!stored) react(cards);
    busy = false;
    refreshBtn();
  }

  function dailyRecord() {
    const rec = store.get('utopia.tarot.daily');
    if (!rec || rec.d !== today()) return null;
    const card = CARDS.find((c) => c.id === rec.id);
    return card ? [{ card, rev: !!rec.rev }] : null;
  }

  function refreshBtn() {
    const S = SPREADS[spread];
    const done = spread === 'daily' && dailyRecord();
    btn.disabled = busy || !!done;
    btn.textContent = done ? S.again : stage.querySelector('.tcard') ? S.again : S.draw;
  }

  // 还没抽的时候，牌阵位置上放一叠牌背，点它也能抽
  function deckEl() {
    const d = document.createElement('div');
    d.className = 'tdeck';
    d.setAttribute('role', 'button');
    d.tabIndex = 0;
    d.setAttribute('aria-label', SPREADS[spread].draw);
    d.innerHTML = '<i class="tcard-back"></i><i class="tcard-back"></i><i class="tcard-back"></i>';
    d.addEventListener('click', go);
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
    return d;
  }

  function setSpread(next, { silent = false } = {}) {
    spread = next;
    store.set('utopia.tarot.spread', spread);
    spreadBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.spread === spread)));
    desc.textContent = SPREADS[spread].desc;
    stage.innerHTML = '';
    stage.dataset.layout = spread;
    reading.hidden = true;
    reading.innerHTML = '';
    const rec = spread === 'daily' ? dailyRecord() : null;
    if (rec) show(rec, { stored: true });
    else {
      stage.replaceChildren(deckEl());
      if (!silent) setStatus(spread === 'daily' ? '今天还没抽。' : '点「' + SPREADS[spread].draw + '」开始。');
    }
    refreshBtn();
  }

  function go() {
    if (busy) return;
    const S = SPREADS[spread];
    if (spread === 'daily' && dailyRecord()) return;
    const cards = draw(S.n);
    if (spread === 'daily') store.set('utopia.tarot.daily', { d: today(), id: cards[0].card.id, rev: cards[0].rev });
    show(cards);
  }

  spreadBtns.forEach((b) => b.addEventListener('click', () => !busy && setSpread(b.dataset.spread)));
  btn.addEventListener('click', go);
  setSpread(spread);
  btn.disabled = busy || (spread === 'daily' && !!dailyRecord());
}
