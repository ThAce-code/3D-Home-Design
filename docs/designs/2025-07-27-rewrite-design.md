# 3D 家居设计器 — 重写设计文档

## 1. 项目目标

从零重写 3D 家居设计器，解决当前版本的架构混乱、组件臃肿、逻辑耦合问题。

**核心原则：**
- 组件只管渲染和事件绑定，不含业务逻辑
- 业务逻辑放 services（纯函数，可测试）
- 状态按领域拆 slice，用 zundo 实现 undo/redo
- 类型集中定义，全局共享

## 2. 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 | 不变 |
| 3D | @react-three/fiber + drei | 不变 |
| 状态 | Zustand 5 + immer + zundo | 新增 immer/zundo |
| 样式 | Tailwind CSS 4 | 不变 |
| 持久化 | idb | 不变 |
| 构建 | Vite 7 | 不变 |
| 测试 | Vitest + jsdom | 不变 |
| 图标 | lucide-react | 不变 |

## 3. 分阶段交付

### Phase 1 — MVP
- 单房间绘制（拖拽画矩形，调整宽/深/高）
- 家具管理（上传 GLB，放置到地板，拖拽/旋转/缩放）
- FPS 漫游（WASD + 鼠标视角 + 飞行模式）
- Undo/Redo（Ctrl+Z / Ctrl+Y）
- 精确数值编辑（属性面板可输入数字）
- Ghost Preview（放置前半透明预览）
- IndexedDB 持久化

### Phase 2
- 多房间支持（独立矩形房间 + 吸附对齐）
- 预设家具库（内置基础模型）
- 墙面透明切换

### Phase 3
- 2D 只读缩略图（俯视平面图）

## 4. 目录结构

```
src/
├── main.tsx                    # 入口
├── App.tsx                     # 布局壳
│
├── types/                      # 全局类型定义
│   ├── room.ts                 # Room, Wall
│   ├── furniture.ts            # FurnitureItem, Asset
│   ├── camera.ts               # CameraMode, InteractionMode
│   └── index.ts                # 统一导出
│
├── services/                   # 纯函数业务逻辑
│   ├── collision.ts            # AABB 碰撞检测
│   ├── transform.ts            # 位置/旋转/缩放计算
│   ├── room.ts                 # 房间创建/验证/吸附
│   ├── asset.ts                # GLB 加载、BBox 缓存
│   └── persistence.ts          # IndexedDB 读写
│
├── store/                      # Zustand 状态管理
│   ├── useStore.ts             # 合并所有 slices
│   └── slices/
│       ├── roomSlice.ts        # rooms[], selectedRoomId
│       ├── furnitureSlice.ts   # items[], selectedItemId, transforms
│       ├── assetSlice.ts       # assets[], selectedAssetId
│       ├── cameraSlice.ts      # interactionMode, isFlying, pointerLock
│       └── uiSlice.ts          # mode(build/decorate), buildTool, panels
│
├── hooks/                      # 共享 React hooks
│   ├── useKeyboard.ts          # 集中式键盘状态
│   ├── usePointerLock.ts       # PointerLock 封装
│   └── useFloorRaycast.ts      # 地板射线检测（Ghost Preview + 放置）
│
├── components/
│   ├── layout/                 # 布局组件
│   │   ├── Header.tsx          # 模式切换
│   │   └── AppShell.tsx        # 三栏布局壳
│   │
│   ├── panels/                 # 侧面板
│   │   ├── AssetPanel.tsx      # 家具库（上传 + 列表）
│   │   ├── PropertyPanel.tsx   # 属性编辑（可输入数值）
│   │   └── RoomPanel.tsx       # 房间属性（build 模式）
│   │
│   ├── overlays/               # 浮层 / HUD
│   │   ├── Crosshair.tsx       # FPS 十字准星
│   │   ├── ModeIndicator.tsx   # 模式 + 快捷键提示
│   │   └── Toolbar.tsx         # 变换工具栏 (T/R/S)
│   │
│   └── canvas/                 # 3D 场景
│       ├── SceneRoot.tsx       # <Canvas> 包装 + 灯光 + 环境
│       ├── RoomMesh.tsx        # 单个房间渲染（地板+墙+顶）
│       ├── FurnitureModel.tsx  # 单个家具渲染 + TransformControls
│       ├── GhostPreview.tsx    # 放置预览
│       ├── BuildGrid.tsx       # 构建模式网格 + 绘制交互
│       ├── FloorPlane.tsx      # 无限地板（点击放置目标）
│       └── cameras/
│           ├── FPSControls.tsx # WASD + 鼠标视角 + 飞行（合并原 3 个组件）
│           └── OrbitSetup.tsx  # OrbitControls 配置
│
└── test/
    └── setup.ts
```

## 5. 核心类型定义

```typescript
// types/room.ts
export interface Room {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  transparentWalls: Record<string, boolean>;
}

// types/furniture.ts
export interface Asset {
  id: string;
  name: string;
  file: Blob;
  url: string;
  bbox?: { size: [number, number, number]; min: [number, number, number] };
}

export interface FurnitureItem {
  id: string;
  assetId: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
  baseSize?: [number, number, number];
}

// types/camera.ts
export type AppMode = 'build' | 'decorate';
export type InteractionMode = 'fps' | 'edit';
```

## 6. Store Slice 设计

每个 slice 是一个函数 `(set, get) => ({...})`，在 useStore.ts 中用 `create` 合并。

整个 store 包裹 `temporal` (zundo) 中间件，自动获得 undo/redo。

```typescript
// store/useStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { createRoomSlice } from './slices/roomSlice';
import { createFurnitureSlice } from './slices/furnitureSlice';
import { createAssetSlice } from './slices/assetSlice';
import { createCameraSlice } from './slices/cameraSlice';
import { createUiSlice } from './slices/uiSlice';

export const useStore = create<AppState>()(
  temporal(
    immer((...a) => ({
      ...createRoomSlice(...a),
      ...createFurnitureSlice(...a),
      ...createAssetSlice(...a),
      ...createCameraSlice(...a),
      ...createUiSlice(...a),
    })),
    {
      // 只追踪数据变更，不追踪 UI 状态
      partialize: (state) => ({
        rooms: state.rooms,
        items: state.items,
      }),
    }
  )
);
```

## 7. 服务层设计

所有 services 都是纯函数，不依赖 React 或 store：

```typescript
// services/collision.ts
export function checkAABBOverlap(a: BBox, b: BBox): boolean;
export function clampToRoom(position: Vec3, itemSize: Vec3, room: Room): Vec3;

// services/transform.ts
export function eulerToQuaternion(euler: Vec3): Quat;
export function applySnap(value: number, snapSize: number): number;

// services/room.ts
export function createRoom(params: { width; depth; height }): Room;
export function snapRoomToNeighbor(room: Room, neighbors: Room[]): Room;

// services/asset.ts
export function computeBBox(scene: THREE.Object3D): BBox;
export function autoScale(bbox: BBox, targetMaxDim?: number): number;

// services/persistence.ts
export function saveState(state: PersistData): Promise<void>;
export function loadState(): Promise<PersistData>;
```

## 8. 关键组件职责

### FPSControls（合并原 WASDMovement + MouseLookControls + InteractionHotkeys）
- 单一组件管理所有 FPS 输入
- 读 useKeyboard hook 获取按键状态
- 读 store 获取 isFlying / cameraView
- useFrame 中计算移动向量，更新 camera

### PropertyPanel（可编辑）
- 位置/旋转/缩放都是 `<input type="number">`
- onChange 直接调 store.updateItem()
- 自动触发 undo 记录

### GhostPreview
- 用 useFloorRaycast hook 获取鼠标在地板上的位置
- 渲染半透明模型跟随鼠标

## 9. 数据流

```
用户操作 → 组件事件 → store action → (service 计算) → state 更新 → 组件重渲染
                                    ↓
                              zundo 自动记录快照
                                    ↓
                              Ctrl+Z → temporal.undo()
```

## 10. 与旧版的关键差异

| 旧版问题 | 新版方案 |
|----------|---------|
| CanvasArea 252 行，混合 UI + 3D + 事件 | 拆成 SceneRoot + 独立子组件 |
| FurnitureItem 270 行，含碰撞+变换+渲染 | FurnitureModel 只渲染，碰撞/变换在 services |
| 键盘事件分散在 3 个组件 | useKeyboard hook 集中管理 |
| 属性面板只读 | PropertyPanel 可输入数值 |
| 无 undo/redo | zundo temporal 中间件 |
| 单房间 | rooms[] 数组，Phase 2 加多房间 |
| 放置时每次重新加载模型算 bbox | asset.ts 上传时缓存 bbox |
| store 单文件 277 行 | 按领域拆 5 个 slice |
