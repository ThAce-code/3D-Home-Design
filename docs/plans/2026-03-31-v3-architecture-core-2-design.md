# V3 Architecture Core 2.0 设计

> 更新日期：2026-03-31
> 适用仓库：`D:\3D-Home-Design`
> 阶段定位：住宅平面设计器路线中的 `V3`
> 目标：把当前 `WallTool V2` 从“已可用”升级为“稳定、可扩展、可承载 V4/V5 的建筑编辑内核”，并同步完成首页与编辑场景的 V3 视觉重置
> 文档位置：根目录 `D:\3D-Home-Design\docs\plans`
> 建议开发位置：`D:\3D-Home-Design\.worktrees\architecture-core-v3`

---

## 1. V3 目标定义

V3 不再把重点放在继续补单点交互问题，而是把当前已经跑通的墙体编辑链路固化为清晰分层的架构。

V3 的目标有 4 个：

- 稳定：墙、顶点、zone、连接关系在连续编辑后仍然一致
- 分层：输入解释、拓扑修复、几何派生、渲染展示不再互相串逻辑
- 可扩展：给 `opening`、房间语义、尺寸编辑、拖拽修改留出标准入口
- 可验证：关键拓扑和几何行为有稳定回归测试覆盖

V3 成功后，项目应具备一个可靠判断：

`后续功能是“挂在内核上”，而不是“再往 scene 事件里堆条件分支”。`

## 1.1 实施位置约定

本设计文档保存在根目录 `docs/plans/`，作为主仓库级规划文档维护。

但 V3 的实际代码实施不应直接在 `D:\3D-Home-Design` 根工作区进行，而应在新的独立 worktree 中进行。

当前建议的 V3 工作目录为：

`D:\3D-Home-Design\.worktrees\architecture-core-v3`

## 2. 模块拆分

### 2.1 `src/architecture/domain`

只保存稳定领域对象和 identity 规则：

- `Level`
- `Vertex`
- `Wall`
- `Zone`
- 后续可扩展的 `OpeningAnchor`、`RoomMeta`

### 2.2 `src/architecture/editing`

只负责用户输入和工具生命周期：

- `WallToolController`
- draft state
- command building
- selection intent
- undo/redo transaction boundary

### 2.3 `src/architecture/snapping`

从现有 `wallDraftSnap` 发展为统一吸附层：

- endpoint snap
- closure snap
- wall-body snap
- orthogonal constraint
- future dimension/guide snap

### 2.4 `src/architecture/topology`

只负责稳定墙图：

- segment split
- merge / cleanup
- junction classification
- graph consistency
- zone extraction
- identity reuse

### 2.5 `src/architecture/geometry`

只负责派生几何：

- wall footprint / mesh
- junction join policy
- zone polygons
- preview overlays
- selection outlines

### 2.6 `src/components/canvas` 与 `src/components/panels`

只负责展示和交互绑定：

- scene event routing
- overlays / HUD
- wall / zone / handle rendering
- property panels

### 2.7 `src/app` / 路由与入口壳层

V3 需要把“直接进入编辑器”的当前结构调整为“独立落地页 + 编辑器入口”：

- `/`：落地页
- `/editor`：编辑器

约束如下：

- 保持为同一个 React 前端，不拆成两套应用
- 首页负责品牌、价值展示、入口引导
- 编辑器继续负责建模和设计
- 首页与编辑器可以共用基础样式变量，但不共享页面布局结构

## 3. 和 Pascal 对照的参考点

### 3.1 要参考的点

- `tool` 不是几段散落事件，而是独立编辑状态机
- `system` 负责几何/拓扑更新，不把规则塞进组件
- 渲染层只吃稳定结果，不反向决定拓扑
- 用户看到的是清晰的编辑反馈，而不是“猜系统现在吸到了哪里”

### 3.2 不直接照搬的点

- 不照搬 Pascal 的全部 wall miter / node 体系
- 不在 V3 引入过重的 junction 几何复杂度
- 不为了贴近 Pascal 结构去重写现有 React/Zustand 外壳

### 3.3 本项目的落地原则

借 Pascal 的“分层方法”，不复制 Pascal 的“全部工程形态”。

当前项目更适合：

- 保留 React + Zustand + R3F 壳层
- 自己维护 `domain -> editing -> topology -> geometry -> presentation`
- junction 几何先以稳定优先，再逐步提高精细度

## 4. 三个里程碑

### 里程碑 1：Core Boundary Stabilization

目标：
把现有 V2 的输入、拓扑、几何边界切开，先得到清晰的内核骨架。

主要工作：

- 抽出 `WallToolController`
- 抽出 `SnapEngine`
- 统一 draft commit pipeline
- 明确 scene 只负责事件转发，不直接做拓扑决策
- 明确 zone rebuild 和 mesh rebuild 的触发边界

风险：

- 迁移时容易出现“功能没少，但行为细节变了”
- scene 现有事件仍可能绕过新 controller
- 一旦状态和 store 拆分不干净，后面还会回到双入口

验收标准：

- 所有画墙行为都经过统一 controller
- `Shift`、闭合、wall-body snap、取消、删除都走同一条提交链
- 不再出现“预览一个点，提交另一个点”的分裂行为
- 现有 V2 回归测试全部通过

### 里程碑 2：Topology And Identity Hardening

目标：
把墙图、junction、zone identity 稳定下来，使 V5 的房间语义有可靠承载体。

主要工作：

- junction 分类模型化：end, corner, tee, cross
- 统一 split / merge / cleanup 顺序
- zone extraction 与 identity reuse 规则稳定化
- 补齐典型图形回归样例：套圈、桥接、共墙分区、穿墙交叉
- 建立“编辑后 identity 尽量不漂移”的约束

风险：

- zone identity 稳定性和 face extraction 正确性容易互相牵扯
- junction 分类一旦定义不清，mesh 和 selection 会各走各的逻辑
- topology 修正过强会吞掉用户意图，过弱又会留下碎图

验收标准：

- 典型房型图在重复编辑后 zone identity 尽量复用
- T 字、十字、回字、嵌套矩形、桥接结构稳定成图
- 删除、补墙、移动端点后不会频繁出现假 zone 或丢 zone
- topology 规则能脱离组件单独测试

### 里程碑 3：Geometry And Editor Integration

目标：
让稳定内核真正成为后续编辑体验和住宅语义的承接层。

主要工作：

- 统一 wall mesh builder 与 junction join policy
- 分离 preview geometry 和 committed geometry
- 统一 hit-test / selection priority
- 为 `opening`、edit handles、dimension overlays 预留接口
- 整理属性面板与场景对象的绑定方式

风险：

- geometry 如果继续夹带拓扑修复，会把前两个里程碑成果冲掉
- hit-test 规则若不统一，V4 的拖拽编辑会继续混乱
- preview 和 committed 走两套逻辑时，用户仍会感觉“所见非所得”

验收标准：

- 墙、zone、preview、selection 都从统一派生数据读取
- junction mesh 不再依赖临时 case-by-case 补洞
- scene 中新增一个交互工具时，不需要再改 topology 内核
- V4 所需的 edit handle、尺寸标注可以直接挂到现有数据流上

## 5. V3 完成后的产出物

V3 结束时，至少应明确拥有以下产出：

- 清晰的 architecture 模块边界
- 稳定的 wall / vertex / zone identity 策略
- 独立的 snapping、topology、geometry 子系统
- 一套覆盖主要平面关系的回归样例
- 可供 V4 直接复用的 tool / selection / overlay 接口
- 一个独立落地页入口，以及浅色化后的编辑器视觉基线

## 6. V3 Visual Reset

### 6.1 范围定义

V3 的视觉重置是正式范围，不是额外附带项。

包括：

- 独立首页
- 编辑器入口路由
- 编辑场景背景、灯光、网格、整体氛围更新

不包括：

- 完整品牌系统重做
- 大规模营销内容体系
- V4 级别的编辑手柄和尺寸设计细化

### 6.2 首页方向

首页采用“独立落地页 + 进入编辑器入口”。

参考来源：

- 首页视觉参考：`D:\3D-Home-Design\3d-home-designed`

落地原则：

- 首页用于传达产品价值和引导进入编辑器
- 不把复杂编辑逻辑塞进首页
- 首页与编辑器通过前端路由连接，而不是拆成两套应用

### 6.3 编辑器场景方向

编辑器场景从当前偏黑底、偏游戏感的基调，调整为偏浅色、米白、干净、建筑感更强的方向。

参考来源：

- Pascal editor 的浅色空间设计氛围

落地原则：

- 弱化当前黑底背景
- 网格、地面、光照改为更适合建筑编辑的浅色体系
- 保持墙体、zone、预览态与选中态在浅底上仍有足够对比
- 场景目标是“设计工具”，而不是“黑箱 3D 观感”

### 6.4 编辑器视觉层级

V3 的浅色场景不是简单换底色，而是重建“谁应该退后、谁应该最显眼”的层级关系。

#### 背景层

- 使用暖米白，而不是纯白或深灰黑
- 背景只负责提供安静画布，不应抢建筑对象

#### 地面 / 工作平面层

- 比背景略深
- 让用户感知“这里是可编辑平面”
- 避免做成游戏场景式地板材质

#### 网格层

- 必须存在，但要明显退后
- 细网格和主网格都采用低对比暖灰体系
- 网格的职责是辅助定位，而不是成为视觉主体

#### 墙体默认层

- 墙体是场景第一主体
- 在浅底上采用偏中性、偏石材感的暖灰或灰褐色
- 不使用纯黑，以免整体重新压暗

#### Zone 层

- zone 作为空间识别层存在
- 默认以轻透明浅色填充表达，不压过墙体
- 选中后再增强填充和边界强调

#### 草稿 / 预览层

- 草稿必须高于默认墙体视觉优先级
- 用更明确的高亮色区分“已存在对象”和“正在编辑对象”
- 不能与错误态或删除态混淆

#### 吸附 / 闭合 / 正交提示层

- 这是最高优先级交互层
- 必须一眼看出“吸到了”“要闭合了”“锁正交了”
- 颜色和墙体、zone 默认层必须明显区分

#### 选中态

- 墙和 zone 的选中态采用统一视觉语言
- 以边界强调、描边或亮面提升为主
- 不允许不同对象使用完全割裂的选中逻辑

### 6.5 视觉原则总结

V3 编辑器视觉基线采用：

- 米白背景
- 浅土色工作平面
- 暖灰墙体
- 轻透明 zone
- 清晰高亮交互色

总体原则：

- 默认态低饱和
- 交互态高对比
- 背景和网格退后
- 墙体前置
- 草稿与吸附提示优先级最高

### 6.6 Landing / Editor 双 token 策略

V3 明确采用两套视觉 token，而不是让首页和编辑器共用一套主配色系统。

#### Landing tokens

用于首页与落地页：

- 背景氛围
- Hero 区块
- 品牌强调色
- 卡片、按钮、内容分区层次

该体系允许更强的品牌感和视觉个性。

#### Editor tokens

用于编辑器与设计场景：

- 背景与工作平面
- 网格
- 墙体
- zone
- hover / selected / draft / snap / closure / danger

该体系必须优先服务可读性、可编辑性和状态清晰度。

#### 允许共享的基础 primitives

首页和编辑器只共享基础设计语言，例如：

- 字体体系
- 圆角尺度
- 阴影层级命名
- 间距尺度
- z-index 约定

#### 不共享的内容

以下内容不应强制共用：

- 主背景色
- 主强调色
- 页面情绪色
- 编辑器交互状态色

#### 原则

- 首页可以更品牌化
- 编辑器必须更工具化
- 首页风格调整不应牵动编辑器可读性
- 编辑器对比度和交互色调整不应受首页审美方向绑架

### 6.7 应用入口与初始化边界

V3 在引入独立首页后，必须同时切开应用入口和初始化边界。

#### 路由职责

- `/` 只负责落地页展示和进入编辑器引导
- `/editor` 才负责加载编辑器

#### 初始化约束

首页不应初始化以下内容：

- 3D canvas
- 建筑编辑场景
- 编辑器 store 的重逻辑
- 建筑持久化恢复
- 编辑器级快捷键与指针锁逻辑

以上内容应只在 `/editor` 路由进入后初始化。

#### 目标

- 避免首页被编辑器运行时拖重
- 避免首页和编辑器继续共享一套过重入口
- 让落地页和编辑器在同一个前端内保持清晰边界

#### 落地原则

- 首页是产品入口，不是被遮罩的编辑器
- 编辑器是独立工作区，不反向承担首页职责
- 路由切分后，状态初始化和副作用注册也必须同步切开

## 7. 当前建议

V3 不要再扩新对象类型，重点是收口架构。

正确节奏是：

1. 先固化核心边界
2. 再稳住 topology 和 identity
3. 最后整理 geometry 与 editor integration

只有这样，V4 才能真正进入“专业编辑体验”，V5 才能安全进入“门窗和房间语义”。

同时，V3 可以正式包含视觉重置，但范围必须收敛在：

- 首页入口
- 路由切分
- 编辑器场景氛围更新

不能让视觉工作反过来稀释 architecture core 的主任务。

## 8. Zone / Room Identity 设计基线

### 8.1 总体方向

V3 采用 `稳定继承优先`，并把 `zone` 视为正式持久化对象，而不是一次重建后的临时 face。

因此：

- `zone` 进入文档模型持久化
- topology rebuild 负责重建 zone 集合
- zone matcher 负责尽量复用旧 `zone id`
- 后续房间名称、用途等语义优先挂在 `zone` 上

### 8.2 上位原则

#### 原则 A：zone 是语义对象，不只是检测结果

一旦 `zone` 被用户命名、赋予用途或挂接后续属性，就不能再被当成纯临时 polygon。

#### 原则 B：继承判断优先基于空间连续性

不按“用户刚画了哪堵墙”判断，而按编辑前后该空间是否仍是同一个主体区域判断。

#### 原则 C：稳定优先，但不能伪稳定

只要能建立唯一且明显的对应关系，就继承旧 `zone id`；但不能把明显已经不是同一房间的区域硬判为同一对象。

#### 原则 D：identity 连续性与属性继承分离

V3 先解决 `zone id` 是否延续，不承诺在 `split / merge` 下完整解决全部属性自动迁移。

#### 原则 E：编辑中间态与稳定结果分离

拖拽中、草稿中、未闭合中间态允许暂时 unmatched；只有稳定提交态才正式执行继承、新建、回收。

#### 原则 F：重叠优先，但允许辅助证据

重叠面积是主依据；必要时可辅以质心位置、边界相似度、邻接拓扑做冲突消解。

#### 原则 G：目标不是最大化继承率，而是最小化误继承

误继承成本高于漏继承成本。规则、阈值和冲突处理都应偏保守。

#### 原则 H：全局唯一性 / 单射约束

一次稳定重建后：

- 一个旧 `zone id` 最多只能对应一个新 `zone`
- 一个新 `zone` 最多只能继承一个旧 `zone id`

`split / merge` 只是决定谁保留、谁新建、谁消亡，不允许一对多或多对一直接继承。

### 8.3 V3 的 zone 持久化边界

V3 将 `zone` 作为正式对象持久化，但持久化模型先保持保守：

```ts
interface Zone {
  id: string
  levelId: string
  boundaryVertexIds: string[]
  kind: 'room' | 'corridor' | 'balcony' | 'unknown'
  name: string | null
}
```

约束如下：

- `boundaryVertexIds` 是边界快照，不是拓扑真相来源
- 拓扑真相始终是 `wall / vertex graph`
- zone rebuild 永远基于当前稳定墙图重新计算
- 后续若 opening 或更复杂 room semantics 需要，再升级到 edge / half-edge 表示

### 8.4 重建与匹配执行方式

V3 采用：

- 稳定提交后全量重建全部 zone
- 重建后全量匹配新旧 zone

V3 不做局部增量匹配。当前优先级是规则正确、稳定、可测试，而不是先做局部优化。

推荐管线：

1. 用户完成一次稳定编辑提交
2. 基于当前 `wall / vertex graph` 全量重建 zone
3. 过滤无效小碎区
4. 计算新旧 zone 匹配关系
5. 应用继承 / 新建 / 消亡规则
6. 输出新的正式 `zone` 集合

### 8.5 匹配信号优先级

V3 的匹配优先级固定为：

1. 重叠面积比例
2. 质心位置接近度
3. 边界相似度
4. 邻接拓扑相似度

其中：

- 重叠面积是主依据
- 其余信号只用于冲突消解
- 无法唯一确定时，放弃继承并新建 id

### 8.6 一对一高置信继承

新 `zone` 继承旧 `zone id`，至少满足：

- `overlap / oldArea >= 0.6`
- `overlap / newArea >= 0.6`

含义：

- 新旧双方都至少有 60% 还是同一主体区域
- 避免“大房吞小房”或“小房贴边”造成误继承

### 8.7 Split 规则

当一个旧 `zone` 在一次稳定提交后变成多个新 `zone` 时：

- 必须至少有 2 个新 `zone` 对该旧 `zone` 满足 `overlap / oldArea >= 0.2`
- 且它们都不是一对一高置信匹配

处理规则：

- 只有一个新 `zone` 能继承旧 `zone id`
- 主继承者按以下顺序选择：
  1. 重叠面积最大
  2. `overlap / oldArea` 更高
  3. 质心偏移更小
  4. 边界相似度更高
- 若最大候选 `overlap / oldArea < 0.4`，则放弃继承，全部新建 id

### 8.8 Merge 规则

当多个旧 `zone` 在一次稳定提交后合成一个新 `zone` 时：

- 一个新 `zone` 对至少 2 个旧 `zone` 满足 `overlap / newArea >= 0.2`
- 且没有任何单个旧 `zone` 已达到一对一高置信继承

处理规则：

- 新 `zone` 最多继承一个旧 `zone id`
- 主继承者按以下顺序选择：
  1. 对新 `zone` 的重叠面积贡献最大
  2. `overlap / newArea` 更高
  3. 质心更接近
  4. 邻接关系延续更强
- 若最大贡献 `< 0.4`，则新 `zone` 直接新建 id

### 8.9 冲突处理

如果前两名候选非常接近，例如：

- 面积差 `< 10%`
- 且质心、边界相似度、邻接关系也无法明显拉开差距

则直接放弃继承，分配新 id。

V3 在冲突场景下宁可漏继承，也不要误继承。

### 8.10 无效小碎区过滤

V3 固定使用：

`最小有效 zone 面积阈值 = 0.25 m²`

含义：

- 小于该阈值的闭合区域，不作为正式 `zone`
- 不参与 identity 匹配
- 该阈值用于过滤拓扑噪声，不用于定义“可居住房间”的业务含义

### 8.11 Zone 语义字段继承规则

V3 明确区分：

- `zone id` 的连续性
- `zone` 语义字段的自动继承

二者相关，但不是同一件事。

V3 对语义字段采取保守策略，只处理最基本、最可预测的继承。

#### 一对一继承

如果新 `zone` 明确继承旧 `zone id`，则：

- `name` 原样保留
- `kind` 原样保留

#### Split

当一个旧 `zone` 拆成多个新 `zone` 时：

- 只有保留旧 `zone id` 的主继承者自动继承 `name / kind`
- 其他新 `zone` 默认重置为：
  - `name = null`
  - `kind = 'unknown'`

V3 不自动把原名字复制给多个新房间。

#### Merge

当多个旧 `zone` 合并成一个新 `zone` 时：

- 如果新 `zone` 继承了某个旧 `zone id`
- 则仅保留该旧 `zone` 的 `name / kind`
- 其他被合并消亡的 `zone` 语义不自动融合

#### 新建或冲突放弃继承

如果新 `zone` 无法稳定继承旧 `zone id`，则：

- `name = null`
- `kind = 'unknown'`

#### V3 的明确边界

V3 不做以下智能语义处理：

- 合并多个房间名称
- 推断拆分后哪个子房间更像原用途
- 根据面积或位置自动改写房间类型

V3 只定义：

- 谁保留原语义
- 谁回到默认值
