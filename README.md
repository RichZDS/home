# RICHZDS//NET · 赛博终端

[![Deploy](https://github.com/RichZDS/home/actions/workflows/deploy.yml/badge.svg)](https://github.com/RichZDS/home/actions/workflows/deploy.yml)

RichZDS（不会编码的Isaac）的个人博客，赛博朋克风格。零依赖的静态生成器（只要 Node.js ≥ 18），部署在 Cloudflare Pages。

- 线上地址：<https://richzds.pages.dev>
- 页面：首页 / 档案库（文章） / 项目矩阵 / 身份档案 / 404，外加 RSS、sitemap
- 动效：开机动画、数字雨、glitch 故障字、霓虹闪烁、扫描线、透视网格、天际线视差、标题解密、滚动进场、页面过渡
- 交互：站内终端（按 <kbd>`</kbd> 或 <kbd>Ctrl</kbd>+<kbd>K</kbd>）、标签筛选与搜索、代码复制、阅读进度、目录高亮、Konami 秘籍
- 系统开启「减少动态效果」时自动关闭动画；禁用 JS 时内容照样能看

## 目录

```text
content/posts/      文章（Markdown + frontmatter）
data/github.json    GitHub 数据缓存（构建时自动刷新，12 小时有效）
src/                生成器：markdown.mjs / highlight.mjs / templates.mjs / github.mjs / skyline.mjs
static/             原样复制到 dist/：样式、脚本、字体、头像、_headers
site.config.mjs     站点配置：标题、打字机文案、精选项目、仓库简介
build.mjs           构建入口
scripts/serve.mjs   本地预览服务器
scripts/deploy.sh   构建 + 发布到 Cloudflare Pages
```

## 常用命令

```bash
npm run dev       # 本地预览 http://localhost:4173，改动自动重建
npm run build     # 只构建到 dist/
npm run refresh   # 强制重新拉取 GitHub 数据再构建
npm run deploy    # 构建并发布到 Cloudflare Pages
```

## 写文章

在 `content/posts/` 新建 `文章slug.md`：

```markdown
---
title: 文章标题
date: 2026-10-01 20:00
tags: [Go, 并发]
summary: 一句话摘要，显示在卡片和 RSS 里
repo: golangexe
period: 2026.07
---

正文……
```

| 字段 | 说明 |
| --- | --- |
| `title` | 必填 |
| `date` | 必填，`YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`，按北京时间 |
| `tags` | 标签数组，档案库可以按标签筛选 |
| `summary` | 摘要；不写就截取正文开头 |
| `repo` | 关联的 GitHub 仓库名，文章头部会显示链接 |
| `period` | 项目时间，比如 `2025.12 — 2026.04` |
| `draft: true` | 草稿，默认不构建（`node build.mjs --drafts` 可以预览） |
| `slug` | 自定义网址，默认用文件名 |

支持的 Markdown：标题、段落、粗体 / 斜体 / 删除线、行内代码、链接、图片、有序 / 无序 / 嵌套 / 任务列表、引用、表格、分割线、带文件名的代码块（<code>```go main.go</code>），以及 GitHub 风格提示框：

```markdown
> [!TIP]
> 这是一个提示框，还支持 NOTE / IMPORTANT / WARNING / CAUTION
```

图片放在 `static/assets/img/` 下，用 `![说明](/assets/img/xxx.png)` 引用。

## 部署

### 自动部署（GitHub Actions）

推送到 `main` 后，[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 会自动构建并发布到 Cloudflare Pages，一般一两分钟就能上线。另外：

- Actions 页面点「Run workflow」可以手动重新部署，同时刷新 GitHub 数据；
- 每周一 04:00（北京时间）自动刷新一次 GitHub 数据并重新部署；
- 只改 `README.md` 或 `.gitignore` 不会触发部署。

第一次使用前，在仓库 **Settings → Secrets and variables → Actions** 里添加一个 secret：

| Name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 带「Cloudflare Pages: 编辑」权限的 Cloudflare API 令牌 |

没有这个 secret 时，工作流只做构建检查，不会部署。

### 本地部署

`npm run deploy` 会读取项目根目录的 `.env`（已被 `.gitignore` 忽略）：

```bash
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...   # 只有 Cloudflare Pages 编辑权限的 token
```

当前的部署 token 叫 `richzds-blog-pages-deploy`，2026-12-28 过期，到期后在 Cloudflare 控制台 → 管理账户 → 账户 API 令牌里新建一个带「Cloudflare Pages: 编辑」权限的令牌，替换 `.env` 即可。也可以不用 token，先运行 `npx wrangler login`。

## 绑定域名

免费的 `*.pages.dev` 已经可以直接访问。要换成自己的域名：

- **自己有域名并托管在 Cloudflare**：Pages 项目 → 自定义域 → 添加，比如 `blog.example.com`。
- **is-a.dev 免费子域名**：去 <https://github.com/is-a-dev/register> 提交 PR，新建 `domains/richzds.json`，记录写 `"CNAME": "richzds.pages.dev"`。PR 合并后，用下面的 API 把域名加到 Pages 项目（is-a.dev 在公共后缀列表里，控制台添加不了，只能走 API）：

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/richzds/domains" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"richzds.is-a.dev"}'
```

## 自定义

- 标题、打字机文案、首页精选项目、仓库中文简介：`site.config.mjs`
- 配色：`static/assets/css/main.css` 顶部的 `:root` 变量（`--cyan`、`--pink`、`--yellow`……）
- 终端命令：`static/assets/js/terminal.js` 里的 `COMMANDS`
- 天际线：`src/skyline.mjs`，改随机种子就能换一座城市

字体 Orbitron 和 Share Tech Mono 以 SIL Open Font License 授权，已做成拉丁子集放在本地，不依赖 Google Fonts。
