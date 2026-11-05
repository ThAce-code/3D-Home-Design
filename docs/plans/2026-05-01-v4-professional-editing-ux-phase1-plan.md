# V4 专业编辑交互 · 第一阶段实施计划

> 分支：`codex/professional-editing-ux`，从 `codex/editor-workflow-ui@1c27bd6` 切出
> Worktree：`.worktrees/professional-editing-ux`
> 日期：2026-05-01

---

## 0. 目标与范围

**一句话目标**：搭建统一的编辑手柄（handle）与视觉反馈框架，并用"拖动顶点/墙端点改户型"作为首个真实编辑闭环来验证框架。

### 做什么

1. 统一 selection / hover 视觉反馈——wall、zone、vertex 使用同一套主题 token 和渲染逻辑
2. 引入 `EditHandle` 数据模型与 R3F 渲染层——endpoint handle、midpoint handle（预留）
3. 实现顶点/端点拖拽闭环：select tool 下点击 handle → 进入拖拽 → snap 约束 → 提交 `MOVE_VERTEX` → `repairTopology`
4. 拖拽过程中显示实时墙长度标注（wall length label）
5. 状态栏提示当前操作上下文
6. 每个行为补单元测试

### 不做什么

- Split wall / Offset wall / Trim 等高级编辑工具（Phase 2）
- Undo/redo 对 architecture document 的集成（需要独立设计 command history，Phase 2）
- 连续画墙改进、数值长度输入（已有基础，与本阶段正交，不拦路）
- Zone 拖拽整体移动

---

## 1. 现有架构摘要

### 1.1 命令流水线

```
用户交互
  → sceneController / meshController（事件转译）
  → interaction.ts 纯函数（生成 ArchitectureInteractionCommand[]）
  → applyArchitectureInteractionCommands（分发到 handlers）
  → handlers 更新 editorStore（selection/hover/draft 等 UI 状态）
       或调用 replaceDocument → documentStore（不可变文档替换）
  → reduceArchitectureCommand（纯 reducer，返回新 ArchitectureDocument）
  → repairTopology（拓扑修复 + zone 重建）
```

### 1.2 已有基础设施

| 能力 | 文件 | 状态 |
|------|------|------|
| `MOVE_VERTEX` reducer | `editing/reducers.ts:60-79` | ✅ 完整，含 `repairTopology` |
| `ArchitectureSelection` 含 `vertexIds[]` | `editing/tools.ts:15-19` | ✅ 数据结构就绪 |
| `ArchitectureHover` 含 `vertexId` | `editing/tools.ts:21-25` | ✅ 数据结构就绪 |
| `setSelection` / `setHover` / `clearHover` | `architectureEditorStore.ts` | ✅ store 方法就绪 |
| Snap 系统（endpoint/body/axis/grid） | `geometry/wallDraftSnap.ts` | ✅ 可部分复用 |
| 主题 token | `theme/editorTheme.ts` | ⚠️ 缺 handle/selected/hovered 专用 token |
| Wall/Zone 选中视觉 | `WallMeshes.tsx` / `ZoneMeshes.tsx` | ⚠️ 无基于 selection 的材质切换 |

### 1.3 关键约束

- `ArchitectureDocument` 是不可变的，每次修改产生新文档
- `repairTopology()` 在每次顶点移动后重建 zones，成本可控（当前规模）
- 场景事件通过隐藏的 `architecture-interaction-plane` 捕获 pointer 事件
- 所有 R3F 组件在 `<Canvas>` 内，HTML overlay 在 `<Canvas>` 外

---

## 2. 任务分解

### Task 1：扩展主题 token

**文件**：`src/theme/editorTheme.ts`

新增以下 token（延续暖中性调，手柄色从 closure `#b45a3c` 派生）：

```typescript
// 选中状态（从墙体灰 #d9ddd6 加深，带微暖偏移）
selected: '#8a7e72',           // 选中实体主色（暖灰棕，比墙体灰深一档）
selectedOutline: '#6f6253',    // 选中轮廓（复用 textMuted）
selectedSoft: 'rgba(138,126,114,0.16)', // 选中填充（zone 用）

// 悬停状态（在选中和默认之间的过渡）
hovered: '#a69a8e',            // 悬停实体（比默认灰微暖微深）
hoveredSoft: 'rgba(166,154,142,0.12)', // 悬停填充（zone 用）

// 手柄（从 closure #b45a3c 暖赭色系派生）
handle: '#9e6b52',             // 默认手柄（降饱和暖赭，安静但可辨识）
handleHovered: '#b45a3c',      // 悬停手柄（提亮到 closure 本色）
handleActive: '#c4694a',       // 拖拽中手柄（再提一档）
handleRing: 'rgba(158,107,82,0.20)', // 手柄外圈光晕

// 尺寸标注
dimension: '#6f6253',          // 标注文字（复用 textMuted）
dimensionLine: 'rgba(111,98,83,0.4)', // 标注引线
```

同步更新 `editorThemeVars` 的 CSS variable 映射。

**测试**：类型检查即可，无需专门单测。

---

### Task 2：统一 selection / hover 视觉反馈

#### 2a. WallMeshes 选中/悬停渲染

**文件**：`src/components/canvas/WallMeshes.tsx`

当前所有墙使用固定 `color="#d9ddd6"`。改为根据 selection / hover 状态切换材质：

```typescript
// 从 editorStore 读取 selection 和 hover
const selection = useArchitectureEditorStore((s) => s.selection);
const hover = useArchitectureEditorStore((s) => s.hover);

// 每个 wall mesh 的材质逻辑：
const isSelected = selection.wallIds.includes(wall.wallId);
const isHovered = hover.wallId === wall.wallId;
const color = isSelected
  ? editorTheme.selected
  : isHovered
    ? editorTheme.hovered
    : '#d9ddd6';
const opacity = isSelected ? 0.85 : isHovered ? 0.75 : 1;
```

还需为 wall mesh 添加 `onPointerEnter` / `onPointerLeave` 事件来驱动 hover：

```typescript
onPointerEnter={() => {
  if (activeTool === 'select') {
    editorStore.setHover({ ...createEmptyHover(), wallId: wall.wallId });
  }
}}
onPointerLeave={() => {
  editorStore.clearHover();
}}
```

#### 2b. ZoneMeshes 选中/悬停渲染

**文件**：`src/components/canvas/ZoneMeshes.tsx`

同理。选中 zone 使用 `editorTheme.selectedSoft` 填充，悬停使用 `editorTheme.hoveredSoft`。默认保持 `#6e8f71` opacity 0.35。

#### 2c. interaction.ts 扩展 hover 命令

**文件**：`src/architecture/editing/interaction.ts`

当前 `ArchitectureInteractionCommand` 没有 hover 类型。但 hover 由 R3F 的 `onPointerEnter/Leave` 直接驱动 store，不需要走 interaction command 管线——直接在组件层调用 `setHover`/`clearHover` 即可，保持简单。

**测试**：
- `WallMeshes.test.tsx`：验证选中 wallId 后对应 mesh 颜色改变
- `ZoneMeshes.test.tsx`（新建）：验证选中 zoneId 后对应 mesh 颜色改变

---

### Task 3：EditHandle 数据模型

**新建文件**：`src/architecture/editing/editHandle.ts`

```typescript
import type { Point2 } from '../topology/math.js';

export type EditHandleKind =
  | 'vertex-endpoint'   // 墙端点（可拖拽移动顶点）
  | 'wall-midpoint'     // 墙体中点（预留：未来用于 split wall）
  | 'zone-center';      // 区域中心（预留：未来用于 zone 操作）

export interface EditHandle {
  id: string;             // 唯一标识，格式如 "handle:vertex:{vertexId}"
  kind: EditHandleKind;
  position: Point2;       // 世界坐标 [x, z]
  entityId: string;       // 关联实体 ID（vertexId / wallId / zoneId）
  entityType: 'vertex' | 'wall' | 'zone';
}

/**
 * 从文档中提取当前应显示的编辑手柄。
 * Phase 1 只提取与 selection 关联的 vertex-endpoint handles。
 */
export function resolveEditHandles(
  document: ArchitectureDocument,
  selection: ArchitectureSelection,
): EditHandle[] {
  const handles: EditHandle[] = [];
  const addedVertexIds = new Set<string>();

  // 选中墙时，显示该墙两端的顶点 handle
  for (const wallId of selection.wallIds) {
    const wall = document.walls[wallId];
    if (!wall) continue;

    for (const vertexId of [wall.startVertexId, wall.endVertexId]) {
      if (addedVertexIds.has(vertexId)) continue;
      const vertex = document.vertices[vertexId];
      if (!vertex) continue;

      addedVertexIds.add(vertexId);
      handles.push({
        id: `handle:vertex:${vertexId}`,
        kind: 'vertex-endpoint',
        position: [vertex.x, vertex.y],
        entityId: vertexId,
        entityType: 'vertex',
      });
    }
  }

  // 选中顶点时，也显示 handle（直接选中的情况）
  for (const vertexId of selection.vertexIds) {
    if (addedVertexIds.has(vertexId)) continue;
    const vertex = document.vertices[vertexId];
    if (!vertex) continue;

    addedVertexIds.add(vertexId);
    handles.push({
      id: `handle:vertex:${vertexId}`,
      kind: 'vertex-endpoint',
      position: [vertex.x, vertex.y],
      entityId: vertexId,
      entityType: 'vertex',
    });
  }

  return handles;
}
```

**测试**：`src/architecture/editing/__tests__/editHandle.test.ts`
- 选中一面墙 → 返回 2 个 vertex-endpoint handles
- 选中两面共享端点的墙 → 共享顶点不重复
- 空 selection → 返回空数组
- 选中不存在的 wallId → 无崩溃，返回空

---

### Task 4：EditHandle R3F 渲染组件

**新建文件**：`src/components/canvas/EditHandles.tsx`

```typescript
// 职责：
// 1. 从 documentStore + editorStore 计算当前 handles
// 2. 渲染每个 handle 为可交互的 3D 圆盘/球体
// 3. 处理 hover（handle 变色放大）
// 4. 处理 pointerDown → 进入拖拽模式

export default function EditHandles() {
  const document = useArchitectureDocumentStore((s) => s.document);
  const selection = useArchitectureEditorStore((s) => s.selection);
  const activeTool = useArchitectureEditorStore((s) => s.activeTool);

  if (activeTool !== 'select') return null;

  const handles = useMemo(
    () => resolveEditHandles(document, selection),
    [document, selection]
  );

  return (
    <group name="edit-handles">
      {handles.map((handle) => (
        <VertexHandle key={handle.id} handle={handle} />
      ))}
    </group>
  );
}
```

**VertexHandle 子组件**渲染规格：

| 属性 | 值 |
|------|---|
| 几何体 | `CircleGeometry(0.12, 24)` 铺在地面 + 竖直 `SphereGeometry(0.06, 16, 16)` 叠加 |
| 默认色 | `editorTheme.handle` (#9e6b52 降饱和暖赭) |
| 悬停色 | `editorTheme.handleHovered` (#b45a3c closure 本色)，半径放大 1.3x |
| 拖拽中 | `editorTheme.handleActive` (#c4694a 提亮赭) |
| Y 高度 | 圆盘 y=0.005（贴地），球体 y=0.08 |
| 事件 | `onPointerEnter` → hover 态, `onPointerDown` → 开始拖拽 |

在 `ArchitectureScene.tsx` 中挂载，放在 `<WallMeshes />` 之后以确保 z-order 正确：

```diff
  <ZoneMeshes />
  <WallMeshes />
+ <EditHandles />
  <DraftWallPreview />
```

**测试**：`src/components/canvas/__tests__/EditHandles.test.tsx`
- 选中墙时渲染 handle mesh
- 未选中时不渲染
- 非 select tool 时不渲染

---

### Task 5：顶点拖拽交互管线

这是本阶段核心。需要新增一套拖拽状态机，与现有 wall draft 管线平行。

#### 5a. 拖拽状态定义

**文件**：`src/architecture/editing/tools.ts`（扩展）

```typescript
export interface VertexDragState {
  vertexId: string;
  startPosition: Point2;    // 拖拽开始时的原始位置
  currentPosition: Point2;  // 当前拖拽位置（含 snap）
  snappedToVertexId: string | null; // 如果 snap 到了另一个顶点
}
```

**文件**：`src/store/architectureEditorStore.ts`（扩展）

新增状态字段和方法：

```typescript
// 状态
vertexDrag: VertexDragState | null;

// 方法
startVertexDrag: (vertexId: string, startPosition: Point2) => void;
updateVertexDrag: (currentPosition: Point2, snappedToVertexId?: string | null) => void;
commitVertexDrag: () => void;
cancelVertexDrag: () => void;
```

#### 5b. 拖拽交互逻辑

**新建文件**：`src/architecture/editing/vertexDragInteraction.ts`

纯函数，与 `interaction.ts` 风格一致：

```typescript
/**
 * 计算拖拽中的 snap 结果。
 * 复用 wallDraftSnap 中的 endpoint snap 和 grid snap，
 * 但排除被拖拽顶点自身。
 */
export function resolveVertexDragSnap(args: {
  document: ArchitectureDocument;
  dragVertexId: string;
  rawPoint: Point2;
  viewport: ArchitectureViewportState;
}): {
  point: Point2;
  snappedToVertexId: string | null;
}

/**
 * 生成拖拽提交时的 interaction commands。
 */
export function getVertexDragCommitEffects(args: {
  document: ArchitectureDocument;
  vertexId: string;
  targetPosition: Point2;
}): ArchitectureInteractionCommand[]
```

Snap 优先级（拖拽场景）：
1. **Endpoint snap**：吸附到其他顶点（合并顶点效果，由 `repairTopology` 处理）
2. **Grid snap**：对齐网格
3. **Free**：自由定位

不使用 wall-body snap 和 axis lock（Phase 1 简化），后续可扩展。

#### 5c. 事件接线

**修改文件**：`src/components/canvas/EditHandles.tsx`

`VertexHandle` 的 `onPointerDown` 触发 `startVertexDrag`。

**修改文件**：`src/components/canvas/ArchitectureScene.tsx`

interaction-plane 的事件需要感知拖拽状态：

```typescript
// handlePointerMove 增加分支：
if (vertexDrag) {
  // 调用 resolveVertexDragSnap → updateVertexDrag
}

// handlePointerUp（新增）：
if (vertexDrag) {
  // 调用 getVertexDragCommitEffects → replaceDocument + commitVertexDrag
}
```

注意：当前 `ArchitectureScene` 只监听 `onPointerDown` 和 `onPointerMove`。需新增 `onPointerUp` 用于提交拖拽。

**修改文件**：`src/architecture/editing/sceneController.ts`

新增 `handlePointerUp` 方法，以及拖拽相关的 handler 接口扩展。

#### 5d. 拖拽预览渲染

**新建文件**：`src/components/canvas/VertexDragPreview.tsx`

拖拽过程中渲染：
- 虚线连接：从原始位置到当前拖拽位置
- 受影响墙体的 ghost 预览（半透明墙体，使用 draft 色）
- Snap 指示器（如果 snap 到了某个顶点）

```typescript
export default function VertexDragPreview() {
  const vertexDrag = useArchitectureEditorStore((s) => s.vertexDrag);
  const document = useArchitectureDocumentStore((s) => s.document);

  if (!vertexDrag) return null;

  // 找到连接到该顶点的所有墙，用 currentPosition 替换原顶点位置
  // 渲染 ghost wall 预览
  // 渲染 snap 指示球
}
```

在 `ArchitectureScene.tsx` 中挂载，位于 `<DraftWallPreview />` 旁边。

**测试**：
- `vertexDragInteraction.test.ts`：snap 逻辑、command 生成
- `EditHandles.test.tsx`：pointer down → startVertexDrag 被调用
- `sceneController.test.ts`：扩展测试 pointerUp commit 路径

---

### Task 6：墙长度标注（静态）

**新建文件**：`src/components/canvas/WallDimensionLabels.tsx`

在 select tool 下，对选中的墙显示长度标注。使用 Drei 的 `<Html>` 或纯 R3F sprite text。

设计选择：用 `<Html>` 做 CSS 渲染，因为文字清晰度更好，不受 3D 缩放影响。

```typescript
export default function WallDimensionLabels() {
  const document = useArchitectureDocumentStore((s) => s.document);
  const selection = useArchitectureEditorStore((s) => s.selection);
  const vertexDrag = useArchitectureEditorStore((s) => s.vertexDrag);

  // 计算需要标注的墙：selection 中的墙 + 拖拽时受影响的墙
  // 对每面墙：
  //   - 墙中点位置 → Html position
  //   - 计算墙长度（如果正在拖拽，用 drag 的 currentPosition 重算）
  //   - 渲染标签："3.50 m"
}
```

标签样式：
- 背景：`editorTheme.surfaceStrong`，圆角 4px
- 文字：`editorTheme.dimension`，12px，mono 字体
- 边框：`editorTheme.dimensionLine`

挂载位置：`ArchitectureScene.tsx` 内，与 `EditHandles` 同级。

**测试**：
- 选中墙后标签可见，显示正确长度
- 拖拽顶点时标签实时更新

---

### Task 7：状态栏上下文提示

**修改文件**：`src/components/canvas/WallDraftHud.tsx`（重命名为 `EditorStatusHud.tsx`）

扩展现有 HUD，使其在非 wall-draft 模式下也能显示上下文提示：

| 状态 | 提示内容 |
|------|---------|
| select tool + 无选中 | "点击墙体或区域选中" |
| select tool + 选中墙 | "拖动端点修改墙体 · Del 删除 · Esc 取消选择" |
| select tool + 拖拽中 | "拖动中 · 释放放置 · Esc 取消" |
| wall tool + 草稿中 | （保持现有行为） |
| delete tool | "点击墙体删除" |

**测试**：验证各状态下显示正确提示文本。

---

### Task 8：集成测试与构建验证

1. 跑 `npm run lint`（`tsc --noEmit`）确认类型安全
2. 跑 `npx vitest run` 确认所有单元测试通过
3. 跑 `npm run build` 确认生产构建无错

---

## 3. 执行顺序与依赖关系

```
Task 1 (主题 token)
  ↓
Task 2 (selection/hover 视觉)  ←── 依赖 Task 1 的新 token
  ↓
Task 3 (EditHandle 数据模型)   ←── 独立，可与 Task 2 并行
  ↓
Task 4 (EditHandle 渲染)       ←── 依赖 Task 1 + Task 3
  ↓
Task 5 (顶点拖拽交互)          ←── 依赖 Task 3 + Task 4
  ↓
Task 6 (尺寸标注)              ←── 依赖 Task 5（需读 vertexDrag 状态）
  ↓
Task 7 (状态栏提示)            ←── 依赖 Task 5（需读 vertexDrag 状态）
  ↓
Task 8 (集成验证)              ←── 依赖全部
```

建议合并节奏：Task 1-3 作为第一个 commit，Task 4-5 作为第二个，Task 6-7 作为第三个，Task 8 最终验证。

---

## 4. 新增 / 修改文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `src/architecture/editing/editHandle.ts` | EditHandle 类型与 resolve 函数 |
| `src/architecture/editing/vertexDragInteraction.ts` | 拖拽 snap + commit 纯函数 |
| `src/architecture/editing/__tests__/editHandle.test.ts` | editHandle 单测 |
| `src/architecture/editing/__tests__/vertexDragInteraction.test.ts` | 拖拽交互单测 |
| `src/components/canvas/EditHandles.tsx` | 手柄 R3F 组件 |
| `src/components/canvas/VertexDragPreview.tsx` | 拖拽预览 R3F 组件 |
| `src/components/canvas/WallDimensionLabels.tsx` | 墙长度标注 R3F 组件 |
| `src/components/canvas/__tests__/EditHandles.test.tsx` | 手柄组件测试 |

### 修改文件

| 文件路径 | 改动摘要 |
|---------|---------|
| `src/theme/editorTheme.ts` | 新增 selected/hovered/handle/dimension token |
| `src/architecture/editing/tools.ts` | 新增 `VertexDragState` 类型 |
| `src/store/architectureEditorStore.ts` | 新增 `vertexDrag` 状态 + 4 个方法 |
| `src/components/canvas/WallMeshes.tsx` | 读取 selection/hover，切换材质，添加 hover 事件 |
| `src/components/canvas/ZoneMeshes.tsx` | 同上 |
| `src/components/canvas/ArchitectureScene.tsx` | 挂载 EditHandles/VertexDragPreview/WallDimensionLabels，添加 pointerUp |
| `src/architecture/editing/sceneController.ts` | 新增 handlePointerUp，扩展拖拽 handler |
| `src/architecture/editing/interaction.ts` | 可能新增 `start-vertex-drag` / `commit-vertex-drag` 命令类型 |
| `src/components/canvas/WallDraftHud.tsx` | 扩展为通用 EditorStatusHud |

---

## 5. 设计决策与权衡

### 5.1 拖拽管线是否走 interaction command 管线？

**决策**：拖拽的 move（每帧更新）直接调用 store 方法，不走 interaction command。只有最终 commit 走 `replace-document` command。

**理由**：拖拽每帧可能触发 60 次更新，走 command 管线会产生大量中间对象。拖拽中的位置只是 UI 状态（预览用），只有 commit 才是文档变更。这与现有 `updateDraftWall` 直接更新 store 的模式一致。

### 5.2 拖拽中是否实时执行 repairTopology？

**决策**：不。拖拽过程中用 `VertexDragPreview` 渲染 ghost 墙（简单几何重算），只在 commit 时执行完整 `repairTopology`。

**理由**：`repairTopology` 包含 zone 重建、交叉墙分割等重操作。每帧执行可能卡顿。Ghost 预览只需要重新计算受影响墙的端点位置，不涉及拓扑。

### 5.3 Handle hover 是否走 ArchitectureHover？

**决策**：是。在现有 `ArchitectureHover` 中使用 `vertexId` 字段。当鼠标悬停在 handle 上时设置 `hover.vertexId`，离开时清除。这样 handle 组件和 wall 组件都能响应同一个 hover 状态。

### 5.4 WallDraftHud 重命名还是新建？

**决策**：原地扩展，文件名改为 `EditorStatusHud.tsx`。内部根据当前状态（wall draft / select / drag / delete）选择显示内容。

**理由**：只有一个 HUD 区域，不需要多个组件竞争同一个 UI 位置。

### 5.5 为什么拖拽 snap 不复用完整的 wallDraftSnap？

`wallDraftSnap` 针对的是"从起点到终点画一面新墙"的场景，包含 closure detection、wall-body snap、axis lock 等逻辑。顶点拖拽的 snap 需求更简单：snap 到其他顶点或 grid。强行复用会引入不必要的条件分支和参数。新建 `resolveVertexDragSnap` 保持单一职责，内部可调用共享的 grid snap 工具函数。

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| R3F pointer 事件在 handle 小目标上不稳定 | 用户难以精确点击 handle | handle 碰撞体用更大的 CircleGeometry(0.18)，视觉体用 0.12 |
| 拖拽 ghost 预览与真实墙体 z-fighting | 视觉闪烁 | ghost 墙 y 偏移 0.01，半透明 + 不同颜色 |
| repairTopology 在 commit 后改变 zone ID | 选中状态引用失效 | commit 后清除 selection（用户需重新选择） |
| 多个 handle 重叠（T 型交叉点） | 点击歧义 | 合并相同 vertexId 的 handle（resolveEditHandles 已去重） |

---

## 7. Phase 2 展望（不在本次范围）

本阶段完成后，框架将支撑以下 Phase 2 功能的快速接入：

- **Wall midpoint handle**：在 `resolveEditHandles` 中新增 `wall-midpoint` 类型 → 点击触发 `SPLIT_WALL` 命令
- **Wall body drag**：整墙平移，移动两端顶点 → 两次 `MOVE_VERTEX`
- **Undo/redo**：在 `architectureDocumentStore` 上叠加 `temporal()` middleware，或独立实现 command stack
- **Numeric dimension input**：拖拽中按 Tab 切换到数值输入模式，复用 wall tool 的 numeric entry 模式
- **Multi-select**：Shift+click 添加到 selection，handles 同时显示多组
