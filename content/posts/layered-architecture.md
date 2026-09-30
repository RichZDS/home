---
title: 最尊重模块化：Spring Boot 里的 DTO / DO / VO 分层实践
date: 2026-09-29 13:00
tags: [Java, Spring Boot, 架构, MapStruct, React]
summary: 以运动场馆管理系统为例，拆解 controller → service → dao 的分层，以及 DTO 进、DO 落库、VO 出的对象边界，用 MapStruct 把转换代码交给编译器。
repo: SportsBackend
period: 2025.12 — 2026.01
---

GitHub 签名写的是「最尊重模块化的选手」。这篇拿 [SportsBackend](https://github.com/RichZDS/SportsBackend) 和 [SportsFrontend](https://github.com/RichZDS/SportsFrontend) 讲讲这句话落到代码里是什么样子。

这个项目一开始叫「消费管理系统」：管理员管客户和消费记录、看统计报表，客户查自己的消费。后来后端又长出了课程、预约、教练、器材、场地、员工这些模块，成了一个运动场馆管理系统。模块多了以后，分层是否清楚会直接决定项目能不能继续写下去。

## 分层

前端 README 里画过一张规划：`controller → logic → service → dao → do → dto → vo`。落到后端代码里是这样的：

```text
com.zds.sports
├─ controller/      # HTTP 入口：参数、状态码、接口文档
├─ service/         # 业务接口
│  └─ impl/         # 业务实现（继承 MyBatis-Plus 的 ServiceImpl）
├─ dao/             # Mapper，只管读写数据库
├─ domain/entity/   # DO：和表一一对应，比如 ConsumeRecordDO
├─ model/dto/       # DTO：入参，比如 CreateRecordDTO / UpdateRecordDTO
├─ model/vo/        # VO：出参，比如 RecordVO / PageResultVO
├─ convert/         # MapStruct 转换器
└─ config/          # 跨域、Jackson、分页、全局异常、自动填充
```

规划里的 `logic` 层（跨多个 service 的编排）暂时没有单独拆出来。业务还简单的时候，编排直接写在 service 里就够了，等出现一个接口要协调好几个领域的情况再拆也来得及。

## 三种对象，三条边界

| 对象 | 方向 | 例子 | 负责什么 |
| --- | --- | --- | --- |
| DTO | 请求 → 后端 | `CreateRecordDTO` | 接收并校验入参 |
| DO | 后端 ↔ 数据库 | `ConsumeRecordDO` | 和表结构对齐 |
| VO | 后端 → 响应 | `RecordVO` | 前端真正需要的字段 |

为什么不一个实体类用到底？因为三者变化的原因不一样：

- 表加了一列审计字段，不应该让前端看到，所以 **VO 和 DO 要分开**；
- 创建和更新需要的字段、校验规则不一样，所以 **Create / Update 各有一个 DTO**；
- 前端想要「客户名」而不是「客户 ID」，这种展示需求只改 VO 和转换器，不碰表结构。

入参 DTO 用 Jakarta Validation 把关：

```java CreateRecordDTO.java
@Data
public class CreateRecordDTO {
    @NotNull
    private Long customerId;
    @NotNull
    private BigDecimal amount;
    @NotNull
    private String category;
    private String remark;
    @NotNull
    private String paidAt;
}
```

金额用的是 `BigDecimal` 而不是 `double`，写和钱有关的代码时这一点不能省。

## 转换交给 MapStruct

对象分开以后，最烦的是互相拷字段。MapStruct 在**编译期**生成转换代码，不用反射，出错时编译就报：

```java RecordMapStruct.java
@Mapper(componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface RecordMapStruct {
    @Mapping(target = "customerName",
             expression = "java(recordDO.getCustomer() != null ? recordDO.getCustomer().getName() : null)")
    RecordVO toVO(ConsumeRecordDO recordDO);

    @Mapping(target = "paidAt", expression = "java(parseDateTimeFlexible(createRecordDTO.getPaidAt()))")
    ConsumeRecordDO toDO(CreateRecordDTO createRecordDTO);

    @Mapping(target = "paidAt", expression = "java(parseDateTimeFlexible(updateRecordDTO.getPaidAt()))")
    void updateDO(UpdateRecordDTO updateRecordDTO, @MappingTarget ConsumeRecordDO recordDO);
}
```

`NullValuePropertyMappingStrategy.IGNORE` 很关键：更新时 DTO 里没传的字段是 `null`，这个策略保证它不会把数据库里原来的值覆盖掉，局部更新就这样实现了。

有了转换器，service 里的代码只剩业务本身：

```java ConsumeRecordServiceImpl.java
public RecordVO createRecord(CreateRecordDTO createRecordDTO) {
    ConsumeRecordDO recordDO = recordMapStruct.toDO(createRecordDTO);
    this.save(recordDO);
    return recordMapStruct.toVO(recordDO);
}
```

DTO 进，DO 落库，VO 出，一眼能看完。

## controller 保持薄

```java ConsumeRecordController.java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
@Operation(summary = "Create a new consumption record")
public RecordVO createRecord(@Valid @RequestBody CreateRecordDTO createRecordDTO) {
    return consumeRecordService.createRecord(createRecordDTO);
}
```

controller 只做三件事：声明路由和状态码（创建返回 201，删除返回 204）、触发校验（`@Valid`）、把活交给 service。校验失败由 `GlobalExceptionHandler` 统一处理，把字段错误拼成一条可读的消息返回 400；其他未捕获的异常也会记日志，统一返回 500。

## 前端也分层

前端是 React + Ant Design + ECharts，同样按职责拆开：

```text
src/
├─ pages/        # Admin/Customers、Admin/Records、Admin/Reports、Customer/Records
├─ components/   # Table、Form、Chart（统一封装 ECharts）
├─ services/     # Axios 封装，baseURL 来自 VITE_API_BASE
└─ routes/       # 路由配置
```

图表组件只收一个 `options`：

```jsx
<Chart options={options} style={{ height: 360 }} />
```

页面只管准备数据，怎么初始化 ECharts、窗口变化时怎么 resize，都关在组件里面。

## 小结

模块化不是为了目录好看，而是为了**改一处的时候，只需要改一处**：

- 改表结构，只动 DO 和转换器；
- 改返回格式，只动 VO 和转换器；
- 改校验规则，只动 DTO；
- 换图表库，只动 `Chart` 组件。
