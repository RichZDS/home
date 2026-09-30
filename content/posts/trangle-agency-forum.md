---
title: 三角机构论坛：GoFrame + Vue 3 的 TRPG 社区全栈拆解
date: 2026-09-29 17:00
tags: [Go, GoFrame, Vue, WebSocket, RabbitMQ, Docker]
summary: 给《三角机构》TRPG 做的社区：论坛、多人聊天室、分部与收容库、文件上传。拆开看 GoFrame 分层、RabbitMQ 广播的聊天室和 Docker Compose 一键部署。
repo: Trangleagent
period: 2025.12 — 2026.04
---

《三角机构》是一款 TRPG（桌上角色扮演游戏）。跑团需要的东西很杂：规则讨论、角色卡、团内聊天、资料分享。[Trangleagent](https://github.com/RichZDS/Trangleagent) 把这些做进了一个站里：后端 Go，前端 Vue 3，整套服务用 Docker Compose 拉起来。

## 总览

| 服务 | 端口 | 作用 |
| --- | --- | --- |
| frontend | 80 | Nginx 托管前端静态文件，同时反代 API |
| backend | 8888 | GoFrame 后端 |
| mysql | 3306 | 业务数据 |
| minio | 9000 / 9001 | 对象存储（API / 控制台） |
| rabbitmq | 5672 / 15672 | 聊天消息广播（AMQP / 管理界面） |

后端 `go.mod` 里的主要依赖：

- `gogf/gf/v2` v2.9.5：Web 框架，自带 ORM、配置、日志和代码生成；
- `minio-go/v7`：上传文件到 MinIO；
- `rabbitmq/amqp091-go`：连接 RabbitMQ；
- `patrickmn/go-cache`：进程内缓存；
- `jordan-wright/email`：发邮件；
- `brianvoe/gofakeit/v6`：`cmd/seeder` 用它造测试数据。

前端是 Vue 3 + Vite + Ant Design Vue，帖子编辑器用的是 `md-editor-v3`，请求代码由 `npm run swagger:generate`（`zerone api`）根据接口文档生成。

## GoFrame 的分层

GoFrame 的单仓库模板把一个接口拆成几层，这个项目基本照着来：

```text
Backend/
├─ api/            # 请求 / 响应结构体，按模块和版本分：api/forum/v1/...
├─ internal/
│  ├─ controller/  # 接收请求，调用 service
│  ├─ service/     # 接口定义
│  ├─ logic/       # 接口实现：Forum / chat / room / user / trace ...
│  ├─ dao/         # 数据访问，由 gf gen dao 生成
│  └─ model/       # 数据库实体、业务模型
└─ manifest/       # 配置、SQL、Docker、部署清单
```

`logic` 里的每个模块在 `init()` 里把自己注册到 `service`：

```go room.go
type sRoom struct{}

func New() *sRoom {
	return &sRoom{}
}

func init() {
	service.RegisterRoom(New())
}
```

这样 **controller 只依赖 service 接口**，不关心实现在哪。要换实现、写测试，只动一层。

业务模块基本对应游戏里的概念：

- **forum**：版块、帖子、评论；
- **room**：跑团房间，配合下面的 WebSocket 聊天室；
- **department**：三角机构的分部，记录分部名称、经理、地址、散逸端数量，还有一个「天气」字段；
- **containment**：收容库，记录异常体、负责的特工、所属散逸端；
- **trace**：按用户、角色、部门查询红 / 黄 / 蓝三条轨迹。

## 多人聊天室：WebSocket + RabbitMQ

聊天室的设计文档（`Backend/docs/CHAT_WEBSOCKET.md`）写得很清楚：

1. 前端连接 `ws://host/ws/chat`，可以用 `?token=xxx` 带上 JWT；
2. 客户端发送 `join` / `leave` / `chat` 三种消息，带上 `roomId`、`userId`、`nickname`、`roleName`；
3. 后端把消息发布到 RabbitMQ 的 `chatroom_broadcast` **fanout 交换器**；
4. 每个后端实例绑定一条独立队列，消费到消息后，推给**本实例**里在这个房间的 WebSocket 连接。

消息格式：

```json
{
  "roomId": "1",
  "userId": "123",
  "nickname": "用户昵称",
  "roleName": "角色名",
  "message": "消息内容",
  "type": "join|leave|chat",
  "time": 1710000000000
}
```

为什么要绕一圈 RabbitMQ？因为 WebSocket 连接是**有状态**的。用户 A 连在实例 1，用户 B 连在实例 2，实例 1 收到 A 的消息，在本地找不到 B。fanout 交换器把每条消息复制给所有实例，每个实例只负责推给自己手上的连接，后端就能水平扩展了。

> [!TIP]
> 文档里还有一句：RabbitMQ 没配置或者连不上时，**自动降级为单实例本地广播**。本地开发不装 MQ 也能跑，这个降级很实用。

## 骰子与「三重升华」

`Backend/utils/Dice.go` 支持 4、8、10、12、20、24、30、100 面骰。另一个函数 `Chaos` 把不是 3 的点数加起来，恰好出现三个 3 时直接返回 0，注释写的是「三重升华」：

```go Dice.go
func Chaos(dice []int) (sum int) {
	// 如果 dice 里面有三个三，sum 为 0
	trible := 0
	for i := 0; i < len(dice); i++ {
		if dice[i] != 3 {
			sum += dice[i]
		}
		if dice[i] == 3 {
			trible++
		}
	}
	if trible == 3 { // 三重升华
		return 0
	}
	return sum
}
```

顺手记一个可以改进的地方：`Dice` 每次调用都会执行 `rand.Seed(time.Now().UnixNano())`。Go 1.20 起 `rand.Seed` 已经弃用，全局随机源在启动时会自动播种。项目用的是 Go 1.25，可以直接删掉这一行，或者换成 `math/rand/v2`：

```go
import "math/rand/v2"

func Dice(num, side int) []int {
	result := make([]int, num)
	for i := range result {
		result[i] = rand.IntN(side) + 1
	}
	return result
}
```

## 文件上传：MinIO

帖子图片和资料文件存在 MinIO，配置在 `manifest/config/config.yaml`：

```yaml
minio:
  endpoint: "localhost:9000"
  accessKey: "minioadmin"
  secretKey: "minioadmin"
  bucket: "trangleagent"
  useSSL: false
```

图片要能被直接访问，需要给 bucket 配一条只读的公开策略（只放开 `s3:GetObject`）。

> [!WARNING]
> `minioadmin / minioadmin`、`guest / guest` 都是默认账号，只适合本地开发。部署到公网前一定要改掉，也别把真实配置提交进仓库。

## 一键部署

```bash
# 构建并启动所有服务
docker compose up -d --build

# 看后端日志
docker compose logs -f backend
```

第一次启动时，MySQL 会自动执行 `Backend/manifest/sql/` 下的初始化脚本；MinIO 要先在控制台建好 `trangleagent` bucket；注册第一个用户就能登录。

## 小结

- GoFrame 的 `api → controller → service → logic → dao` 让每层只关心一件事；
- WebSocket 有状态，多实例广播交给 RabbitMQ 的 fanout 交换器；
- 依赖组件（MQ、对象存储）都有降级或默认配置，本地开发成本低；
- 骰子这类小工具函数值得补单元测试，顺便把弃用的 API 换掉。

前端的早期版本在 [TrangleAgentWeb](https://github.com/RichZDS/TrangleAgentWeb) 仓库。
