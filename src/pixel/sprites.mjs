// 手画的像素精灵：每个字符是一个像素，'.' 透明，其余字母查 PAL 调色板。
// 构建时画进房间背景和精灵图集，运行时从图集里取帧。所有形象都是照着以撒的画风重新画的，没有用游戏素材。
import { rgba } from './raster.mjs';

export const PAL = {
  k: '#1c100d', // 描边
  K: '#3b2520', // 深阴影
  s: '#f2c9b7', // 以撒的皮肤
  S: '#d9a291',
  h: '#fde7dc',
  e: '#140c0a', // 眼睛
  w: '#ffffff',
  m: '#7c2f28', // 嘴
  t: '#a8defa', // 眼泪
  T: '#5eb0e8',
  U: '#2c6aa8',
  W: '#ecf9ff',
  r: '#c41e24', // 血、红心
  R: '#7a0f14',
  H: '#ff9a9a',
  p: '#7b4b2a', // 便便
  P: '#58331b',
  q: '#a26e42',
  g: '#6f6259', // 石头
  G: '#4f443d',
  j: '#8e8076',
  y: '#f5c84c', // 金
  Y: '#b88a2c',
  Z: '#fff1a8',
  o: '#7a4f2b', // 木头
  O: '#553519',
  u: '#9c6a3c',
  x: '#eadfc2', // 纸、蜡
  X: '#c7b48b',
  l: '#ffe07a', // 火焰
  L: '#ff9d3c',
  b: '#3a57a8', // 书脊
  B: '#27397a',
  v: '#8a3b8f',
  n: '#2f7d4a',
  N: '#1f5433',
  c: '#ded6c8', // 粉笔
  C: '#9e968a',
  D: '#3a3a44', // 炸弹
  E: '#6c6c7a',
  i: '#c8d2dccc', // 苍蝇翅膀（半透明）
};

const ART = {
  // —— 以撒 ——————————————————————————————————————————
  // 头（不含五官），18×16。眼睛和嘴单独画，好做眨眼、看鼠标、哭
  'isaac.head': `
......kkkkkk......
....kkhhsssskk....
...khhhssssssSk...
..khhsssssssssSk..
.khsssssssssssSSk.
.kssssssssssssSSk.
kssssssssssssssSSk
kssssssssssssssSSk
kssssssssssssssSSk
kssssssssssssssSSk
ksssssssssssssSSSk
.ksssssssssssSSSk.
.ksssssssssssSSSk.
..kssssssssSSSSk..
...kksssSSSSSkk...
.....kkkkkkkk.....`,
  // 后脑勺
  'isaac.head.back': `
......kkkkkk......
....kkhhsssskk....
...khhhssssssSk...
..khhsssssssssSk..
.khsssssssssssSSk.
.kssssssssssssSSk.
kssssssssssssssSSk
kssssssssssssssSSk
kssssssssssssssSSk
ksssssssssssssSSSk
ksssssssssssssSSSk
.kssssssssssSSSSk.
.kssssssssssSSSSk.
..ksssssssSSSSSk..
...kkSSSSSSSSkk...
.....kkkkkkkk.....`,
  'isaac.eye': `
.ee.
ewee
eeee
eeee
.ee.`,
  'isaac.eye.blink': `
....
....
....
eeee
....`,
  'isaac.eye.shut': `
....
....
eeee
.ee.
....`,
  'isaac.eye.dead': `
....
e..e
.ee.
.ee.
e..e`,
  'isaac.mouth': `
mm`,
  'isaac.mouth.open': `
.mm.
mmmm
.mm.`,
  // 身体 18×7（接在头下面）
  'isaac.body': `
....kSSssssSSk....
...kskssssssksk...
...kskssssssksk...
...kSksssssskSk...
....kSssssssSk....
.....ksskkssk.....
.....kkkkkkkk.....`,
  'isaac.body.walk1': `
....kSSssssSSk....
...kskssssssksk...
...kskssssssksk...
...kSksssssskSk...
....kSssssssSk....
.....kkkkkssk.....
.........kkkk.....`,
  'isaac.body.walk2': `
....kSSssssSSk....
...kskssssssksk...
...kskssssssksk...
...kSksssssskSk...
....kSssssssSk....
.....ksskkkkk.....
.....kkkk.........`,
  // 硫磺火的羊角（戴在头上）
  'isaac.horns': `
.kk............kk.
kRrk..........kRrk
.kRrk........kRrk.
..kRk........kRk..`,
  shadow: `
...kkkkkkkk...
.kkkkkkkkkkkk.
kkkkkkkkkkkkkk
.kkkkkkkkkkkk.
...kkkkkkkk...`,
  tear: `
.UUUU.
UWWttU
UWtttU
UtttTU
UttTTU
.UUUU.`,
  'blood.tear': `
.RRRR.
RHHrrR
RHrrrR
RrrrrR
RrrRRR
.RRRR.`,

  // —— 小怪和障碍 ——————————————————————————————————————
  'fly.1': `
ii...ii
.ii.ii.
..kkk..
.kkkkk.
.kwkwk.
.kkkkk.
..kkk..`,
  'fly.2': `
.......
.......
iikkkii
ikkkkki
.kwkwk.
.kkkkk.
..kkk..`,
  poop: `
......kkkk......
.....kqqppk.....
.....kqpppk.....
....kkkppPkkk...
...kqqqkkkkPPk..
..kqqppppppppPk.
..kqpppppppppPk.
.kkkkppppppPkkkk
kqqqkkkkkkkkPPPk
kqppppppppppppPk
kqppppppppppppPk
kppppppppppppPPk
.kPPPPPPPPPPPPk.
..kkkkkkkkkkkk..`,
  rock: `
....kkkkkk......
...kjjjggGkk....
..kjjggggGGGk...
.kjggggggGGGGk..
.kjgggggkGGGGGk.
kjggggggkGGGGGGk
kjgggggkGGGGGGGk
kggggGkGGGGGGGGk
kgggGGGGGGGGGGKk
kGGGGGGGGGGGGKKk
.kGGGGGGGGGKKKk.
..kKKKKKKKKKKk..
...kkkkkkkkkk...`,
  candle: `
..l..
.lLl.
.lLl.
..k..
.xxx.
.xxX.
.xxX.
.xxX.
.xXX.
kOOOk
.kkk.`,
  'candle.2': `
.l...
.lL..
.lLl.
..k..
.xxx.
.xxX.
.xxX.
.xxX.
.xXX.
kOOOk
.kkk.`,
  'candle.3': `
...l.
..Ll.
.lLl.
..k..
.xxx.
.xxX.
.xxX.
.xxX.
.xXX.
kOOOk
.kkk.`,

  // —— HUD ——————————————————————————————————————————
  heart: `
.kkk.kkk.
krHrkrrrk
krrrrrrrk
krrrrrrRk
.krrrrRk.
..krrRk..
...kRk...
....k....`,
  'heart.half': `
.kkk.kkk.
krHrkKKKk
krrrrKKKk
krrrrKKKk
.krrrKKk.
..krrKk..
...kRk...
....k....`,
  'heart.empty': `
.kkk.kkk.
kKKKkKKKk
kKKKKKKKk
kKKKKKKKk
.kKKKKKk.
..kKKKk..
...kKk...
....k....`,
  coin: `
..kkk..
.kyyyk.
kyZyyYk
kyZyyYk
kyyyyYk
.kYYYk.
..kkk..`,
  bomb: `
......l.
.....k..
..kkkkk.
.kDEDDDk
.kEDDDDk
.kDDDDDk
.kDDDDDk
..kkkkk.`,
  key: `
.kkk.....
kcCckkkkk
kC.CcccCk
kcCckkCkk
.kkk..k..`,

  // —— 门和小地图上的图标（7×7）——————————————————————————
  'icon.book': `
kkkkkkk
kbbbbxk
kbwbbxk
kbbbbxk
kbbbbxk
kBBBBxk
kkkkkkk`,
  'icon.die': `
.kkkkk.
kewwwwk
kwwwwwk
kwwewwk
kwwwwwk
kwwwwek
.kkkkk.`,
  'icon.star': `
...y...
...y...
yyyyyyy
.yyZyy.
..yyy..
.yy.yy.
.y...y.`,
  'icon.crown': `
y..y..y
yy.y.yy
yyyyyyy
yZyZyZy
yyyyyyy
YYYYYYY
.......`,
  'icon.coin': `
..kkk..
.kyyyk.
kyZyyYk
kyZyyYk
kyyyyYk
.kYYYk.
..kkk..`,
  'icon.angel': `
.yyyyy.
y.....y
.yyyyy.
.......
ww...ww
www.www
.w...w.`,
  'icon.lock': `
..CCC..
.C...C.
.C...C.
yyyyyyy
yyykyyy
yyykyyy
YYYYYYY`,
  'icon.skull': `
.ccccc.
ccccccc
ckcccck
ckcccck
ccccccc
.ccccc.
.c.c.c.`,

  // —— 粉笔：操作说明 ————————————————————————————————————
  'chalk.key': `
.ccccccccc.
c.........c
c.........c
c.........c
c.........c
c.........c
c.........c
c.........c
c.........c
c.........c
.ccccccccc.`,
  'chalk.W': `
c...c
c...c
c.c.c
cc.cc
c...c`,
  'chalk.A': `
.ccc.
c...c
ccccc
c...c
c...c`,
  'chalk.S': `
.cccc
c....
.ccc.
....c
cccc.`,
  'chalk.D': `
cccc.
c...c
c...c
c...c
cccc.`,
  'chalk.E': `
ccccc
c....
cccc.
c....
ccccc`,
  'chalk.up': `
..c..
.ccc.
c.c.c
..c..
..c..`,
};

const cache = new Map();

export function sprite(name) {
  if (cache.has(name)) return cache.get(name);
  const art = ART[name];
  if (!art) throw new Error(`没有这个精灵：${name}`);
  const rows = art.replace(/^\n/, '').split('\n');
  const w = Math.max(...rows.map((r) => r.length));
  const px = [];
  rows.forEach((row, j) => {
    if (row.length !== w) throw new Error(`精灵 ${name} 第 ${j + 1} 行宽度 ${row.length}，应为 ${w}`);
    for (const ch of row) {
      if (ch === '.') px.push(null);
      else if (PAL[ch]) px.push(rgba(PAL[ch]));
      else throw new Error(`精灵 ${name} 用了调色板里没有的字符 "${ch}"`);
    }
  });
  const s = { name, w, h: rows.length, px };
  cache.set(name, s);
  return s;
}

export const SPRITE_NAMES = Object.keys(ART);

// 从已有精灵派生：裁掉上面几行（便便被打掉一截），高度不变
export function cropTop(base, rows, name) {
  const px = base.px.map((c, i) => (Math.floor(i / base.w) < rows ? null : c));
  return { name, w: base.w, h: base.h, px };
}
