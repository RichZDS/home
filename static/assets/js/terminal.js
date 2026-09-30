// 站内终端：按 ` 或 Ctrl+K 打开。第一次打开时才加载这个模块和 /search.json。
const PROMPT = 'guest@richzds:~$';
const PAGES = { home: '/', '~': '/', posts: '/posts/', projects: '/projects/', about: '/about/' };

let api = null;
let overlay, out, input;
let data = null;
const history = [];
let hIndex = 0;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const span = (cls, text) => `<span class="${cls}">${esc(text)}</span>`;
const link = (href, text) =>
  `<a href="${esc(href)}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}>${esc(text)}</a>`;

const BANNER = String.raw`
 ____   _        _      _____ ____   ____
|  _ \ (_)  ___ | |__  |__  /|  _ \ / ___|
| |_) || | / __|| '_ \   / / | | | |\___ \
|  _ < | || (__ | | | | / /_ | |_| | ___) |
|_| \_\|_| \___||_| |_|/____||____/ |____/`;

export function open(ctx) {
  api = ctx;
  if (!overlay) build();
  overlay.classList.add('open');
  setTimeout(() => input.focus(), 60);
  loadData();
}

function close() {
  overlay.classList.remove('open');
  input.blur();
}

async function loadData() {
  if (data) return data;
  try {
    const res = await fetch('/search.json');
    data = await res.json();
  } catch {
    data = { posts: [], repos: [], langs: [] };
  }
  return data;
}

function build() {
  overlay = document.createElement('div');
  overlay.className = 'term-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '站内终端');
  overlay.innerHTML = `<div class="term">
  <div class="term-bar"><b>RICHZDS_SHELL</b><span>v2.0.77</span><span class="c-dim">tty1</span><button class="term-close" type="button" aria-label="关闭终端">ESC</button></div>
  <div class="term-out" aria-live="polite"></div>
  <form class="term-row" autocomplete="off"><label class="term-prompt" for="term-input">${PROMPT}</label><input class="term-input" id="term-input" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-label="输入命令"></form>
</div>`;
  document.body.append(overlay);
  out = overlay.querySelector('.term-out');
  input = overlay.querySelector('.term-input');

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.term-close')) return close();
    if (!e.target.closest('a') && !String(getSelection())) input.focus();
  });
  overlay.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value;
    input.value = '';
    run(line);
  });
  input.addEventListener('keydown', onKey);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  const narrow = innerWidth < 560;
  print(narrow ? span('c-acc', 'RICHZDS_SHELL') : span('c-acc', BANNER.slice(1)));
  print(
    `${span('c-dim', 'RICHZDS_SHELL v2.0.77 · ')}输入 ${span('c-ok', 'help')} 查看命令 ${span('c-dim', '· Tab 补全 · ↑↓ 历史 · Esc 关闭')}`,
  );
}

function print(html, cls) {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.innerHTML = html;
  out.append(div);
  out.scrollTop = out.scrollHeight;
}

function onKey(e) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    if (!history.length) return;
    e.preventDefault();
    hIndex = Math.max(0, Math.min(history.length, hIndex + (e.key === 'ArrowUp' ? -1 : 1)));
    input.value = history[hIndex] || '';
    requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
  } else if (e.key === 'Tab') {
    e.preventDefault();
    complete();
  } else if (e.key === 'l' && e.ctrlKey) {
    e.preventDefault();
    out.innerHTML = '';
  }
}

function complete() {
  const value = input.value.replace(/^\s+/, '');
  const parts = value.split(/\s+/);
  let options;
  if (parts.length <= 1) {
    options = Object.keys(COMMANDS).filter((c) => c.startsWith(parts[0] || ''));
    if (options.length === 1) return void (input.value = options[0] + ' ');
  } else {
    const [cmd, arg = ''] = parts;
    const pool =
      cmd === 'cd' ? Object.keys(PAGES)
      : cmd === 'open' || cmd === 'cat' ? [...(data?.posts || []).map((p) => p.slug), ...Object.keys(PAGES)]
      : cmd === 'theme' ? ['cyan', 'pink', 'yellow', 'green']
      : cmd === 'rain' ? ['on', 'off']
      : cmd === 'ls' ? ['posts', 'projects']
      : [];
    options = pool.filter((o) => o.startsWith(arg));
    if (options.length === 1) return void (input.value = `${cmd} ${options[0]}`);
  }
  if (options.length > 1) print(span('c-dim', options.join('   ')));
}

function findPost(arg) {
  const posts = data?.posts || [];
  if (!arg) return null;
  const n = Number(String(arg).replace(/^#/, ''));
  return posts.find((p) => p.n === n || p.slug === arg) || posts.find((p) => p.slug.startsWith(arg));
}

function go(url) {
  print(span('c-ok', `→ 正在跳转 ${url}`));
  setTimeout(() => (location.href = url), 260);
}

function listPosts(posts) {
  if (!posts.length) return span('c-warn', '[ 0 RESULTS ]');
  return posts
    .map(
      (p) =>
        `${span('c-acc', `#${String(p.n).padStart(2, '0')}`)}  ${span('c-dim', p.date)}  ${link(p.url, p.title)}  ${span('c-dim', p.tags.map((t) => `#${t}`).join(' '))}`,
    )
    .join('\n');
}

const COMMANDS = {
  help: {
    desc: '显示这份帮助',
    run() {
      const rows = Object.entries(COMMANDS).map(([name, c]) => `  ${span('c-ok', name.padEnd(9))}${esc(c.desc)}`);
      print(`可用命令：\n${rows.join('\n')}\n${span('c-dim', '  另外还藏了几个彩蛋命令。')}`);
    },
  },
  ls: {
    desc: '列出文章；ls projects 列出项目',
    async run([what]) {
      const d = await loadData();
      if (what === 'projects' || what === 'repos') {
        print(
          d.repos
            .map(
              (r) =>
                `${span('c-acc', (r.fork ? 'fork ' : 'repo ') + '★' + r.stars)}  ${link(r.url, r.name)}  ${span('c-dim', r.note || '')}`,
            )
            .join('\n'),
        );
      } else {
        print(`${span('c-dim', `total ${d.posts.length}`)}\n${listPosts(d.posts)}`);
      }
    },
  },
  cat: {
    desc: '查看文章摘要：cat <编号|slug>',
    async run([arg]) {
      await loadData();
      const p = findPost(arg);
      if (!p) return print(span('c-err', `cat: ${arg || ''}: 没有这篇档案（先 ls 看看编号）`));
      print(
        `${span('c-acc', `LOG#${String(p.n).padStart(2, '0')}`)} ${esc(p.title)}\n${span('c-dim', `${p.date} · ${p.tags.join(' / ')}`)}\n${esc(p.summary)}\n${span('c-dim', '→ ')}${span('c-ok', `open ${p.n}`)}${span('c-dim', ' 阅读全文')}`,
      );
    },
  },
  open: {
    desc: '打开文章或页面：open <编号|slug|页面>',
    async run([arg]) {
      await loadData();
      if (!arg) return print(span('c-err', 'open: 需要参数，比如 open 1 或 open about'));
      if (PAGES[arg]) return go(PAGES[arg]);
      const p = findPost(arg);
      p ? go(p.url) : print(span('c-err', `open: ${arg}: 找不到目标`));
    },
  },
  cd: {
    desc: '跳转页面：cd <home|posts|projects|about>',
    run([arg = '~']) {
      if (arg === '..') return go('/');
      PAGES[arg] ? go(PAGES[arg]) : print(span('c-err', `cd: ${arg}: 没有那个目录`));
    },
  },
  grep: {
    desc: '搜索文章：grep <关键词>',
    async run(args) {
      const q = args.join(' ').trim().toLowerCase();
      if (!q) return print(span('c-err', 'grep: 需要关键词'));
      const d = await loadData();
      const hits = d.posts.filter((p) =>
        [p.title, p.summary, ...p.tags].some((s) => String(s).toLowerCase().includes(q)),
      );
      print(listPosts(hits));
    },
  },
  whoami: {
    desc: '我是谁',
    async run() {
      const d = await loadData();
      const u = d.user || {};
      print(
        `${span('c-ok', 'guest')} ${span('c-dim', '— 访客权限，只读')}\n站主：${esc(u.name || '')} (${link(u.url || '#', u.login || '')})\n签名：${esc(u.bio || '')}`,
      );
    },
  },
  neofetch: {
    desc: '系统信息',
    async run() {
      const d = await loadData();
      const since = Date.parse(d.since);
      const days = Number.isFinite(since) ? Math.max(0, Math.floor((Date.now() - since) / 86400000)) : 0;
      const art = ['      /\\      ', '     /  \\     ', '    / /\\ \\    ', '   / /  \\ \\   ', '  / /____\\ \\  ', ' /__________\\ ', '              ', '              '];
      const info = [
        `${span('c-ok', 'guest')}@${span('c-ok', 'richzds')}`,
        span('c-dim', '-------------------------'),
        `${span('c-acc', 'OS')}      RICHZDS//NET (static)`,
        `${span('c-acc', 'HOST')}    Cloudflare Pages`,
        `${span('c-acc', 'KERNEL')}  build.mjs · zero-deps`,
        `${span('c-acc', 'LOGS')}    ${d.posts.length} posts · ${d.repos.length} repos`,
        `${span('c-acc', 'LANGS')}   ${esc((d.langs || []).map(([n, p]) => `${n} ${p}%`).join(' · '))}`,
        `${span('c-acc', 'UPTIME')}  ${days} days`,
      ];
      print(art.map((a, i) => span('c-err', a) + '  ' + (info[i] || '')).join('\n'));
    },
  },
  github: {
    desc: '打开 GitHub 主页',
    async run() {
      const d = await loadData();
      const url = d.user?.url || 'https://github.com/RichZDS';
      print(`${span('c-ok', '→')} ${link(url, url)}`);
      window.open(url, '_blank', 'noopener');
    },
  },
  rain: {
    desc: '数字雨开关：rain on|off',
    run([arg]) {
      const on = arg ? arg === 'on' : document.documentElement.classList.contains('no-rain');
      api.setRain(on);
      print(span(on ? 'c-ok' : 'c-warn', `数字雨已${on ? '开启' : '关闭'}`));
    },
  },
  theme: {
    desc: '切换主题色：theme cyan|pink|yellow|green',
    run([arg]) {
      const names = ['cyan', 'pink', 'yellow', 'green'];
      if (!names.includes(arg)) return print(`用法：theme ${names.join('|')}`);
      api.setAccent(arg);
      print(span('c-ok', `主题色已切换为 ${arg}`));
    },
  },
  glitch: {
    desc: '来一下故障效果',
    run() {
      api.glitch();
      print(span('c-err', '!! SIGNAL INTERFERENCE !!'));
    },
  },
  date: {
    desc: '当前时间',
    run() {
      print(new Date().toLocaleString('zh-CN', { hour12: false }));
    },
  },
  history: {
    desc: '命令历史',
    run() {
      print(history.map((h, i) => `${span('c-dim', String(i + 1).padStart(4))}  ${esc(h)}`).join('\n') || span('c-dim', '(空)'));
    },
  },
  clear: {
    desc: '清屏（Ctrl+L）',
    run() {
      out.innerHTML = '';
    },
  },
  exit: {
    desc: '关闭终端（Esc）',
    run() {
      close();
    },
  },
};

const ALIASES = { '?': 'help', man: 'help', search: 'grep', find: 'grep', cls: 'clear', quit: 'exit', q: 'exit', ll: 'ls', dir: 'ls' };

const EGGS = {
  sudo: () => `[sudo] guest 的密码：******\n${span('c-err', 'guest 不在 sudoers 文件中。此事将被报告给 Isaac。')}`,
  rm: () => span('c-err', 'rm: 拒绝执行。这里的每个模块都很珍贵。'),
  vim: () => span('c-warn', '你进得去，但你出得来吗？（提示：这里没有 :q）'),
  hack: () => `${span('c-ok', '正在入侵荒坂塔……')}\n${span('c-err', 'ICE 已触发，连接中断。')}\n${span('c-dim', '开玩笑的。')}`,
  hello: () => '你好，netrunner。',
  hi: () => '你好，netrunner。',
  ping: () => `PONG ${span('c-dim', '64 bytes from richzds.pages.dev: time=0.1ms')}`,
  coffee: () => `${span('c-warn', '☕ 咖啡因注入中…')} ${span('c-ok', '[OK]')}`,
  konami: () => span('c-dim', '↑↑↓↓←→←→BA —— 在页面上（不是终端里）按一遍试试。'),
  triangle: () => span('c-err', '三重升华已触发。（这句话只有三角机构玩家懂）'),
};

async function run(line) {
  const raw = line.trim();
  print(`${span('term-prompt', PROMPT)} ${span('c-cmd', raw)}`);
  if (!raw) return;
  history.push(raw);
  hIndex = history.length;
  const [first, ...args] = raw.split(/\s+/);
  const name = ALIASES[first.toLowerCase()] || first.toLowerCase();
  if (COMMANDS[name]) {
    try {
      await COMMANDS[name].run(args);
    } catch (err) {
      print(span('c-err', `${name}: ${err.message}`));
    }
  } else if (EGGS[name]) {
    print(EGGS[name]());
  } else {
    print(`${span('c-err', `command not found: ${first}`)} ${span('c-dim', '— 输入 help 查看可用命令')}`);
  }
}
