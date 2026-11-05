# V4 专业编辑交互 · 第二阶段实施计划

> 分支：`codex/professional-editing-ux`（延续 Phase 1）
> Worktree：`.worktrees/professional-editing-ux`
> 日期：2026-05-01
> 前置：Phase 1 已合并（统一手柄/反馈框架 + 顶点拖拽闭环）

---

## 0. 目标与范围

**一句话目标**：在 Phase 1 的手柄框架上填充三种核心编辑能力——墙体整体拖拽、分割墙体、拖拽中数值精确输入——并修复 Phase 1 遗留缺陷，使"改户型"在常见场景下不再需要删除重画。

### 做什么

1. **修复 Phase 1 遗留缺陷**：Escape 取消顶点拖拽、commit 后自动选中受影响墙体
2. **墙体整体拖拽（Wall Body Drag）**：选中墙体后拖拽墙身 → 平移两端顶点 → 保持墙长/角度不变
3. **分割墙体（Split Wall）**：wall-midpoint handle 出现在墙中点 → 点击插入新顶点 → 一面墙变两面
4. **拖拽中数值输入**：顶点/墙体拖拽过程中按 Tab → 切换到精确数值输入模式
5. **多选支持**：Shift+click 追加选中 → 多面墙同时显示 handle → 多顶点同时拖拽（预留，本阶段只做选中）
6. 每个行为补单元测试

### 不做什么

- Undo/Redo 对 architecture document 的集成（Phase 3，需要独立 command history 设计）
- Offset wall（平行偏移墙体，Phase 3）
- Trim / Extend（墙体修剪/延伸，Phase 3）
- 连续画墙改进（与本阶段正交）

---

## 1. Phase 1 现有基础

### 1.1 可直接复用

| 能力 | 来源 |
|------|------|
| `EditHandle` 数据模型 + `resolveEditHandles` | `editing/editHandle.ts` |
| `VertexHandle` R3F 组件（圆盘+球体+三态色） | `canvas/EditHandles.tsx` |
| 顶点拖拽状态机（start/update/commit/cancel） | `architectureEditorStore.ts` |
| `resolveVertexDragSnap`（endpoint snap + grid snap） | `editing/vertexDragInteraction.ts` |
| `VertexDragPreview`（ghost 墙 + snap 球） | `canvas/VertexDragPreview.tsx` |
| `WallDimensionLabels`（选中+拖拽时标注） | `canvas/WallDimensionLabels.tsx` |
| `EditorStatusHud`（上下文感知提示） | `canvas/EditorStatusHud.tsx` |

### 1.2 需要扩展

| 要扩展的部分 | 扩展内容 |
|-------------|---------|
| `editHandle.ts` | 新增 `wall-midpoint` 类型 handle |
| `EditHandles.tsx` | 新增 `MidpointHandle` 子组件 |
| `interaction.ts` → `getArchitectureSceneKeyDownEffects` | 解除 `activeTool !== 'wall'` 的 early return，让 Escape 在 select tool 下也能触发 `cancel-vertex-drag` |
| `ArchitectureCommand` | 新增 `SPLIT_WALL` 命令 |
| `reducers.ts` | 新增 `splitWall` reducer |
| `tools.ts` | 新增 `WallDragState` 类型 |
| `editorStore` | 新增 wall drag 四个方法 |
| `sceneController.ts` | handlePointerMove/Up 增加 wall drag 分支 |

---

## 2. 任务分解

### Task 0：修复 Phase 1 遗留缺陷

#### 0a. Escape 取消顶点拖拽

**问题**：`getArchitectureSceneKeyDownEffects` 顶部有 `if (activeTool !== 'wall') return { commands: [] }`，导致 select tool 下按 Escape 不会触发 `cancel-vertex-drag`。

**文件**：`src/architecture/editing/interaction.ts`

**修改**：重构 `getArchitectureSceneKeyDownEffects`，将 Escape 处理提升到 tool 判断之前：

```typescript
export function getArchitectureSceneKeyDownEffects({
  activeTool,
  key,
  vertexDrag,   // 新增参数
}: ArchitectureSceneKeyboardArgs): ArchitectureSceneEffects {

  // Escape 在任何工具下都应生效
  if (key === 'Escape') {
    const commands: ArchitectureInteractionCommand[] = [];

    if (vertexDrag) {
      commands.push({ type: 'cancel-vertex-drag' });
    }

    if (activeTool === 'wall') {
      commands.push(
        { type: 'set-wall-closure-preview', candidate: null },
        { type: 'set-wall-numeric-entry-enabled', enabled: false },
        { type: 'cancel-draft-wall' },
      );
    }

    if (activeTool === 'select') {
      commands.push({
        type: 'set-selection',
        selection: { vertexIds: [], wallIds: [], zoneIds: [] },
      });
    }

    return { commands };
  }

  // 后续 wall-only 快捷键保持不变
  if (activeTool !== 'wall') {
    return { commands: [] };
  }
  // ... Shift, Alt, Tab 逻辑不变
}
```

同步修改 `ArchitectureSceneKeyboardArgs` 接口和 `sceneController.ts` 中传参。

#### 0b. commit 后选中受影响墙体

**问题**：`getVertexDragCommitEffects` commit 后清空 selection，用户体验不连续。

**文件**：`src/architecture/editing/vertexDragInteraction.ts`

**修改**：commit 后不清空 selection，改为选中被拖拽顶点相连的所有墙：

```typescript
export function getVertexDragCommitEffects(args: {
  document: ArchitectureDocument;
  vertexId: string;
  targetPosition: Point2;
}): ArchitectureInteractionCommand[] {
  const newDocument = reduceArchitectureCommand(args.document, {
    type: 'MOVE_VERTEX',
    vertexId: args.vertexId,
    to: args.targetPosition,
  });

  // 找到 commit 后文档中与目标位置关联的墙
  const connectedWallIds = newDocument.wallOrder.filter((wallId) => {
    const wall = newDocument.walls[wallId];
    return wall?.startVertexId === args.vertexId || wall?.endVertexId === args.vertexId;
  });

  return [
    { type: 'replace-document', document: newDocument },
    { type: 'commit-vertex-drag' },
    {
      type: 'set-selection',
      selection: {
        vertexIds: [],
        wallIds: connectedWallIds,
        zoneIds: [],
      },
    },
  ];
}
```

注意：`repairTopology` 可能合并顶点导致 `args.vertexId` 在新文档中不存在。需要检查并降级为空 selection。

**测试**：
- `vertexDragInteraction.test.ts`：验证 commit 后 selection 包含关联墙
- `interaction.test.ts`：验证 select tool + Escape → 产生 cancel-vertex-drag 命令

---

### Task 1：SPLIT_WALL 命令与 reducer

**新增命令**：`src/architecture/editing/commands.ts`

```typescript
| { type: 'SPLIT_WALL'; wallId: string; splitPoint: Point2 }
```

**新增 reducer**：`src/architecture/editing/reducers.ts`

```typescript
function splitWall(
  document: ArchitectureDocument,
  wallId: string,
  splitPoint: Point2,
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const wall = next.walls[wallId];
  if (!wall) return next;

  const levelId = wall.levelId;

  // 创建中间顶点
  const midVertexId = crypto.randomUUID();
  next.vertices[midVertexId] = { id: midVertexId, x: splitPoint[0], y: splitPoint[1] };

  // 原墙变为 start → mid
  next.walls[wallId] = {
    ...wall,
    endVertexId: midVertexId,
  };

  // 新墙 mid → end
  const newWallId = crypto.randomUUID();
  next.walls[newWallId] = {
    id: newWallId,
    levelId,
    startVertexId: midVertexId,
    endVertexId: wall.endVertexId,
    thickness: wall.thickness,
    height: wall.height,
    kind: wall.kind,
  };

  // 插入到 wallOrder 中原墙后面
  const insertIndex = next.wallOrder.indexOf(wallId);
  next.wallOrder.splice(insertIndex + 1, 0, newWallId);

  return repairTopology(syncLevelEntityIds(next));
}
```

`reduceArchitectureCommand` switch 中添加 `case 'SPLIT_WALL'`。

**测试**：`src/architecture/editing/__tests__/commands.test.ts`（扩展）
- split 后墙数量 +1，顶点数量 +1
- 新顶点位于 splitPoint
- 两面新墙共享新顶点
- 原墙的 startVertex 和新墙的 endVertex 与分割前一致

---

### Task 2：wall-midpoint handle

#### 2a. editHandle.ts 扩展

**文件**：`src/architecture/editing/editHandle.ts`

在 `resolveEditHandles` 中，当选中墙时，除了两端的 vertex-endpoint handle，还生成一个 wall-midpoint handle：

```typescript
// 在选中墙的处理循环中，在两端 handle 之后添加：
const startVertex = document.vertices[wall.startVertexId];
const endVertex = document.vertices[wall.endVertexId];
if (startVertex && endVertex) {
  handles.push({
    id: `handle:midpoint:${wallId}`,
    kind: 'wall-midpoint',
    position: [
      (startVertex.x + endVertex.x) / 2,
      (startVertex.y + endVertex.y) / 2,
    ],
    entityId: wallId,
    entityType: 'wall',
  });
}
```

#### 2b. MidpointHandle 渲染组件

**文件**：`src/components/canvas/EditHandles.tsx`（扩展）

新增 `MidpointHandle` 子组件，渲染为贴地菱形或十字，视觉上和 VertexHandle 的圆形区分开。

```typescript
function MidpointHandle({ handle }: { handle: EditHandle }) {
  // 渲染：贴地的小菱形 (旋转 45° 的正方形)
  // 默认色：editorTheme.accent (中性 teal)，而非 handle 暖赭色
  //   —— 视觉上提示"这不是拖拽，这是分割"
  // 点击事件：dispatch SPLIT_WALL 命令
}
```

渲染规格：

| 属性 | 值 |
|------|---|
| 几何体 | `PlaneGeometry(0.14, 0.14)` 旋转 45° 贴地 |
| 默认色 | `editorTheme.accent` (#4e7a74) |
| 悬停色 | `editorTheme.accentStrong` (#2f6f73) |
| Y 高度 | y=0.007（贴地） |
| 点击事件 | stopPropagation → dispatch `SPLIT_WALL` |

点击后的行为：
1. 执行 `SPLIT_WALL` 命令 → `replaceDocument`
2. 清空当前 selection
3. 选中新创建的中间顶点 → 显示该顶点的 handle，用户可以立刻拖拽它

在 `EditHandles` 的 render 中根据 `handle.kind` 分发：

```typescript
{handles.map((handle) =>
  handle.kind === 'wall-midpoint'
    ? <MidpointHandle key={handle.id} handle={handle} />
    : <VertexHandle key={handle.id} handle={handle} />
)}
```

**测试**：
- `editHandle.test.ts`：选中墙 → 返回 2 个 vertex-endpoint + 1 个 wall-midpoint
- `EditHandles.test.tsx`：midpoint handle 点击后触发 SPLIT_WALL

---

### Task 3：墙体整体拖拽（Wall Body Drag）

这是 Phase 2 复杂度最高的任务。用户选中一面墙后，不点 handle 而是直接在墙身上按住拖拽 → 整面墙平移，保持长度和角度不变。

#### 3a. WallDragState 数据定义

**文件**：`src/architecture/editing/tools.ts`（扩展）

```typescript
export interface WallDragState {
  wallId: string;
  startVertexId: string;
  endVertexId: string;
  startVertexOrigin: Point2;   // 拖拽开始时 start vertex 的原始位置
  endVertexOrigin: Point2;     // 拖拽开始时 end vertex 的原始位置
  grabOffset: Point2;          // 鼠标按下点相对于墙中点的偏移
  currentOffset: Point2;       // 当前累积偏移（含 snap）
}
```

#### 3b. Store 扩展

**文件**：`src/store/architectureEditorStore.ts`（扩展）

```typescript
// 状态
wallDrag: WallDragState | null;

// 方法
startWallDrag: (wallId: string, grabPoint: Point2) => void;
updateWallDrag: (currentPoint: Point2) => void;
commitWallDrag: () => void;
cancelWallDrag: () => void;
```

`startWallDrag` 从 document 读取墙的两端顶点原始位置，计算 grabOffset。

#### 3c. 拖拽交互逻辑

**新建文件**：`src/architecture/editing/wallDragInteraction.ts`

```typescript
/**
 * 墙体整体拖拽的 snap。
 * 将偏移量 snap 到 grid（不做 endpoint snap，因为是整体平移）。
 */
export function resolveWallDragSnap(args: {
  rawOffset: Point2;
  viewport: ArchitectureViewportState;
}): Point2

/**
 * 计算拖拽中两端顶点的预览位置。
 */
export function getWallDragPreviewPositions(args: {
  wallDrag: WallDragState;
}): { startPosition: Point2; endPosition: Point2 }

/**
 * 生成 commit 时的 commands。
 * 核心：对两端顶点分别执行 MOVE_VERTEX。
 * 因为 reduceArchitectureCommand 每次返回新 document，
 * 需要串行执行两次 MOVE_VERTEX。
 */
export function getWallDragCommitEffects(args: {
  document: ArchitectureDocument;
  wallDrag: WallDragState;
}): ArchitectureInteractionCommand[]
```

关键设计点：commit 时执行两次 `MOVE_VERTEX`（先移动 start vertex → 得到中间 document → 再移动 end vertex），不是分别执行两个独立命令。这确保 `repairTopology` 在两个顶点都到位后才运行一次。

实现方式：

```typescript
export function getWallDragCommitEffects(args) {
  const { startPosition, endPosition } = getWallDragPreviewPositions({ wallDrag: args.wallDrag });

  // 先移动 start，再在结果上移动 end
  const afterStart = reduceArchitectureCommand(args.document, {
    type: 'MOVE_VERTEX',
    vertexId: args.wallDrag.startVertexId,
    to: startPosition,
  });
  const afterBoth = reduceArchitectureCommand(afterStart, {
    type: 'MOVE_VERTEX',
    vertexId: args.wallDrag.endVertexId,
    to: endPosition,
  });

  return [
    { type: 'replace-document', document: afterBoth },
    { type: 'commit-wall-drag' },
    {
      type: 'set-selection',
      selection: { vertexIds: [], wallIds: [args.wallDrag.wallId], zoneIds: [] },
    },
  ];
}
```

⚠️ **风险**：第一次 `MOVE_VERTEX` 调用 `repairTopology` 可能改变拓扑（比如触发墙交叉分割），导致 `endVertexId` 在中间文档中失效。缓解措施：先克隆文档，直接修改两个顶点坐标，然后只调用一次 `repairTopology`。这需要绕过 `reduceArchitectureCommand`，直接在 `wallDragInteraction.ts` 中操作：

```typescript
function moveVerticesBatch(
  document: ArchitectureDocument,
  moves: Array<{ vertexId: string; to: Point2 }>,
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  for (const move of moves) {
    const vertex = next.vertices[move.vertexId];
    if (vertex) {
      next.vertices[move.vertexId] = { ...vertex, x: move.to[0], y: move.to[1] };
    }
  }
  return repairTopology(syncLevelEntityIds(next));
}
```

#### 3d. 事件接线

**修改文件**：`src/components/canvas/WallMeshes.tsx`

当 select tool + 墙已选中时，在墙 mesh 上的 `onPointerDown` 需要触发 `startWallDrag` 而不是重新选择：

```typescript
onPointerDown={(event) => {
  if (activeTool === 'select' && isSelected) {
    event.stopPropagation?.();
    const point = [event.point.x, event.point.z] as Point2;
    startWallDrag(wall.wallId, point);
    return;
  }
  meshController.handleWallPointerDown(wall.wallId, event);
}}
```

**修改文件**：`src/architecture/editing/sceneController.ts`

`handlePointerMove` 和 `handlePointerUp` 增加 wallDrag 分支（与 vertexDrag 同级）。

**修改文件**：`src/components/canvas/VertexDragPreview.tsx`（扩展或新建 WallDragPreview）

墙体拖拽预览：ghost 墙在新位置 + 原位置的虚线轮廓。可以复用 VertexDragPreview 的模式，因为底层逻辑相似——都是用偏移后的顶点位置渲染 ghost 墙。

#### 3e. interaction.ts 扩展

新增 command 类型：

```typescript
| { type: 'update-wall-drag'; currentPoint: Point2 }
| { type: 'commit-wall-drag' }
| { type: 'cancel-wall-drag' }
```

`applyArchitectureInteractionCommands` 增加对应分发。

`ArchitectureInteractionCommandHandlers` 增加：

```typescript
updateWallDrag?: (currentPoint: Point2) => void;
commitWallDrag?: () => void;
cancelWallDrag?: () => void;
```

**测试**：
- `wallDragInteraction.test.ts`：snap、preview position 计算、commit effects
- `WallMeshes.test.tsx`：选中墙 → pointerDown → startWallDrag 被调用

---

### Task 4：拖拽中数值输入

#### 4a. 顶点拖拽 + 数值输入

用户在拖拽顶点过程中按 Tab → HUD 切换到数值输入模式 → 输入目标坐标或偏移量 → Enter 提交。

**文件**：`src/architecture/editing/tools.ts`（扩展 VertexDragState）

```typescript
export interface VertexDragState {
  vertexId: string;
  startPosition: Point2;
  currentPosition: Point2;
  snappedToVertexId: string | null;
  numericEntryEnabled: boolean;  // 新增
}
```

**文件**：`src/components/canvas/EditorStatusHud.tsx`

在 `vertexDrag` 分支中，如果 `numericEntryEnabled`，显示 X/Y 坐标输入框（而非单一长度输入）：

```
拖拽中 · Tab 精确输入
─────────────────────
X: [____] m   Y: [____] m
Enter 确认 · Esc 取消
```

输入值表示绝对世界坐标（而非相对偏移），因为用户看到的标注是绝对位置。

#### 4b. 墙体拖拽 + 数值输入

墙体拖拽中按 Tab → 输入平移距离（沿墙法线方向）：

```
墙体拖拽中 · Tab 精确输入
──────────────────────────
偏移: [____] m（沿法线方向）
Enter 确认 · Esc 取消
```

**文件**：`src/architecture/editing/interaction.ts`

修改 `getArchitectureSceneKeyDownEffects`：当 `vertexDrag` 或 `wallDrag` 活跃时，Tab 键切换数值输入模式。

**测试**：
- EditorStatusHud.test.tsx：拖拽中 + numericEntryEnabled → 显示坐标输入框
- interaction.test.ts：select tool + 拖拽中 + Tab → 产生数值输入 command

---

### Task 5：Shift+Click 多选

#### 5a. 交互逻辑修改

**文件**：`src/architecture/editing/interaction.ts`

当前 `getWallMeshPointerDownEffects` 和 `getZoneMeshPointerDownEffects` 总是替换 selection。需要检查 Shift 修饰键，如果按住 Shift 则追加。

需要向这两个函数传入 `shiftKey` 参数：

```typescript
interface WallMeshPointerDownArgs {
  activeTool: ArchitectureTool;
  document: ArchitectureDocument;
  wallId: string;
  intersections: Array<{ objectName: string; point: Point2 }>;
  shiftKey: boolean;  // 新增
}
```

追加逻辑：

```typescript
if (shiftKey && activeTool === 'select') {
  // 如果 wallId 已在 selection 中 → 移除（toggle）
  // 否则 → 追加
  const isAlreadySelected = currentSelection.wallIds.includes(wallId);
  return {
    shouldStopPropagation: true,
    commands: [{
      type: 'set-selection',
      selection: isAlreadySelected
        ? { ...currentSelection, wallIds: currentSelection.wallIds.filter(id => id !== wallId) }
        : { ...currentSelection, wallIds: [...currentSelection.wallIds, wallId] },
    }],
  };
}
```

#### 5b. handle 显示

Phase 1 的 `resolveEditHandles` 已经遍历 `selection.wallIds` 数组生成 handles，所以多选自动会显示多组 handles，无需额外修改。

#### 5c. meshController 传参

**文件**：`src/architecture/editing/meshController.ts`

`handleWallPointerDown` 和 `handleZonePointerDown` 需要从事件中提取 `shiftKey` 并传入。

```typescript
handleWallPointerDown(wallId: string, event: ArchitectureMeshIntersectionEvent) {
  const shiftKey = event.nativeEvent?.shiftKey ?? false;
  // ...传入 getWallMeshPointerDownEffects
}
```

⚠️ 需要确认 R3F 的 ThreeEvent 是否透传 `shiftKey`。如果不透传，可以从 editorStore 的 wallTool modifiers 读取。

**测试**：
- `interaction.test.ts`：Shift + 点击墙 → selection 追加
- `interaction.test.ts`：Shift + 点击已选中墙 → selection 移除（toggle）
- `meshController.test.ts`：传入 shiftKey → 正确分发

---

### Task 6：集成测试与构建验证

1. 跑 `npm run lint`（`tsc --noEmit`）确认类型安全
2. 跑 `npx vitest run` 确认所有单元测试通过
3. 跑 `npm run build` 确认生产构建无错
4. 手动验证：画两面墙 → 选中 → 看到端点 handle + 中点 handle → 拖端点 → 按 Escape 取消 → 点中点分割 → 拖整面墙 → Shift 多选

---

## 3. 执行顺序与依赖关系

```
Task 0 (Phase 1 修复)
  ↓
Task 1 (SPLIT_WALL 命令)     ─── 独立，可与 Task 0 并行
  ↓
Task 2 (midpoint handle)     ←── 依赖 Task 1（需要 SPLIT_WALL reducer）
  ↓
Task 3 (墙体整体拖拽)         ←── 依赖 Task 0（Escape 修复）
  ↓
Task 4 (数值输入)             ←── 依赖 Task 3（需要 wallDrag 状态）
  ↓
Task 5 (多选)                ←── 独立，可与 Task 3/4 并行
  ↓
Task 6 (集成验证)             ←── 依赖全部
```

建议 commit 节奏：
- Commit 1：Task 0 + Task 1（修复 + 新命令）
- Commit 2：Task 2（split wall 完整闭环）
- Commit 3：Task 3（wall body drag 完整闭环）
- Commit 4：Task 4 + Task 5（数值输入 + 多选）
- Commit 5：Task 6（验证）

---

## 4. 新增 / 修改文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `src/architecture/editing/wallDragInteraction.ts` | 墙体拖拽 snap + commit 纯函数 |
| `src/architecture/editing/__tests__/wallDragInteraction.test.ts` | 墙体拖拽单测 |

### 修改文件

| 文件路径 | 改动摘要 |
|---------|---------|
| `src/architecture/editing/commands.ts` | 新增 `SPLIT_WALL` 命令 |
| `src/architecture/editing/reducers.ts` | 新增 `splitWall` reducer + `moveVerticesBatch` |
| `src/architecture/editing/editHandle.ts` | `resolveEditHandles` 新增 wall-midpoint handle |
| `src/architecture/editing/tools.ts` | 新增 `WallDragState`，扩展 `VertexDragState` 加 `numericEntryEnabled` |
| `src/architecture/editing/interaction.ts` | 重构 keyDown 的 Escape 逻辑、新增 wall-drag command 类型、shiftKey 多选 |
| `src/architecture/editing/vertexDragInteraction.ts` | commit 后选中关联墙 |
| `src/architecture/editing/meshController.ts` | 透传 shiftKey |
| `src/architecture/editing/sceneController.ts` | 增加 wallDrag 分支、keyDown 传 vertexDrag 参数 |
| `src/store/architectureEditorStore.ts` | 新增 wallDrag 状态和四个方法 |
| `src/components/canvas/EditHandles.tsx` | 新增 MidpointHandle、按 kind 分发 |
| `src/components/canvas/WallMeshes.tsx` | 选中墙的 pointerDown → startWallDrag |
| `src/components/canvas/VertexDragPreview.tsx` | 扩展支持 wallDrag preview（或拆分 WallDragPreview） |
| `src/components/canvas/EditorStatusHud.tsx` | 新增 wallDrag 提示、数值输入模式 |
| `src/components/canvas/WallDimensionLabels.tsx` | 新增 wallDrag 时的标注支持 |

### 扩展测试文件

| 文件路径 | 新增用例 |
|---------|---------|
| `src/architecture/editing/__tests__/commands.test.ts` | SPLIT_WALL 测试 |
| `src/architecture/editing/__tests__/editHandle.test.ts` | midpoint handle 测试 |
| `src/architecture/editing/__tests__/vertexDragInteraction.test.ts` | commit 后 selection 测试 |
| `src/architecture/editing/__tests__/interaction.test.ts` | Escape 在 select tool、shiftKey 多选 |
| `src/architecture/editing/__tests__/meshController.test.ts` | shiftKey 透传 |
| `src/components/canvas/__tests__/EditHandles.test.tsx` | midpoint handle 渲染和点击 |
| `src/components/canvas/__tests__/EditorStatusHud.test.tsx` | wallDrag 和数值输入显示 |

---

## 5. 设计决策与权衡

### 5.1 墙体拖拽为什么不新增 MOVE_WALL 命令？

**决策**：不新增。墙体拖拽的本质是同时移动两个顶点，用已有的 `MOVE_VERTEX` 语义即可。

**理由**：新增命令会增加 reducer 表面积和未来 undo/redo 的复杂度。Phase 3 做 undo 时，`MOVE_VERTEX × 2` 比 `MOVE_WALL` 更容易组合成一个 undo group。`moveVerticesBatch` 只是一个辅助函数避免 repairTopology 被调用两次，它不是新的命令语义。

### 5.2 Split Wall 为什么用点击而不是拖拽？

**决策**：midpoint handle 点击 = 分割。分割后自动选中新顶点，用户可以立刻拖拽它。

**理由**：如果 midpoint handle 要支持拖拽才分割，状态机复杂度会显著增加——需要区分"是在拖中点做 split + move"还是"在拖整面墙做 body drag"。两步操作（click split → drag vertex）更可预测，也更符合 SketchUp 等工具的习惯。

### 5.3 多选的范围为什么只做选中不做多顶点同拖？

**决策**：Phase 2 只做 Shift+click 多选和多 handle 显示。多顶点同时拖拽留到 Phase 3。

**理由**：多顶点同拖需要处理约束冲突（两个顶点的 snap 结果可能矛盾）、预览渲染复杂度倍增、commit 时的批量 MOVE_VERTEX 顺序问题。先做选中让用户能看到多面墙的 handle 和标注，已经是显著的体验提升。

### 5.4 数值输入用绝对坐标还是相对偏移？

**决策**：顶点拖拽用绝对坐标（X, Y），墙体拖拽用法线方向偏移距离。

**理由**：顶点拖拽时用户关心的是"这个点最终在哪"，绝对坐标更直觉。墙体拖拽时用户关心的是"这面墙往这边移多远"，法线偏移更直觉。两种模式在 HUD 中有不同的输入框布局，不会混淆。

### 5.5 WallDraftHud.tsx 为什么没删？

Phase 1 的 `WallDraftHud.tsx` 还在文件系统里，但 `SceneRoot` 已经用 `EditorStatusHud`。旧文件可以在本阶段清理掉（在 Task 0 中处理），同时更新旧测试引用。

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 墙体拖拽的双顶点 moveVerticesBatch 可能在 repairTopology 中引发意外拓扑变化 | 拖拽 commit 后户型形状异常 | 用 `moveVerticesBatch` 一次性修改两个顶点再 repair，避免中间态；测试覆盖 T 型墙拖拽场景 |
| Split Wall 后 zone ID 变化 | 分割前的 zone selection/property 引用失效 | split 后清空 selection，只选中新顶点 |
| R3F ThreeEvent 可能不透传 shiftKey | 多选无法工作 | 备选方案：从 sceneController 的 keyDown/keyUp 追踪 Shift 状态，存入 editorStore |
| 墙体拖拽时整面墙穿过另一面墙 | commit 后墙交叉，repairTopology 可能分割 | 这是正确行为——repairTopology 会自动处理交叉墙。在 preview 中不 repair 所以 ghost 墙可能穿过，但 commit 后拓扑正确 |
| 数值输入法线方向计算需要墙的法线向量 | 复杂度 | 从 wall 的 start/end 计算法线很简单：`[-dy/length, dx/length]`，不需要额外基础设施 |

---

## 7. Phase 3 展望（不在本次范围）

Phase 2 完成后，编辑器将覆盖绝大多数"改户型"场景。Phase 3 可以聚焦于：

- **Undo/Redo**：在 `architectureDocumentStore` 上实现 command history stack，每次 `replaceDocument` 记录前后快照（或 command 日志）
- **Offset Wall**：沿法线方向复制一面平行墙，自动连接端点
- **Trim / Extend**：墙体延伸到与另一面墙的交点 / 裁剪到交点
- **连续画墙**：画完一面墙自动接下一面的起点
- **多顶点同时拖拽**：多选后一起拖动
