# 乌托邦 · 郑笃实的个人主页

[![Deploy](https://github.com/RichZDS/home/actions/workflows/deploy.yml/badge.svg)](https://github.com/RichZDS/home/actions/workflows/deploy.yml)

郑笃实的个人主页：写过的文章、做过的项目，还有喜欢的游戏、跑团和动漫。四个展厅四种画风，每个展厅一张插图（铜版、霓虹灯牌、木刻，动漫区是一张三部作品主角的合家欢全家福），跑团区有 3D 骰塔和韦特塔罗。零依赖的静态生成器（只要 Node.js ≥ 18），部署在 Cloudflare Pages。

- 线上地址：<https://richzds.pages.dev>
- 右下角的像素以撒会眨眼、眼睛跟着鼠标转，戳他会哭。
- 系统开启「减少动态效果」时会关掉动画；禁用 JS 时除了骰塔，其他内容照常显示。

| 栏目 | 地址 | 画风 | 内容 |
| --- | --- | --- | --- |
| 首页 | `/` | 画廊（浅灰底、站酷小薇体） | 自我介绍、四个展厅的入口、最近写的文章 |
| 学习 | `/study/` | 学术（纸白、思源宋体、期刊目录） | 文章（搜索 + 标签筛选）、两个重点项目、其他仓库（GitHub 卡片）、语言统计；文章页也是这个皮肤 |
| 游戏 | `/games/` | 赛博朋克（霓虹、扫描线、像素字） | 以撒的结合、黎明杀机 |
| 跑团 | `/trpg/` | 中世纪 + 克苏鲁（羊皮纸、行书、哥特体） | 骰塔（canvas 画的 3D 多面体）：CoC d100、三角机构 6d4、DnD 多面骰；韦特塔罗 78 张带逆位：每日一张、三张牌阵、凯尔特十字 |
| 动漫 | `/anime/` | 水墨（宣纸、楷书、印章），顶上贴一张全家福 | 一人之下、日月同错、我的世界 |
| 关于 | `/about/` | 画廊 | 经历、联系方式、关于这个网站 |

皮肤由 `<html data-theme="…">` 切换，`static/assets/css/main.css` 顶部每种皮肤一组 token（颜色、标题字体），组件只用 token 取色取字。

## 目录

```text
content/posts/        文章（Markdown + frontmatter）
data/github.json      GitHub 数据缓存（构建时自动刷新，12 小时有效）
fonts-src/            字体原件；大字体不进仓库，构建时下载到 fonts-src/cache/（已 gitignore）
art-src/              GPT 画的原图（PNG，已 gitignore）；网页用的 JPEG / WebP 在 static/assets/img/
src/
  markdown.mjs        Markdown 渲染
  highlight.mjs       代码高亮
  templates.mjs       页面模板
  github.mjs          拉 GitHub 数据
  pixel/              像素以撒：sprites.mjs 手画的精灵，assets.mjs 构建时拼成精灵图集和网站图标
static/               原样复制到 dist/：样式、脚本、插画、塔罗牌面、头像、_headers
  assets/js/main.js   全站交互：看板娘、文章搜索和标签、文章目录
  assets/js/dice.js   跑团页的骰塔：canvas 上现算现画的 3D 多面体（正四 / 六 / 八 / 十二 / 二十面体和 d10）
  assets/js/tarot.js  跑团页的塔罗：洗牌、逆位、三种牌阵；tarot-cards.js 是 78 张牌的名字和关键词
  assets/tarot/       78 张韦特原版牌面（1909 年，公有领域，480px WebP）
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

### 字体

构建会用 [fonttools](https://github.com/fonttools/fonttools) 把每种字体裁成只含网站上真正用到的字（几 KB 到几十 KB）：

```bash
pip install fonttools brotli
```

| 字体 | 用在哪 | 来源 |
| --- | --- | --- |
| Fusion Pixel（缝合像素字体） | 游戏房、以撒的气泡 | `fonts-src/`，OFL |
| 马善政楷书 Ma Shan Zheng | 动漫区、骰塔判定 | `fonts-src/`，OFL |
| 站酷小薇体 ZCOOL XiaoWei | 站名、首页 / 关于的标题 | Google Fonts 仓库，构建时下载 |
| 思源宋体 Noto Serif SC | 学习区的标题 | 同上（25 MB，只裁几十 KB） |
| 志莽行书 Zhi Mang Xing | 跑团区的标题 | 同上 |
| Cinzel / UnifrakturMaguntia / Orbitron | 跑团、游戏房里的少量拉丁字母，骰子上的数字 | 同上 |

没装 fonttools 时：像素字体和楷书退回完整文件，其他字体不用，页面退回系统字体。下载失败同样退回系统字体，构建不会中断。GitHub Actions 里已经装好 fonttools。

### 插画

每个展厅一张插图（学习：铜版画书堆；游戏房：霓虹街机；跑团：木刻海怪，外加一座木刻骰塔和一张塔罗牌背；动漫：《一人之下》《日月同错》《我的世界》主角的合家欢全家福，同人性质、非商用），是用 Codex 的图片生成工具画的，原图在 `art-src/`（不进仓库），网页用的版本在 `static/assets/img/`：`hero-<栏目>.webp`（学习、跑团是透明底，直接印在页面的纸色上；动漫是一张不透明的「照片」，CSS 给它加了白边和斜角）、`hero-games.jpg`、`tower-trpg.webp`、`tarot-back.webp`。构建时按文件名自动接入，换图只要覆盖同名文件（同名有多种格式时优先 webp）。

塔罗牌面用的是 Pamela Colman Smith 1909 年画的韦特原版（公有领域），从 Wikimedia Commons 下载后缩成 480px 的 WebP，放在 `static/assets/tarot/`，按 `m00`–`m21`（大阿卡纳）、`w01`–`w14` / `c01`–`c14` / `s01`–`s14` / `p01`–`p14`（权杖 / 圣杯 / 宝剑 / 星币）命名。

## 写文章

在 `content/posts/` 新建 `文章slug.md`：

```markdown
---
title: 文章标题
date: 2026-10-01 20:00
tags: [Go, 并发]
summary: 一句话摘要，显示在文章列表、文章页的「摘要」和 RSS 里
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

- 名字、自我介绍、经历、游戏 / 跑团 / 动漫栏目的文字、两个重点项目（`featured`）、仓库中文简介：`site.config.mjs`
- 每种皮肤的颜色和标题字体：`static/assets/css/main.css` 顶部的 token
- 换插画：覆盖 `static/assets/img/hero-<栏目>.webp`（或 .jpg）、`tower-trpg.webp`、`tarot-back.webp`
- 塔罗牌的关键词：`static/assets/js/tarot-cards.js`
- 像素以撒的样子：`src/pixel/sprites.mjs`

字体都以 SIL Open Font License 1.1 授权，各自的许可证随构建复制到 `dist/assets/fonts/OFL-*.txt`。

旧版网址 `/posts/`、`/projects/`、`/library/` 通过 `_redirects` 跳到「学习」页里对应的位置。
