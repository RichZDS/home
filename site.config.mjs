// 站点配置：改这里就能换名字、自我介绍、经历和首页精选项目。
export default {
  url: 'https://richzds.pages.dev',
  title: '乌托邦',
  description: '郑笃实的个人主页：一层以撒风格的地下室，放着我的文章、项目、跑团骰子、塔罗和喜欢的游戏与动漫。',
  author: '郑笃实',
  github: 'RichZDS',
  bilibili: { name: '郑笃实', url: 'https://space.bilibili.com/398587915' },
  // 上线日期
  since: '2026-09-29T18:00:00+08:00',

  // 起始房地上用粉笔写的自我介绍
  intro: {
    name: '郑笃实',
    lines: ['FunPlus · agent 开发', '山东理工大学 · 计算机学院'],
  },

  // 经历：按时间从早到晚，最后一条是现在所在的这一层
  timeline: [
    { kind: 'school', name: '山东省实验小学' },
    { kind: 'school', name: '山东大学附属中学' },
    { kind: 'school', name: '山东闻韶中学' },
    { kind: 'school', name: '山东理工大学', role: '计算机学院 · 在读' },
    { kind: 'work', name: '济南某公司', role: 'Go 后端实习', period: '2025.10 – 2026.02' },
    { kind: 'work', name: '柚子互娱（上海）', role: '技术中台 · agent 方向实习', period: '2026.03 – 2026.09' },
    { kind: 'work', name: 'FunPlus', role: 'agent 开发', period: '现在' },
  ],

  // 图书馆「项目」书架上展示的仓库，按顺序
  featured: ['Trangleagent', 'golangexe', 'BOSS', 'langchain_demo', 'SportsBackend', 'SDUT'],

  // 技术栈标签（从各仓库的依赖里整理出来的）
  stack: [
    'GoFrame', 'Spring Boot 3', 'MyBatis-Plus', 'Spring AI', 'FastAPI',
    'Vue 3', 'Ant Design Vue', 'Pinia', 'React', 'ECharts',
    'MySQL', 'Redis', 'MinIO', 'RabbitMQ', 'WebSocket', 'Docker Compose',
  ],

  // 很多仓库在 GitHub 上没有描述，这里补一句中文简介；post 指向对应的文章
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
    home: {
      note: '这个网站的源码：零依赖静态生成，像素画全部用代码画，GitHub Actions 自动部署到 Cloudflare Pages',
      post: 'hello-world',
    },
    'new-api': {
      note: 'AI 模型网关：把各家大模型统一转换成 OpenAI / Claude / Gemini 兼容格式（fork 自上游项目）',
    },
  },
};
