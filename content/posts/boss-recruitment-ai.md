---
title: BOSS 招聘系统：Spring Boot 3 + Vue 3，再接一个 DeepSeek 简历优化
date: 2026-09-29 15:00
tags: [Java, Spring Boot, Vue, Spring AI, DeepSeek]
summary: 求职者、Boss、管理员三种角色的招聘系统：岗位、简历、投递、面试全流程，用注解 + AOP 做权限，最后用 Spring AI 接 DeepSeek 做简历优化。
repo: BOSS
period: 2026.01
---

[BOSS](https://github.com/RichZDS/BOSS) 是一个招聘系统：Boss 发岗位，求职者投简历，Boss 处理投递、安排面试，管理员兜底。最后一次提交是 `feat(ai): 集成DeepSeek AI优化简历功能`，所以这篇从业务流程讲到 AI 接入。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 后端框架 | Spring Boot 3.2.5 |
| 数据访问 | MyBatis-Plus 3.5.9（带代码生成器）+ MySQL |
| 会话 | Spring Session + Redis |
| 接口文档 | Knife4j（OpenAPI 3） |
| 文件存储 | 腾讯云 COS（简历附件） |
| AI | Spring AI 的 DeepSeek starter 1.0.0 |
| 前端 | Vue 3 + Vite + TypeScript + Pinia + Ant Design Vue |
| 前端请求 | `@umijs/openapi` 根据后端文档生成接口代码 |

## 三种角色，一条流水线

```text
求职者：注册 → 写简历 → 浏览岗位 → 投递 → 查看进度 → 面试
Boss  ：维护公司 → 发布岗位 → 处理投递（接受 / 拒绝 / 待定）→ 安排面试
管理员：用户管理 → 全局投递管理
```

数据库里对应七张核心表：`user`、`company`、`job_posting`、`resume`、`application`（投递）、`boss_application_decision`（投递处理）、`interview`（面试）。前端路由也按角色分：`/user/resumes`、`/user/applications` 是求职者的，`/boss/company`、`/boss/applications` 是 Boss 的，`/admin/applications` 是管理员的。

## 权限：一个注解 + 一个切面

接口上标一个 `@AuthCheck`，写明需要的角色：

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuthCheck {
    String mustRole() default "";
}
```

```java
@AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
```

`AuthInterceptor` 用 `@Around("@annotation(authCheck)")` 拦截这些方法：取当前登录用户，被封禁（`status == 0`）的直接拒绝，管理员直接放行，需要 Boss 权限的接口只放 Boss 进去。

权限逻辑集中在一个地方，controller 里一行注解就够了，这就是切面的价值。

## AI 简历优化

`ResumeController` 里有一个 `POST .../ai/optimize` 接口，交给 `AiServiceImpl` 处理。它用 Spring AI 的 `ChatClient` 包了一层 DeepSeek：

```java
ChatClient chatClient = ChatClient.builder(deepSeekChatModel).build();
String response = chatClient.prompt()
        .system(SYSTEM_PROMPT)
        .user(userMessage)
        .call()
        .content();
```

系统提示词把模型设定成「有 10 年以上招聘经验的简历分析师」，给了三条优化原则：

1. 标题简洁有力，突出核心职位和关键技能；
2. 个人摘要控制在 100–200 字，突出核心竞争力；
3. 详细内容用 **STAR 法则**（情境、任务、行动、结果）描述经历，尽量量化。

还特别要求「保持内容真实，在原有基础上润色」，最后规定**只返回 JSON**：

```json
{
  "resumeTitle": "优化后的简历标题",
  "summary": "优化后的个人摘要",
  "content": "优化后的详细内容"
}
```

模型不一定听话，经常会把 JSON 包在 Markdown 代码块里。所以 `extractJson` 会先找 ```` ```json ```` 代码块，把里面的内容抠出来，再交给 Jackson 解析。解析失败统一抛 `BusinessException`，前端拿到的是可读的错误信息，而不是一串堆栈。

> [!TIP]
> 让大模型输出结构化数据，三件事缺一不可：提示词里给出**完整的 JSON 示例**；解析前**剥掉代码块**；解析失败要有**明确的业务错误**。

## 可以继续打磨的地方

- 封禁状态的检查写在 `mustRole` 分支里，没标 `@AuthCheck` 的接口不会经过这一步。如果希望所有登录接口都拦住被封账号，可以把检查挪到 `getLoginUser` 里统一做。
- `ChatController` 里还留着 `/chat/test`、`/chat/model` 两个调试接口，上线前最好删掉或者加上权限。
- AI 返回的原始内容会整段打进 info 日志，简历里有个人信息，生产环境建议降到 debug 或者脱敏。

## 小结

这个项目把一个中等规模的 CRUD 系统做全了：三种角色、七张表、完整的投递流程，再用注解和切面把权限收到一处。AI 部分最有意思的不是调接口，而是**怎么让模型稳定地吐出能被程序解析的 JSON**。
