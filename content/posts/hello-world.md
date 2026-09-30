---
title: 系统上线：RICHZDS//NET 接入完成
date: 2026-09-29 18:00
tags: [博客, 前端, Cloudflare]
summary: 这个博客怎么搭起来的：零依赖的静态生成器、赛博朋克皮肤、Cloudflare Pages 部署，以及接下来要写什么。
---

> [!NOTE]
> 2026-09-30 更新：网站已经改版成「乌托邦」：四个展厅四种画风，学习是学术风，游戏房是赛博朋克，跑团是中世纪加克苏鲁，动漫是水墨。这篇记的是第一版赛博朋克的样子，文里提到的终端、数字雨和秘籍都已经拿掉了。

这里是 RichZDS 的个人博客。GitHub 上的签名是「最尊重模块化的选手」，所以这个站点本身也按模块拆开：内容、生成、样式、动效、部署，各管各的。

## 这里会写什么

GitHub 上的项目大概分这几条线，博客也按这几条线来写：

| 方向 | 代表项目 | 关键词 |
| --- | --- | --- |
| Go 后端 | [三角机构论坛](/posts/trangle-agency-forum/)、[Go 锁机制训练营](/posts/go-lock-bootcamp/) | GoFrame、WebSocket、RabbitMQ、并发 |
| Java 后端 | [BOSS 招聘系统](/posts/boss-recruitment-ai/)、[运动场馆管理系统](/posts/layered-architecture/) | Spring Boot 3、MyBatis-Plus、分层 |
| AI 应用 | [织文 · AI 全文生成](/posts/zhiwen-ai-writer/)、BOSS 的简历优化 | FastAPI、Spring AI、DeepSeek |
| 学习笔记 | [SDUT 学习小 tip](/posts/sdut-study-tips/) | 408、课程经验 |

## 这个站是怎么搭的

整个博客没有用框架，也没有 `node_modules`：

```text
richzds-blog/
├─ content/posts/     # 文章：Markdown + frontmatter
├─ src/               # 生成器：Markdown 渲染、代码高亮、页面模板、GitHub 数据
├─ static/            # 样式、脚本、字体
├─ build.mjs          # node build.mjs → dist/
└─ scripts/deploy.sh  # 构建 + wrangler pages deploy
```

- **生成**：`build.mjs` 读取 `content/posts/*.md`，用自己写的 Markdown 渲染器转成 HTML。代码高亮也在构建时做完，浏览器里不跑高亮脚本。
- **数据**：「项目矩阵」和「技能芯片」是构建时从 GitHub API 拉的，缓存在 `data/github.json`，12 小时内不重复请求。
- **动效**：数字雨是一张 `<canvas>`，切到后台会暂停；故障字、扫描线、霓虹闪烁全是 CSS；系统开了「减少动态效果」时会自动关掉。
- **体积**：两个字体子集加起来约 25 KB，CSS 和 JS 都是手写的，页面不加载任何第三方资源。

## 写一篇新文章

在 `content/posts/` 下新建一个 `.md` 文件：

```markdown
---
title: 文章标题
date: 2026-10-01 20:00
tags: [Go, 并发]
summary: 一句话摘要，会出现在卡片和 RSS 里
---

正文从这里开始。
```

然后：

```bash
npm run dev       # 本地预览 http://localhost:4173，改了文件自动重建
npm run deploy    # 构建并发布到 Cloudflare Pages
```

## 一些彩蛋

- 终端里试试 `neofetch`、`theme pink`、`rain off`；
- 在页面上（不是终端里）按一遍 ↑↑↓↓←→←→BA；
- 首页天际线上那块竖着的霓虹招牌，写的就是这个站的主题。

---

接下来几篇会把 GitHub 上的项目挨个拆开讲。发现 bug 或者有想法，欢迎到 [GitHub](https://github.com/RichZDS) 提 issue。
