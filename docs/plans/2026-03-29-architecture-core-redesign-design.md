# 建筑编辑核心重构设计

> 更新日期：2026-03-29
> 分支：`feature/architecture-core-v1`
> 范围：仅重构建筑编辑核心，不兼容旧建筑存档，家具系统后置接回

---

## 1. 背景与目标

当前项目的建筑编辑能力建立在矩形 `Room` 模型之上，只能表达轴对齐的矩形房间，并通过“房间边重合后裁掉墙段”的方式模拟墙体拼接。这个模型可以支撑原型，但无法自然表达专业建筑编辑器需要的墙图、端点吸附、交点打断、闭环检测、zone 自动生成与后续门窗扩展。

本次重构目标不是在现有 `Room` 模型上继续打补丁，而是在现有 React/Vite/R3F 项目外壳内，重建一套以单层建筑墙图为核心的建筑编辑系统。设计思路借鉴 Pascal editor 的 `Level / Wall / Zone` 分层，但核心算法、数据模型、存储结构与渲染边界由本项目自主掌控。

## 2. 范围

### 本阶段包含

- 单层 `Level` 建筑模型
- `Vertex / Wall / Zone` 作为核心领域对象
- 墙绘制工具
- 顶点吸附
- 墙体交点检测与自动切分
- 近重复顶点合并
- 退化墙段清理
- 闭环检测与 `Zone` 自动生成
- 基础墙体与地面渲染
- 基础选择、删除、撤销重做
- 新建筑文档的 IndexedDB 持久化

### 本阶段不包含

- 旧 `rooms/items` 建筑存档兼容与迁移
- 多楼层编辑 UI
- 家具/模型摆放重新接入
- 门窗 opening
- 弧墙
- 非均匀墙厚拼角
- 复杂导出流程

## 3. 目标架构

新建筑核心按五层拆分，避免当前系统中“拓扑规则写在渲染组件里”的耦合。

### 3.1 `domain`

只定义稳定持久化的数据模型：

- `Level`
- `Vertex`
- `Wall`
- `Zone`
- 选择相关基础类型

### 3.2 `editing`

只负责用户意图与命令建模：

- 当前工具状态
- 草稿墙体状态
- 命令对象
- 事务边界
- 撤销重做接入点

### 3.3 `topology`

只负责把编辑结果修复为稳定墙图：

- 顶点吸附
- 线段求交
- 墙体切分
- 顶点合并
- 退化清理
- 闭环检测
- `Zone` 重建

### 3.4 `geometry`

只负责从稳定图派生可渲染结果：

- 墙体 mesh 数据
- 地面 polygon
- 轮廓/高亮数据
- 草稿预览辅助几何

### 3.5 `presentation`

只负责 React/R3F 显示与交互：

- `ArchitectureScene`
- `WallMeshes`
- `ZoneMeshes`
- `DraftWallPreview`
- 工具面板与属性面板

## 4. 核心数据模型

持久化模型只存稳定结构，不存编辑中的临时态。

```ts
type Id = string

interface Level {
  id: Id
  name: string
  elevation: number
  defaultWallHeight: number
  defaultWallThickness: number
  vertexIds: Id[]
  wallIds: Id[]
  zoneIds: Id[]
}

interface Vertex {
  id: Id
  x: number
  y: number
}

interface Wall {
  id: Id
  startVertexId: Id
  endVertexId: Id
  thickness: number
  height: number
  kind: 'structural' | 'partition'
}

interface Zone {
  id: Id
  levelId: Id
  boundaryVertexIds: Id[]
  kind: 'room' | 'corridor' | 'balcony' | 'unknown'
  name: string | null
}
```

### 设计原则

- `Vertex` 与 `Wall` 是真实源数据
- `Zone` 由墙图派生，但在 V1 中落库，便于后续挂接名称、属性、面积与材质
- 单层场景中 `Vertex.y` 暂时固定为 `0`，但字段保留，避免后续扩展时再次改模型
- 任何“房间”概念都由 `Zone` 承担，不再回到 `Room` 作为建模源头

## 5. 编辑状态与命令模型

编辑中的临时态不进入持久化文档。

```ts
interface ArchitectureEditorState {
  activeTool: 'select' | 'wall' | 'pan' | 'delete'
  draftWall: {
    startPoint: [number, number] | null
    currentPoint: [number, number] | null
    snappedVertexId: Id | null
  } | null
  selection: {
    vertexIds: Id[]
    wallIds: Id[]
    zoneIds: Id[]
  }
  hover: {
    vertexId: Id | null
    wallId: Id | null
    zoneId: Id | null
  }
  viewport: {
    gridSize: number
    snapEnabled: boolean
    snapTolerance: number
  }
}
```

命令模型从 CRUD 切换为编辑事务：

```ts
type ArchitectureCommand =
  | { type: 'DRAW_WALL'; start: [number, number]; end: [number, number] }
  | { type: 'MOVE_VERTEX'; vertexId: Id; to: [number, number] }
  | { type: 'DELETE_WALL'; wallId: Id }
  | { type: 'DELETE_VERTEX'; vertexId: Id }
  | {
      type: 'SET_WALL_PROPS'
      wallId: Id
      patch: Partial<Pick<Wall, 'thickness' | 'height' | 'kind'>>
    }
```

所有编辑统一走：

`command -> topology repair -> derived rebuild -> commit`

UI 不允许直接改写 `vertices` 或 `walls` 数组。

## 6. 墙壁自动拼接算法 V1

V1 目标不是做完整 CAD，而是做稳定拓扑。

### V1 必做能力

1. 端点吸附
2. 线段求交
3. 墙段切分
4. 近重复点合并
5. 零长度/超短墙清理
6. 闭环检测并自动生成 `Zone`

### V1 暂不处理

- 弧墙
- 门窗 opening
- 复杂布尔修墙
- 非均匀墙厚拼角
- 多楼层垂直对齐

### 推荐处理管线

每次正式编辑提交后运行：

1. 规范化输入
2. 顶点吸附
3. 交点检测
4. 墙段切分
5. 顶点合并与退化清理
6. 图一致性校验
7. `Loop / Zone` 重建

### V1 成功标准

- 两条墙交叉时自动生成交点并切分墙段
- 连续画墙形成闭环时自动出现 zone
- 拖动顶点后邻接与 zone 稳定更新
- 删除墙段后相关 zone 消失或重算
- 浮点误差不会轻易产生碎墙和假闭环

## 7. 目录与模块规划

建议新增独立建筑域，而不是继续在旧 `services` 和旧 `roomSlice` 上演进。

```text
src/
  architecture/
    domain/
      level.ts
      vertex.ts
      wall.ts
      zone.ts
      selection.ts
    topology/
      snap.ts
      intersections.ts
      splitWalls.ts
      mergeVertices.ts
      cleanup.ts
      loops.ts
      zones.ts
    geometry/
      wallMeshes.ts
      floorPolygons.ts
      outlines.ts
    editing/
      commands.ts
      reducers.ts
      tools.ts
      transactions.ts
    persistence/
      schema.ts
      serialize.ts
      deserialize.ts
  store/
    architectureDocumentStore.ts
    architectureEditorStore.ts
  components/
    canvas/
      ArchitectureScene.tsx
      WallMeshes.tsx
      ZoneMeshes.tsx
      DraftWallPreview.tsx
      SelectionHandles.tsx
    panels/
      BuildingToolPanel.tsx
      WallPropertyPanel.tsx
      ZonePropertyPanel.tsx
```

## 8. 旧模块处置策略

### 直接淘汰

- `src/types/room.ts`
- `src/services/adjacency.ts`
- `src/store/slices/roomSlice.ts`
- `src/components/canvas/RoomMesh.tsx`
- `src/components/panels/RoomPanel.tsx`

### 保留外壳但重接

- `src/App.tsx`
- `src/components/canvas/SceneRoot.tsx`
- `src/components/layout/LeftPanel.tsx`
- Overlay、Dock、基础相机壳层

### 暂时保留

- 资产库后端
- 家具模型加载能力
- IndexedDB 机制本身
- React/Vite/R3F 基础设施

## 9. 实施阶段

### 阶段 1：建立新核心骨架

- 建立 `architecture` 域目录
- 新建文档 store 与编辑 store
- 能表达空 `Level`、`Vertex`、`Wall`

### 阶段 2：先做纯算法测试

- 端点吸附
- 交点切分
- 重复点合并
- 退化墙清理
- 闭环生成与破坏

### 阶段 3：最小墙编辑器

- 新建独立 `ArchitectureScene`
- 支持点击画墙
- 显示草稿墙
- 自动生成 zone

### 阶段 4：编辑交互完善

- 选择
- 顶点拖拽
- 删除
- 墙体属性编辑
- 撤销重做

### 阶段 5：接入现有外壳

- Left panel 改为建筑工具面板
- Property panel 改为 wall/zone 属性面板
- 主画布切换到新建筑系统

### 阶段 6：持久化与后续扩展

- 新建筑 schema 存储
- 家具系统后置接回
- 门窗与高级能力在核心稳定后再扩展

## 10. 关键决策记录

- 使用独立 worktree 与分支进行重构，避免污染当前工作区
- 单层优先，多楼层只保留模型扩展位，不做 UI
- 不兼容旧建筑存档
- 建筑编辑全部重构，家具系统后置
- 借鉴 Pascal editor 的分层思想，但不把外部 `core` 作为重构依赖中心
