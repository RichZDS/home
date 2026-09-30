# 乌托邦 · 郑笃实的个人主页

[![Deploy](https://github.com/RichZDS/home/actions/workflows/deploy.yml/badge.svg)](https://github.com/RichZDS/home/actions/workflows/deploy.yml)

郑笃实的个人主页：写过的文章、做过的项目，还有喜欢的游戏、跑团和动漫。普通的博客结构，用《以撒的结合》风格的像素画做装饰。零依赖的静态生成器（只要 Node.js ≥ 18），部署在 Cloudflare Pages。

- 线上地址：<https://richzds.pages.dev>
- 每个页面顶上有一张像素横幅，右下角的以撒会眨眼、眼睛跟着鼠标转，戳他会哭。
- 系统开启「减少动态效果」时会关掉动画；禁用 JS 时除了骰塔，其他内容照常显示。

| 栏目 | 地址 | 内容 |
| --- | --- | --- |
| 首页 | `/` | 自我介绍、各栏目入口、最近写的文章 |
| 学习 | `/study/` | 文章（搜索 + 标签筛选）、项目、语言统计 |
| 游戏 | `/games/` | 以撒的结合、黎明杀机 |
| 跑团 | `/trpg/` | 骰塔：CoC d100、三角机构 6d4、DnD 多面骰；塔罗（施工中） |
| 动漫 | `/anime/` | 一人之下、日月同错（水墨配色） |
| 关于 | `/about/` | 经历、联系方式、关于这个网站 |

## 目录

```text
content/posts/        文章（Markdown + frontmatter）
data/github.json      GitHub 数据缓存（构建时自动刷新，12 小时有效）
fonts-src/            字体原件（构建时裁剪，不直接发布）
src/
  markdown.mjs        Markdown 渲染
  highlight.mjs       代码高亮
  templates.mjs       页面模板
  github.mjs          拉 GitHub 数据
  pixel/
    sprites.mjs       手画的精灵：一个字符一个像素
    art.mjs           程序生成的书架、地毯、相框、骰塔、界面边框和底纹
    banners.mjs       每个页面顶上的横幅
    dice.mjs          骰塔里的骰子
    assets.mjs        构建时把上面这些画成 PNG 和精灵图集
static/               原样复制到 dist/：样式、脚本、头像、_headers
  assets/js/main.js   全站交互：看板娘、文章搜索和标签、文章目录
  assets/js/dice.js   跑团页的骰塔
site.config.mjs       名字、自我介绍、经历、游戏 / 跑团 / 动漫栏目的文字、精选项目、仓库简介
build.mjs             构建入口
scripts/serve.mjs     本地预览服务器
scripts/deploy.sh     构建 + 发布到 Cloudflare Pages
```

## 常用命令

```bash
npm run dev       # 本地预览 http://localhost:4173，改动自动重建
npm run build     # 只构建到 dist/
npm run refresh   # 强制重新拉取 GitHub 数据再构建
npm run deploy    # 构建并发布到 Cloudflare Pages
```

构建会用 [fonttools](https://github.com/fonttools/fonttools) 把字体裁成只含网站上出现过的字：

```bash
pip install fonttools brotli
```

- 像素字体裁完三十来 KB；没装 fonttools 也能构建，只是会退回完整字体（约 650 KB）。
- 动漫页的毛笔字裁完十几 KB；没装 fonttools 时不用毛笔字，退回系统自带的楷体。

GitHub Actions 里已经装好了。

## 写文章

在 `content/posts/` 新建 `文章slug.md`：

```markdown
---
title: 文章标题
date: 2026-10-01 20:00
tags: [Go, 并发]
summary: 一句话摘要，显示在文章列表和 RSS 里
repo: golangexe
period: 2026.07
---

正文……
```

| 字段 | 说明 |
| --- | --- |
| `title` | 必填 |
| `date` | 必填，`YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`，按北京时间 |
| `tags` | 标签数组，「学习」页里可以按标签筛选 |
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

## 像素画

- 精灵都在 `src/pixel/sprites.mjs` 里用字符画出来：`.` 是透明，其他字母查同一个文件里的调色板 `PAL`。
- 横幅（`src/pixel/banners.mjs`）是 360×96 的小图，地下室那几张沿用以撒的房间画法，动漫页是一张水墨蓬莱。全部用固定种子程序生成，每次构建结果都一样。
- 构建时画成 PNG 放进 `dist/assets/px/`，页面里按像素放大显示；右下角的以撒是运行时用 `<canvas>` 从精灵图集里取帧画的。
- 没有用任何游戏素材或原声，所有形象都是照着画风自己画的。

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

想先看效果、不影响正式站时，可以发到预览分支：

```bash
node build.mjs && npx wrangler@4 pages deploy dist --project-name richzds --branch redesign
```

预览地址是 `https://redesign.richzds.pages.dev`。

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

- 名字、自我介绍、经历、游戏 / 跑团 / 动漫栏目的文字、精选项目、仓库中文简介：`site.config.mjs`
- 横幅里摆什么：`src/pixel/banners.mjs`
- 以撒和各种小东西的样子：`src/pixel/sprites.mjs`
- 配色：`static/assets/css/main.css` 顶部的 `:root` 变量（动漫页的水墨配色在 `html[data-theme='ink']` 里）

字体都以 SIL Open Font License 1.1 授权：像素字体 [Fusion Pixel](https://github.com/TakWolf/fusion-pixel-font)（`fonts-src/OFL-fusion-pixel.txt`），毛笔字 [马善政楷书 Ma Shan Zheng](https://github.com/googlefonts/mashanzheng)（`fonts-src/OFL-ma-shan-zheng.txt`）。

旧版网址 `/posts/`、`/projects/` 通过 `_redirects` 跳到「学习」页里对应的位置。
