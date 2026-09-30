// 零依赖 Markdown 渲染器：覆盖写博客常用的子集
// 标题 / 段落 / 列表（嵌套、任务列表）/ 引用 / GitHub 风格提示框 / 围栏代码 / 表格 / 分割线 / 行内格式。
import { highlight } from './highlight.mjs';

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const RE = {
  blank: /^\s*$/,
  fence: /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[ \t]*(.*)$/,
  heading: /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*#*[ \t]*$/,
  hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
  quote: /^ {0,3}> ?(.*)$/,
  item: /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+|$)(.*)$/,
  tableDelim: /^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/,
  html: /^ {0,3}<\/?(?:div|details|summary|figure|figcaption|section|aside|table|iframe|video|audio|picture|p|pre|svg)\b/i,
};

const CJK = '\\u2e80-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef\\u3000-\\u303f';

const LANG_LABEL = {
  go: 'GO', golang: 'GO', java: 'JAVA', js: 'JAVASCRIPT', javascript: 'JAVASCRIPT', ts: 'TYPESCRIPT',
  typescript: 'TYPESCRIPT', vue: 'VUE', py: 'PYTHON', python: 'PYTHON', sh: 'SHELL', bash: 'BASH',
  shell: 'SHELL', powershell: 'POWERSHELL', ps1: 'POWERSHELL', json: 'JSON', yaml: 'YAML', yml: 'YAML',
  sql: 'SQL', html: 'HTML', xml: 'XML', text: 'TEXT', txt: 'TEXT', dockerfile: 'DOCKERFILE', css: 'CSS',
};

const ALERTS = {
  note: 'SYS.NOTE // 注意',
  tip: 'SYS.TIP // 提示',
  important: 'SYS.CORE // 重点',
  warning: 'SYS.WARN // 警告',
  caution: 'SYS.ALERT // 危险',
};

export function slugify(text, used) {
  const base =
    text
      .toLowerCase()
      .replace(/&[a-z]+;/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section';
  let slug = base;
  for (let i = 1; used.has(slug); i++) slug = `${base}-${i}`;
  used.add(slug);
  return slug;
}

export function renderMarkdown(src) {
  const ctx = { headings: [], ids: new Set() };
  const html = parseBlocks(src.replace(/\r\n?/g, '\n').split('\n'), ctx);
  return { html, headings: ctx.headings };
}

// ---------------------------------------------------------------- blocks

function indentOf(line) {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n++;
    else if (ch === '\t') n += 4 - (n % 4);
    else break;
  }
  return n;
}

function stripCols(line, cols) {
  const expanded = line.replace(/^[ \t]+/, (ws) => {
    let out = '';
    for (const ch of ws) out += ch === '\t' ? ' '.repeat(4 - (out.length % 4)) : ' ';
    return out;
  });
  return expanded.slice(Math.min(cols, indentOf(expanded)));
}

function isTableStart(line, next) {
  return line.includes('|') && next !== undefined && next.includes('-') && RE.tableDelim.test(next);
}

function startsBlock(line, next) {
  return (
    RE.fence.test(line) ||
    RE.heading.test(line) ||
    RE.hr.test(line) ||
    RE.quote.test(line) ||
    RE.item.test(line) ||
    RE.html.test(line) ||
    isTableStart(line, next)
  );
}

function parseBlocks(lines, ctx) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if (RE.blank.test(line)) {
      i++;
    } else if ((m = line.match(RE.fence))) {
      const marker = m[1];
      const close = new RegExp(`^ {0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \\t]*$`);
      const body = [];
      for (i++; i < lines.length && !close.test(lines[i]); i++) body.push(lines[i]);
      i++;
      out.push(codeBlock(body.join('\n'), m[2].toLowerCase(), m[3].replace(/^title=["']?|["']$/g, '')));
    } else if ((m = line.match(RE.heading))) {
      out.push(heading(m[1].length, m[2] || '', ctx));
      i++;
    } else if (RE.hr.test(line)) {
      out.push('<hr>');
      i++;
    } else if (RE.quote.test(line)) {
      const body = [];
      while (i < lines.length && !RE.blank.test(lines[i])) {
        const q = lines[i].match(RE.quote);
        body.push(q ? q[1] : lines[i]);
        i++;
      }
      out.push(blockquote(body, ctx));
    } else if (listItem(line)) {
      const r = parseList(lines, i, ctx);
      out.push(r.html);
      i = r.next;
    } else if (isTableStart(line, lines[i + 1])) {
      const r = parseTable(lines, i);
      out.push(r.html);
      i = r.next;
    } else if (RE.html.test(line)) {
      const body = [];
      while (i < lines.length && !RE.blank.test(lines[i])) body.push(lines[i++]);
      out.push(body.join('\n'));
    } else {
      const para = [line.trim()];
      for (i++; i < lines.length && !RE.blank.test(lines[i]) && !startsBlock(lines[i], lines[i + 1]); i++) {
        para.push(lines[i].trim());
      }
      out.push(`<p>${inline(para.join('\n'))}</p>`);
    }
  }
  return out.join('\n');
}

function heading(level, text, ctx) {
  const inner = inline(text);
  const plain = inner.replace(/<[^>]+>/g, '');
  const id = slugify(plain, ctx.ids);
  if (level === 2 || level === 3) ctx.headings.push({ level, id, html: plain });
  return `<h${level} id="${id}">${inner}<a class="h-anchor" href="#${id}" aria-label="链接到本节">#</a></h${level}>`;
}

function blockquote(body, ctx) {
  const m = body[0]?.match(/^\s*\[!(note|tip|important|warning|caution)\]\s*$/i);
  if (m) {
    const kind = m[1].toLowerCase();
    return `<div class="callout callout-${kind}"><p class="callout-title">${ALERTS[kind]}</p>${parseBlocks(body.slice(1), ctx)}</div>`;
  }
  return `<blockquote>${parseBlocks(body, ctx)}</blockquote>`;
}

function listItem(line) {
  const m = line.match(/^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)(.*)$/);
  if (!m || RE.hr.test(line)) return null;
  const indent = indentOf(m[1]);
  const gap = m[3].length > 4 ? 1 : m[3].length;
  return {
    indent,
    ordered: /\d/.test(m[2]),
    num: parseInt(m[2], 10),
    text: m[4],
    contentCol: indent + m[2].length + gap,
  };
}

function parseList(lines, start, ctx) {
  const first = listItem(lines[start]);
  const { ordered, indent: base } = first;
  const items = [];
  let cur = null;
  let loose = false;
  let sawBlank = false;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (RE.blank.test(line)) {
      let j = i + 1;
      while (j < lines.length && RE.blank.test(lines[j])) j++;
      const nx = lines[j];
      const it = nx !== undefined ? listItem(nx) : null;
      const continues =
        nx !== undefined && ((it && it.indent === base && it.ordered === ordered) || indentOf(nx) > base);
      if (!continues) break;
      cur.lines.push('');
      sawBlank = true;
      i++;
      continue;
    }
    const it = listItem(line);
    if (it && it.indent === base && it.ordered === ordered) {
      if (sawBlank) loose = true;
      sawBlank = false;
      cur = { lines: [it.text], num: it.num, contentCol: it.contentCol };
      items.push(cur);
      i++;
    } else if (it && it.indent <= base) {
      break;
    } else if (indentOf(line) > base) {
      cur.lines.push(stripCols(line, cur.contentCol));
      i++;
    } else if (!sawBlank && !startsBlock(line, lines[i + 1])) {
      cur.lines.push(line.trim());
      i++;
    } else {
      break;
    }
  }

  let hasTask = false;
  const lis = items.map((item) => {
    let body = item.lines;
    let task = '';
    const tm = body[0].match(/^\[([ xX])\][ \t]+(.*)$/);
    if (tm) {
      task = tm[1] === ' ' ? 'todo' : 'done';
      hasTask = true;
      body = [tm[2], ...body.slice(1)];
    }
    let html = parseBlocks(body, ctx);
    if (!loose) html = html.replace(/^<p>([\s\S]*?)<\/p>/, '$1');
    return task
      ? `<li class="task task-${task}"><span class="task-box" aria-hidden="true"></span>${html}</li>`
      : `<li>${html}</li>`;
  });

  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && items[0].num !== 1 ? ` start="${items[0].num}"` : '';
  const cls = hasTask ? ' class="task-list"' : '';
  return { html: `<${tag}${startAttr}${cls}>\n${lis.join('\n')}\n</${tag}>`, next: i };
}

function parseTable(lines, start) {
  const split = (row) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/(?<!\\)\|$/, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
  const head = split(lines[start]);
  const aligns = split(lines[start + 1]).map((c) =>
    c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : '',
  );
  const rows = [];
  let i = start + 2;
  for (; i < lines.length && !RE.blank.test(lines[i]) && lines[i].includes('|'); i++) rows.push(split(lines[i]));
  const cell = (tag, text, k) =>
    `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(text || '')}</${tag}>`;
  const thead = `<tr>${head.map((c, k) => cell('th', c, k)).join('')}</tr>`;
  const tbody = rows.map((r) => `<tr>${head.map((_, k) => cell('td', r[k], k)).join('')}</tr>`).join('\n');
  return {
    html: `<div class="table-wrap"><table>\n<thead>${thead}</thead>\n<tbody>\n${tbody}\n</tbody>\n</table></div>`,
    next: i,
  };
}

function codeBlock(code, lang, title) {
  const label = LANG_LABEL[lang] || (lang ? lang.toUpperCase() : 'TEXT');
  return (
    `<figure class="code">` +
    `<figcaption class="code-bar"><span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>` +
    `<span class="code-lang">${esc(label)}</span>` +
    (title ? `<span class="code-title">${esc(title)}</span>` : '') +
    `<button class="code-copy" type="button">COPY</button></figcaption>` +
    `<pre><code class="lang-${esc(lang || 'text')}">${highlight(code, lang)}</code></pre></figure>`
  );
}

// ---------------------------------------------------------------- inline

function link(href, text, title) {
  const safe = /^\s*javascript:/i.test(href) ? '#' : href;
  const external = /^https?:\/\//.test(safe);
  return `<a href="${safe}"${title ? ` title="${title}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
}

function emphasis(s) {
  return s
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)([\s\S]*?\S)__/g, '<strong>$1</strong>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
    .replace(/(^|[^*\w])\*(?=\S)([^*\n]*?\S)\*(?![*\w])/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(?=\S)([^_\n]*?\S)_(?![_\w])/g, '$1<em>$2</em>');
}

export function inline(src) {
  const slots = [];
  const keep = (html) => `\u0000${slots.push(html) - 1}\u0000`;
  // 转义的反引号 \` 不能开启代码段，先占位
  let s = src.replace(/\\`/g, () => keep('`'));

  s = s.replace(/(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, _t, code) =>
    keep(`<code>${esc(code.replace(/\n/g, ' ').replace(/^ (.+) $/, '$1'))}</code>`),
  );
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!|~<>])/g, (_, ch) => keep(esc(ch)));
  s = s.replace(/<(https?:\/\/[^\s>]+)>/g, (_, url) => keep(link(esc(url), esc(url))));
  s = s.replace(/<\/?(?:kbd|br|sup|sub|mark|u|small|ins|del|s)\s*\/?>/gi, (tag) => keep(tag.toLowerCase()));
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g, (_, alt, url, title) =>
    keep(`<img src="${url}" alt="${alt}" loading="lazy" decoding="async"${title ? ` title="${title}"` : ''}>`),
  );
  s = s.replace(/\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g, (_, text, url, title) =>
    keep(link(url, emphasis(text), title)),
  );
  s = s.replace(/(^|[^\w/"'=])(https?:\/\/[^\s<>()（）\u0000]*[^\s<>()（）.,;:!?。，；：！？、\u0000])/g, (_, pre, url) =>
    pre + keep(link(url, url)),
  );
  s = emphasis(s);
  s = s.replace(/(?: {2,}|\\)\n/g, '<br>');
  s = s.replace(new RegExp(`([${CJK}])\\n(?=[${CJK}])`, 'g'), '$1');
  s = s.replace(/\n/g, ' ');

  for (let guard = 0; s.includes('\u0000') && guard < 5; guard++) {
    s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => slots[n]);
  }
  return s;
}
