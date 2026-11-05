# Zone ID 稳定性与持久化 — 融合实施方案

> 日期: 2026-04-30
> 状态: **P0 已完成并通过手测验收**
> 实现分支: `codex/zone-id-stability`（worktree: `.worktrees/zone-id-stability`）
> 参考来源: `peaceful-lewin` worktree（tombstone 设计参考，按 patch 手动移植，不直接合并）

## 问题定义

Zone 是派生实体：每次拓扑变更都走 `walls → findClosedLoops → rebuildZones → matchZones` 管道重新计算。当前 `rebuildZones` 只从 `document.zones`（活跃 zone）获取匹配输入。一旦编辑操作临时打破闭合环路，zone 被立即删除，下次恢复闭环时 matcher 没有前序数据，只能生成新 ID，用户标注的 `kind` 和 `name` 随之丢失。

**核心结论**: 问题不在 matcher 算法（现有四阶段匹配方向正确），而在匹配输入源不够——需要给 zone 增加"短期记忆"。

## 方案总览

分三个阶段，每个阶段独立可交付、独立可验证：

| 阶段 | 目标 | 改动范围 | 对 matchZones 的改动 |
|------|------|----------|---------------------|
| P0: Tombstone | 解决 break-and-repair 循环 | `zone.ts`, `document.ts`, `zones.ts`, `repair.ts`, 测试 | 零 |
| P1: 几何 Signature | 减少 vertex ID 变更导致的不必要空间计算 | `zones.ts`, `zoneMatcher.ts` | 极小（Phase 1 增加一个查找路径） |
| P2: 观察与调优 | 根据真实失败数据决定是否需要额外补丁 | 视情况 | 视情况 |

**P0 是唯一的必做项。P1 和 P2 仅在 P0 落地后有真实数据驱动时才推进。**

---

## P0: Zone Tombstone（核心解法）

### 设计原理

Zone 死亡时，把它的几何快照（resolved 绝对坐标，不是 vertex ID 引用）存入 `zoneTombstones` 数组。下次 `rebuildZones` 时，tombstone 转为 `PreviousZoneMatchInput` 追加到活跃 zone 列表之后，一起喂给 `matchZones`。

优先级天然内建：
- 活跃 zone 的 signature 包含当前有效的 vertex ID → Phase 1（签名匹配）命中
- Tombstone 的 signature 包含已过时的 vertex ID → Phase 1 自然跳过 → 落到 Phase 2+（空间重叠）靠几何匹配

**对 `matchZones` 内部逻辑零改动。**

### 数据模型

```typescript
// src/architecture/domain/zone.ts — 新增
export interface ZoneTombstone {
  id: string;           // 原始 zone ID，用于恢复
  levelId: string;
  kind: ZoneKind;
  name: string | null;
  geometry: {           // 死亡时刻的绝对坐标快照
    area: number;
    centroid: [number, number];
    points: Array<[number, number]>;
  };
  signature: string;    // 过时但保留，零成本快速路径
}
```

```typescript
// src/architecture/domain/document.ts — 新增字段
export interface ArchitectureDocument {
  // ... 现有字段 ...
  zoneTombstones: ZoneTombstone[];
}
```

设计决策说明：
- **存 resolved points 而非 vertex ID**: 导致 zone 死亡的操作（删墙）往往连带删除 vertex，存 vertex ID 到恢复时就是悬空指针
- **保留 stale signature**: 零存储成本，在极端情况下（删墙后在完全相同的 vertex 之间重画）可以让 Phase 1 直接命中
- **无时间戳**: FIFO 50 条上限足够，简单可靠

### `rebuildZones` 函数签名

```typescript
export function rebuildZones(
  document: ArchitectureDocument,     // 当前 document（经过 cleanup，zones 已清空）
  epsilon = 1e-6,
  previousDocument: ArchitectureDocument = document  // 编辑前原始 document
): ArchitectureDocument
```

第三个参数 `previousDocument` 是 P0 的关键设计。详见下方「`previousDocument` 模式」。

### 生命周期变更

在现有流程中插入三个操作（标 ★），不改变其他步骤：

```
1.  Clone document
2.  findClosedLoops
3.  构建 previousZones（从 previousDocument.zones，编辑前的活跃 zone）
4.  ★ FEED: 把 previousDocument.zoneTombstones 转为 PreviousZoneMatchInput，追加到 previousZones
5.  构建 loopStates（从新 loops）
6.  matchZones(previousZones + tombstoneInputs, nextLoops)
7.  组装新 zones（从活跃 zone 或 tombstone 恢复 kind/name）
8.  ★ CREATE: previousDocument 中存在但本轮消失的 zone → 生成新 tombstone（对 previousDocument 调 buildBoundaryGeometry）
9.  ★ CONSUME: 被匹配成功的 tombstone → 从列表中移除
10. 未消费的 tombstone + 新 tombstone → FIFO 50 上限淘汰
11. syncLevelEntityIds → 返回
```

### 关键实现细节

**`previousDocument` 模式（实施中发现的关键设计）**:

实施过程中发现一个集成层面的问题：`repairTopology` 的调用链是 `splitIntersectingWalls → mergeVertices → cleanupTopology → rebuildZones`。其中 `cleanupTopology` 会清空 `zones = {}` 和 `zoneOrder = []`（这是 cleanup 的正确职责——清除派生数据以便重建）。但这意味着传入 `rebuildZones` 的 document 已经没有任何活跃 zone 信息，tombstone 的 CREATE 阶段无法知道哪些 zone 消失了。

单元测试没有暴露此问题，因为测试直接调用 `rebuildZones`，绕过了 `repairTopology → cleanupTopology` 管道。

**解法**: `repairTopology` 把编辑前的原始 `document`（cleanup 之前）作为 `previousDocument` 传给 `rebuildZones`：

```typescript
// repair.ts — 传递编辑前 document 作为 previousDocument
return rebuildZones(cleanedDocument, epsilon, document);
//                                              ^^^^^^^^ 原始 document，zone 数据完整
```

`rebuildZones` 内部从 `previousDocument` 读取旧 zone 和旧 tombstone，从 `document`（cleanup 后）读取当前拓扑。这样不改变 `cleanupTopology` 的职责，也不改变 `rebuildZones` 对外的行为契约。

**CREATE 阶段必须用 previousDocument**:

```typescript
// ✅ 正确: 对 previousDocument 调用，此时 vertex 还存在
const geometry = buildBoundaryGeometry(previousDocument, zone.boundaryVertexIds, epsilon);

// ❌ 错误: 对 next（cleanup 后的 document）调用，vertex 可能已被删除
const geometry = buildBoundaryGeometry(next, zone.boundaryVertexIds, epsilon);
```

**Metadata 恢复的查找顺序**:

```typescript
const previousZone = reusableZoneId ? previousZoneById.get(reusableZoneId) : null;
const tombstone = reusableZoneId ? tombstoneById.get(reusableZoneId) : null;

kind: previousZone?.kind ?? tombstone?.kind ?? 'unknown',
name: previousZone?.name ?? tombstone?.name ?? null,
```

活跃 zone 优先，tombstone 兜底，都没有则 fallback 到默认值。

**GC 规则**:

```typescript
const MAX_TOMBSTONES = 50;
const allTombstones = [...survivingTombstones, ...newTombstones];
next.zoneTombstones = allTombstones.length > MAX_TOMBSTONES
  ? allTombstones.slice(-MAX_TOMBSTONES)  // 淘汰最旧的（数组头部）
  : allTombstones;
```

### Document 工具函数变更

| 函数 | 变更 |
|------|------|
| `createEmptyArchitectureDocument()` | 初始化 `zoneTombstones: []` |
| `cloneArchitectureDocument()` | 深拷贝 tombstone 及其嵌套的 geometry.points 和 centroid |
| `syncLevelEntityIds()` | 无变更（tombstone 是 document 级，不属于 level） |

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/architecture/domain/zone.ts` | 新增 | `ZoneTombstone` 接口 |
| `src/architecture/domain/document.ts` | 修改 | 新增 `zoneTombstones` 字段，更新 `create` 和 `clone`（含 `?? []` 兼容旧文档） |
| `src/architecture/topology/zones.ts` | 修改 | `rebuildZones` 增加 `previousDocument` 参数；FEED/CREATE/CONSUME 逻辑；`MAX_TOMBSTONES` 常量 |
| `src/architecture/topology/repair.ts` | 修改 | `repairTopology` 传原始 `document` 作为 `rebuildZones` 第三参数 |
| `src/architecture/topology/__tests__/zones.test.ts` | 修改 | 三个 tombstone 测试用例（break-repair 恢复、不干扰活跃 zone、GC 上限） |
| `src/architecture/domain/__tests__/document.test.ts` | 修改 | `starts with no zone tombstones`、`deep clones zone tombstone geometry` |

**明确不改的文件:**
- `cleanup.ts` — 保持清空 `zones = {}`、`zoneOrder = []` 的行为不变
- `zoneMatcher.ts` — 匹配逻辑不变
- `ZoneMeshes.tsx` — 只读 `document.zones`，不关心 tombstone
- `ZonePropertyPanel.tsx` — 只显示活跃 zone
- `persistence.ts` — tombstone 随 document 自动持久化

### 测试覆盖

#### 必须通过的测试用例

1. **Break-and-repair 恢复**: 闭合房间 → 记录 ID → 设置 kind/name → 删墙（zone 死亡） → 验证 tombstone 生成 → 补墙（zone 恢复） → 断言同一 ID、同一 kind、同一 name → 断言 tombstone 被消费

2. **Tombstone 不干扰活跃 zone**: 两个房间 A、B → 删 A 的墙（A tombstoned） → B 不受影响 → 补回 A → A 恢复原 ID → B 的 ID 始终不变

3. **GC 上限**: 构造 51 个 tombstone → rebuildZones → 断言只剩 50 个 → 最旧的（tomb-0）被淘汰

4. **现有全部 zones.test.ts 和 zoneMatcher.test.ts 测试继续通过**

#### Review 检查结果

- `cloneArchitectureDocument` 对 tombstone.geometry.points 做了 `map(p => [...p])` 深拷贝 ✅ 已验证
- CREATE 阶段用 `previousDocument` 调 `buildBoundaryGeometry` ✅ 已验证
- "tombstone 不应抢活跃 zone 的 ID"测试 ✅ 已通过
- `repairTopology` 正确传递 `previousDocument` 给 `rebuildZones` ✅ 已验证（手测 + 代码审查）
- `cleanup.ts` 未被修改，保持清空 zones 的职责 ✅ 已确认

---

## P1: 几何 Signature（性能优化，P0 之后按需推进）

### 动机

当 `mergeVertices` 或 `splitIntersectingWalls` 替换了 vertex ID 但坐标不变时，当前 signature（基于 vertex UUID）会失效，强制走到 Phase 2+（空间重叠计算，涉及三角化和多边形裁剪）。几何 signature 可以在 Phase 1 就命中这些 case。

### 设计

在现有 vertex-ID signature 之外，增加基于坐标的规范化哈希：

```typescript
function createGeometricSignature(points: Point2[], epsilon: number): string {
  // 1. 找到最小坐标点作为起点（先比 x 再比 y）
  // 2. 归一化为逆时针方向
  // 3. 量化坐标到 epsilon 精度（避免浮点抖动）
  // 4. join 成字符串
}
```

`matchBySignature` 中的查找顺序：
1. vertex-ID signature（完全精确）
2. 几何 signature（坐标等价）

### 前提条件

- P0 已落地且测试全绿
- 有真实的 profiling 数据表明 Phase 2+ 的空间计算是性能瓶颈
- 或者有真实的失败 case 表明 vertex ID 变更导致匹配丢失

**如果 P0 的 tombstone + 现有空间匹配已经足够覆盖所有场景，则不推进 P1。**

---

## P2: 观察与调优（数据驱动，不预设方案）

P0 落地后，在以下方面观察真实表现：

1. **GC 策略是否足够**: 如果 50 条 FIFO 在某些编辑模式下不够（比如短时间大量拓扑操作），可以考虑"数量上限 + 最少保留 N 次 rebuild"的混合策略
2. **Coverage fallback 精度**: 如果凹多边形的采样点不够导致匹配失败，可以增加内部采样点
3. **是否需要 Shadow Metadata Store**: 如果 tombstone 机制在所有真实场景下都能恢复 metadata，则不需要额外的独立存储

**核心原则: 不在没有失败数据的前提下预支优化。每一步都由真实失败 case 驱动。**

---

## 实施路线（实际执行记录）

### 第一步: Review peaceful-lewin（✅ 已完成）

Review 了 peaceful-lewin worktree 的 tombstone 实现，确认三个关键点正确：深拷贝、CREATE 阶段用旧 document、活跃 zone 优先级。决定按 patch 手动移植而非直接合并分支。

### 第二步: 按 patch 手动移植到 codex/zone-id-stability（✅ 已完成）

在 `.worktrees/zone-id-stability` worktree 中，基于 `feature/architecture-core-v3-v2base` 分支，按 hunk 手动移植 tombstone 代码到 6 个文件（见文件变更清单）。

### 第三步: 全量回归验证（✅ 已完成）

192 个测试全部通过（26 个 zones.test.ts，含 3 个新增 tombstone 测试）。类型检查通过。

### 第四步: 集成问题修复（✅ 已完成）

单元测试全绿后，手动浏览器测试发现 zone ID 仍然不稳定。排查发现根因：

> `repairTopology` 调用链为 `splitIntersectingWalls → mergeVertices → cleanupTopology → rebuildZones`。`cleanupTopology` 会清空 `zones = {}` 和 `zoneOrder = []`，导致传入 `rebuildZones` 的 document 没有任何旧 zone 信息，tombstone 的 CREATE 阶段无法得知哪些 zone 消失了。单元测试直接调用 `rebuildZones` 绕过了这条管道，因此没有暴露此问题。

修复方案：`rebuildZones` 新增 `previousDocument` 参数（默认值 `= document`，向后兼容），`repairTopology` 传编辑前原始 `document` 作为第三参数。不改变 `cleanupTopology` 的职责。

### 第五步: 手动浏览器验证（✅ 已完成）

验证场景：
1. **Break-and-repair**: 画房间 → 记 zone ID → 删墙 → 补墙 → zone ID 不变 ✅
2. **双房间隔离**: 画两个房间 → 删其中一个的墙 → 另一个 zone ID 不变 → 补回 → 两个 ID 都恢复 ✅
3. **Metadata 恢复**: 设置 kind/name → 删墙 → 补墙 → kind/name 恢复 ✅

### 后续: 按需决定是否推进 P1/P2

---

## 经验教训

**单元测试 vs 集成测试的盲区**: 直接调用 `rebuildZones` 的单元测试无法覆盖 `repairTopology → cleanupTopology → rebuildZones` 管道中的数据流问题。对于涉及多步管道的功能，需要同时有管道级别的集成测试或手动验证。

**不要改变不属于你的职责**: 最初尝试删除 `cleanupTopology` 中的 `zones = {}` 清空逻辑来解决问题——这改变了 cleanup 的职责契约。正确做法是在调用者层面（`repairTopology`）把缺失的上下文传递下去。
