// 构建时代码高亮：按语言拼一条大正则，逐个 token 包 <span class="t-xxx">。
// 不追求编辑器级别的精确，只求常见语言看起来对、零依赖。

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const words = (s) => s.trim().split(/\s+/).join('|');

const DQ = String.raw`"(?:\\.|[^"\\\n])*"`;
const SQ = String.raw`'(?:\\.|[^'\\\n])*'`;
const BT = '`[^`]*`';
const NUM = String.raw`\b(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)\b`;
const FN = String.raw`\b[A-Za-z_]\w*(?=\s*\()`;
const TYPE = String.raw`\b[A-Z][A-Za-z0-9_]*\b`;
const SLASH_COMMENT = String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`;
const HASH_COMMENT = String.raw`(?<=^|[ \t])#[^\n]*`;

const SPECS = {
  go: {
    com: SLASH_COMMENT,
    str: [DQ, BT, SQ],
    kw: words(`break case chan const continue default defer else fallthrough for func go goto if import
      interface map package range return select struct switch type var`),
    lit: words('nil true false iota'),
    fn: FN,
    type: TYPE,
  },
  java: {
    com: SLASH_COMMENT,
    str: [String.raw`"""[\s\S]*?"""`, DQ, SQ],
    meta: String.raw`@[A-Za-z_][\w.]*`,
    kw: words(`abstract assert boolean break byte case catch char class continue default do double else enum
      extends final finally float for if implements import instanceof int interface long native new package
      private protected public return short static super switch synchronized this throw throws transient try
      var void volatile while record yield sealed permits`),
    lit: words('null true false'),
    fn: FN,
    type: TYPE,
  },
  js: {
    com: SLASH_COMMENT,
    str: [DQ, SQ, BT],
    kw: words(`async await break case catch class const continue debugger default delete do else export extends
      finally for from function get if import in instanceof let new of return set static super switch this throw
      try typeof var void while with yield as interface type enum implements declare readonly keyof`),
    lit: words('null undefined true false NaN Infinity'),
    fn: FN,
    type: TYPE,
  },
  py: {
    com: HASH_COMMENT,
    str: [String.raw`"""[\s\S]*?"""`, String.raw`'''[\s\S]*?'''`, `[fFrRbB]?${DQ}`, `[fFrRbB]?${SQ}`],
    meta: String.raw`@[A-Za-z_][\w.]*`,
    kw: words(`and as assert async await break class continue def del elif else except finally for from global if
      import in is lambda nonlocal not or pass raise return try while with yield match case`),
    lit: words('None True False self cls'),
    fn: FN,
    type: TYPE,
  },
  sh: {
    com: HASH_COMMENT,
    str: [DQ, SQ],
    var: String.raw`\$\{[^}\n]*\}|\$[A-Za-z_][\w:]*|\$[0-9@#?*!$-]`,
    // 行首（或管道、分号之后）的第一个词当作命令
    cmd: String.raw`(?<=^[ \t]*|[|;&][ \t]*|\$\([ \t]*)(?:sudo[ \t]+)?[A-Za-z_.\/][\w.\/-]*`,
    flag: String.raw`(?<=[ \t])--?[A-Za-z][\w-]*`,
    num: NUM,
  },
  sql: {
    com: String.raw`--[^\n]*|\/\*[\s\S]*?\*\/`,
    str: [SQ, DQ, BT],
    kw: words(`select from where and or not insert into values update set delete create table index primary key
      foreign references drop alter add column join left right inner outer on group by order having limit offset
      as distinct default unique auto_increment varchar int bigint tinyint text datetime timestamp decimal engine
      charset if exists comment use database`),
    lit: words('null true false'),
    ci: true,
  },
  json: {
    prop: String.raw`"(?:\\.|[^"\\\n])*"(?=\s*:)`,
    str: [DQ],
    lit: words('true false null'),
    num: NUM,
  },
  yaml: {
    com: HASH_COMMENT,
    prop: String.raw`(?<=^[ \t]*(?:-[ \t]+)?)[\w.-]+(?=[ \t]*:(?:[ \t]|$))`,
    str: [DQ, SQ],
    lit: words('true false null yes no on off'),
    num: NUM,
  },
  html: {
    com: String.raw`<!--[\s\S]*?-->`,
    tag: String.raw`<\/?[A-Za-z][\w:-]*|\/?>`,
    attr: String.raw`(?<=\s)[@:#]?[A-Za-z_][\w:.-]*(?==)`,
    str: [String.raw`"[^"]*"`, String.raw`'[^']*'`],
  },
};

const ALIASES = {
  golang: 'go', javascript: 'js', mjs: 'js', ts: 'js', typescript: 'js', jsx: 'js', tsx: 'js',
  python: 'py', bash: 'sh', shell: 'sh', zsh: 'sh', console: 'sh', powershell: 'sh', ps1: 'sh', pwsh: 'sh',
  dockerfile: 'sh', yml: 'yaml', xml: 'html', vue: 'html', svg: 'html', mysql: 'sql', kotlin: 'java',
};

// 高亮分组的先后顺序很重要：注释和字符串要先吃掉，关键字要在函数名之前。
const ORDER = ['com', 'prop', 'str', 'meta', 'tag', 'attr', 'var', 'cmd', 'flag', 'kw', 'lit', 'fn', 'type', 'num'];
const compiled = new Map();

function regexFor(lang) {
  if (compiled.has(lang)) return compiled.get(lang);
  const spec = SPECS[lang];
  let re = null;
  if (spec) {
    const parts = [];
    for (const key of ORDER) {
      let src = spec[key];
      if (!src) continue;
      if (Array.isArray(src)) src = src.join('|');
      else if (key === 'kw' || key === 'lit') src = String.raw`\b(?:${src})\b`;
      parts.push(`(?<${key}>${src})`);
    }
    if (!spec.num && spec.kw) parts.push(`(?<num>${NUM})`);
    re = new RegExp(parts.join('|'), spec.ci ? 'gmi' : 'gm');
  }
  compiled.set(lang, re);
  return re;
}

export function highlight(code, lang = '') {
  const key = ALIASES[lang] || lang;
  const re = regexFor(key);
  if (!re) return esc(code);
  let out = '';
  let last = 0;
  for (const m of code.matchAll(re)) {
    if (!m[0]) continue;
    const kind = Object.keys(m.groups).find((k) => m.groups[k] !== undefined);
    out += esc(code.slice(last, m.index)) + `<span class="t-${kind}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(code.slice(last));
}
