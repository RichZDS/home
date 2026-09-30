// 站点配置：改这里就能换标题、打字机文案、首页精选项目。
export default {
  url: 'https://richzds.pages.dev',
  title: 'RichZDS',
  tagline: '赛博终端',
  description: '不会编码的 Isaac 的个人博客：Go / Java / Vue / AI 应用的项目档案与学习笔记。',
  author: '不会编码的Isaac',
  github: 'RichZDS',
  // 上线日期，页脚 UPTIME 从这里开始计时
  since: '2026-09-29T18:00:00+08:00',

  // 首页打字机轮播的句子
  typer: [
    '欢迎接入，netrunner',
    'Go · Java · Vue · Python',
    '先预测，再运行',
    '在霓虹下写 CRUD，也写并发',
    'git push --force-with-lease',
  ],

  // 首页「项目矩阵」展示的仓库，按顺序
  featured: ['Trangleagent', 'golangexe', 'BOSS', 'langchain_demo', 'SportsBackend', 'SDUT'],

  // 「技能芯片」里的技术栈标签（从各仓库的依赖里整理出来的）
  stack: [
    'GoFrame', 'Spring Boot 3', 'MyBatis-Plus', 'Spring AI', 'FastAPI',
    'Vue 3', 'Ant Design Vue', 'Pinia', 'React', 'ECharts',
    'MySQL', 'Redis', 'MinIO', 'RabbitMQ', 'WebSocket', 'Docker Compose',
  ],

  // 很多仓库在 GitHub 上没有描述，这里补一句中文简介；post 指向对应的博客文章
  repoNotes: {
    Trangleagent: {
      note: '三角机构 TRPG 社区：GoFrame + Vue 3，WebSocket 聊天室、RabbitMQ 广播、MinIO 上传，Docker Compose 一键启动',
      post: 'trangle-agency-forum',
    },
    golangexe: {
      note: 'Go 锁机制情景训练营：12 关，从 goroutine 一路打到 CAS，先预测再运行',
      post: 'go-lock-bootcamp',
    },
    BOSS: {
      note: 'BOSS 招聘系统：Spring Boot 3 + Vue 3，求职者 / Boss / 管理员三角色，DeepSeek 简历优化',
      post: 'boss-recruitment-ai',
    },
    langchain_demo: {
      note: '织文 · AI 全文生成：Vue 3 + FastAPI，默认演示模式，可接任意 OpenAI 兼容接口',
      post: 'zhiwen-ai-writer',
    },
    SportsBackend: {
      note: '运动场馆管理系统后端：Spring Boot 3 + MyBatis-Plus，controller / service / dao 分层，DTO / DO / VO + MapStruct',
      post: 'layered-architecture',
    },
    SportsFrontend: {
      note: '消费管理系统前端：React + Ant Design + ECharts 统计报表',
      post: 'layered-architecture',
    },
    TrangleAgentWeb: {
      note: '三角机构论坛的早期前端：Vue 3 + TypeScript',
      post: 'trangle-agency-forum',
    },
    SDUT: {
      note: 'SDUT 计科中外学习小 tip：前人走过的弯路，后人不必再走',
      post: 'sdut-study-tips',
    },
    StudyNotes: {
      note: 'Obsidian 学习笔记库：408、数据库、编译原理、Go 与三角机构规则整理',
    },
    'new-api': {
      note: 'AI 模型网关：把各家大模型统一转换成 OpenAI / Claude / Gemini 兼容格式（fork 自上游项目）',
    },
  },
};
