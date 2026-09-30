---
title: 织文：用 FastAPI + Vue 3 做一个 AI 全文生成器
date: 2026-09-29 14:00
tags: [Python, FastAPI, Vue, AI, OpenAI 兼容接口]
summary: 输入主题、受众、风格和提纲，生成带标题、摘要和提纲的 Markdown 全文。没有 API Key 也能跑的演示模式，加上任意 OpenAI 兼容接口。
repo: langchain_demo
period: 2026.06
---

[织文](https://github.com/RichZDS/langchain_demo)是一个前后端分离的 AI 写作示例：前端 Vue 3 + Ant Design Vue，后端 FastAPI，接口按 RESTful 风格设计。填好主题、写作目的、目标读者、风格、字数、关键词和提纲，就能生成一篇完整的文章。

## 结构

```text
langchain_demo/
├─ frontend/                 # Vue 3 + Ant Design Vue，端口 9000
│  └─ src/
│     ├─ App.vue             # 生成指导、表单、结果与历史
│     ├─ api.ts              # REST API 客户端
│     └─ styles.css
└─ backend/                  # FastAPI，端口 9001
   ├─ app/
   │  ├─ routers/            # RESTful 路由
   │  ├─ services/           # AI 生成服务
   │  ├─ repository.py       # 内存文章仓库
   │  └─ main.py
   ├─ scripts/export_openapi.py
   └─ tests/
```

开发时 Vite 把 `/api` 代理到 `http://127.0.0.1:9001`，前后端各跑各的端口，不用处理跨域。

## REST API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/v1/health` | 健康检查 |
| `POST` | `/api/v1/articles` | 生成并创建文章 |
| `GET` | `/api/v1/articles` | 获取文章列表（`skip` / `limit` 分页） |
| `GET` | `/api/v1/articles/{id}` | 获取文章详情 |
| `DELETE` | `/api/v1/articles/{id}` | 删除文章 |

「生成」被建模成**创建一个文章资源**：`POST /articles` 成功返回 `201 Created`；AI 服务出错时返回 `502 Bad Gateway`，并附上 `GENERATION_FAILED` 错误码。上游坏了就说上游坏了，这个状态码选得很准。

FastAPI 自带 Swagger（`/docs`）和 ReDoc（`/redoc`），`scripts/export_openapi.py` 还能把 OpenAPI JSON 导出来，给其他工具用。

## 两种生成模式

`ArticleGenerator.generate()` 根据环境变量 `AI_MODE` 选路：

```python
async def generate(self, request: ArticleCreate) -> GeneratedArticle:
    if settings.ai_mode.lower() == "openai":
        if not settings.ai_api_key:
            raise GenerationError("AI_MODE=openai 时必须配置 AI_API_KEY")
        return await self._generate_with_openai(request)
    return self._generate_demo(request)
```

- **demo 模式（默认）**：不调任何模型，用模板按「为什么值得关注 → 先搭框架 → 可执行步骤 → 常见误区 → 结语」拼出一篇结构完整的文章。没有 Key 也能完整演示前后端流程，写测试也不用 mock 网络。
- **openai 模式**：用 `httpx` 直接请求 `{AI_BASE_URL}/chat/completions`。`AI_BASE_URL` 换成任何 OpenAI 兼容的服务都行。

```powershell
$env:AI_MODE = "openai"
$env:AI_API_KEY = "你的密钥"
$env:AI_BASE_URL = "https://api.openai.com/v1"
$env:AI_MODEL = "gpt-4.1-mini"
```

## 提示词怎么写

系统消息只做一件事，约束输出格式：

```text
你是一名专业中文编辑。输出严格的 JSON 对象，字段必须为
title、abstract、outline（字符串数组）、content（Markdown 全文）。
```

请求里还带了 `response_format: {"type": "json_object"}`。用户消息把表单里的每个字段逐条列出来，最后给出硬性要求：

```text
要求：标题有吸引力，摘要不超过 120 字；正文使用 Markdown 二级标题分段，
逻辑完整、信息具体、有开头和结语，不编造数据或来源。
```

「不编造数据或来源」这一句很重要。写作类应用最大的风险不是文笔差，而是一本正经地编参考文献。

返回之后，`_parse_json` 先用正则剥掉可能出现的 ```` ```json ```` 代码块，再 `json.loads`。缺字段、类型不对、JSON 坏掉，全部收敛成 `GenerationError`，路由层再翻译成 502。

## 字数怎么数

中文按字、英文按词：

```python
def count_words(text: str) -> int:
    """中文按字、英文按词统计，提供接近阅读习惯的字数。"""
    return len(re.findall(r"[㐀-鿿]|[A-Za-z0-9]+", text))
```

## 下一步

- 仓库名叫 `langchain_demo`，但目前的实现没有引入 LangChain，而是用 `httpx` 直接调接口。先用最少的依赖跑通，后面再把 PromptTemplate、输出解析器之类换成 LangChain 的组件，是个稳妥的顺序；
- 历史记录存在内存里（`ArticleRepository`），服务一重启就清空。换成 SQLite 或 MySQL 时只需要替换仓库实现，路由层不用动，这也是当初把仓库单独抽出来的好处；
- 长文生成可以改成流式返回（SSE），体验会好很多。
