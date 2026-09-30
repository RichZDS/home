// 站点配置：名字、自我介绍、经历、各个栏目的内容都在这里改。
export default {
  url: 'https://richzds.pages.dev',
  title: '乌托邦',
  description: '郑笃实的个人主页：写过的文章、做过的项目，还有喜欢的游戏、跑团和动漫。',
  author: '郑笃实',
  github: 'RichZDS',
  bilibili: { name: '郑笃实', url: 'https://space.bilibili.com/398587915' },
  // 上线日期
  since: '2026-09-29T18:00:00+08:00',

  // 首页和「关于」里的自我介绍
  intro: {
    name: '郑笃实',
    lines: ['FunPlus · agent 开发', '山东理工大学 · 计算机学院'],
    bio: '在 FunPlus 做 agent 开发，山东理工大学计算机学院在读。这里放我写的文章、做过的项目，还有喜欢的游戏、跑团和动漫。',
  },

  // 经历：按时间从早到晚，最后一条是现在
  timeline: [
    { kind: 'school', name: '山东省实验小学' },
    { kind: 'school', name: '山东大学附属中学' },
    { kind: 'school', name: '山东闻韶中学' },
    { kind: 'school', name: '山东理工大学', role: '计算机学院 · 在读' },
    { kind: 'work', name: '济南某公司', role: 'Go 后端实习', period: '2025.10 – 2026.02' },
    { kind: 'work', name: '柚子互娱（上海）', role: '技术中台 · agent 方向实习', period: '2026.03 – 2026.09' },
    { kind: 'work', name: 'FunPlus', role: 'agent 开发', period: '现在' },
  ],

  // 「学习」页突出展示的两个项目；其他仓库按 GitHub 的样子列在下面。
  // repo 对上 GitHub 仓库名时会自动带上星数、语言和更新时间；仓库还没公开时用这里的 url / langs 顶上
  featured: [
    {
      repo: 'SDUT',
      title: 'SDUT 计科中外学习小 tip',
      tagline: '前人走过的弯路，后人不必再走',
      desc: '山东理工大学计算机学院中外合作办学班的学习资料库。刚进大学时，作业答案、PTA 的代码和思路、历年试卷、上完一门课才悟出来的重点，全靠口口相传、纯属偶然。这个仓库把这些东西按学期整理成公开的、大家可以一起补充的资料，让后来的人少走弯路。',
      facts: ['按学期分目录：大一下、大二上', '离散数学 · 线性代数 · 面向对象 · 马克思主义原理', '课程笔记、作业思路、历年试卷、踩坑记录'],
      post: 'sdut-study-tips',
    },
    {
      repo: 'easygo_agent',
      title: 'EasyGo Agent 集群',
      tagline: '可以快速部署的通用 Agent 集群基础版',
      desc: 'EasyGo 只负责 Agent 的运行、通信、协作、质量和交付，不含具体业务；在它上面加一个 Agent 包（角色、工作流、技能、工具、验收检查），就能改造成专用 Agent。三个可以分别部署的服务通过 JSON-RPC over HTTPS + 双向 TLS 互相调用：Go 写的 AI 网关负责模型协议映射、流式输出和用量计价；TypeScript 写的 Agent Loop 负责会话、持久队列和模型 / 工具循环；Go 写的工坊负责接入 Codex、Claude Code 这些 CLI 框架，管理工作区和产物。',
      facts: ['三个服务：ai-gateway（Go）· agent-loop（TypeScript）· workshop（Go）', '托管平台：Web 控制台、按 token 计费的钱包、每次执行一个无网络只读根的沙箱容器', '协作、质量闸、Agent 包还在设计中'],
      langs: ['Go', 'TypeScript'],
      url: 'https://github.com/RichZDS/easygo_agent',
      status: '仓库还在整理，公开后这里会自动接上 GitHub 的数据',
    },
  ],

  // 游戏房
  games: [
    {
      name: '以撒的结合',
      en: 'The Binding of Isaac',
      stat: '1000+ 小时',
      note: '玩得最久的游戏，这个网站的像素小人也是从这里来的。',
      fav: {
        label: '最爱的道具',
        name: '硫磺火',
        en: 'Brimstone',
        facts: ['恶魔房道具，拿到以后头上长出一对小角', '眼泪换成蓄力的血激光', '射程无限，能穿透敌人和障碍物，还能扫着打'],
      },
    },
    {
      name: '黎明杀机',
      en: 'Dead by Daylight',
      stat: '屠夫主',
      note: '基本只玩屠夫。',
      fav: {
        label: '本命屠夫',
        name: '追踪者',
        en: 'Nemesis',
        facts: ['出自《生化危机 3》', 'T 病毒触手：蓄力甩出去，打中的人会被感染', '变异等级越高，触手甩得越远；场上还有两只丧尸帮忙巡逻'],
      },
    },
  ],

  // 跑团
  trpg: {
    role: '常跑三套规则，平时多半坐在主持人的位置。',
    systems: [
      { name: '三角机构', en: 'Triangle Agency', note: '6d4，数 3 的个数' },
      { name: '克苏鲁的呼唤', en: 'Call of Cthulhu', note: 'd100，对技能值检定' },
      { name: '龙与地下城', en: 'Dungeons & Dragons', note: 'd20 加调整值' },
    ],
  },

  // 动漫
  anime: {
    outcast: {
      name: '一人之下',
      note: '米二的漫画。整部都喜欢，最喜欢老天师的这句：',
      quote: '想走的路不好走，想做人不好做，都说是身不由己，不是废话么。己不由心，身又岂能由己！',
      by: '老天师 · 张之维',
    },
    sunMoon: {
      name: '日月同错',
      note: '第年秒的漫画。头像就是里面的海山，这一页顶上的蓬莱也是照着他的出身画的。',
    },
  },

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
