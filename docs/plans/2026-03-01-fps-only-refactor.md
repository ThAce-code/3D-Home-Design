# FPS-Only Interaction Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove orbit camera and edit/fps mode switching. Make the app fully first-person with crosshair-based furniture placement and pointer-lock state machine.

**Architecture:** Remove `interactionMode` ('edit'|'fps') entirely. The camera is always FPS. Pointer lock has two states: locked (playing) and unlocked (paused/UI). When locked, crosshair is visible, WASD moves, mouse looks, left-click places/selects via center-screen raycast. When unlocked, user can interact with HTML panels. Click canvas to re-lock. Left sidebar uses tabs (房间/家具) instead of Build/Decorate mode switch.

**Tech Stack:** React, TypeScript, Zustand+Immer+Zundo, React Three Fiber, @react-three/drei, Vitest, Three.js

---

## Summary of Changes

**Delete files:**
- `src/components/canvas/cameras/OrbitSetup.tsx`

**Modify files (15):**
- `src/types/camera.ts` — remove `InteractionMode`, `AppMode`
- `src/types/index.ts` — remove re-exports of deleted types
- `src/store/slices/cameraSlice.ts` — remove `interactionMode`, `setInteractionMode`
- `src/store/slices/uiSlice.ts` — remove `mode`, `setMode`, `buildTool`, `setBuildTool`; add `activeTab`
- `src/store/__tests__/uiSlice.test.ts` — update tests for new shape
- `src/components/canvas/cameras/FPSControls.tsx` — always active, pointer lock state machine
- `src/components/canvas/FloorPlane.tsx` — remove interactionMode guard
- `src/components/canvas/GhostPreview.tsx` — raycast from screen center (0,0) instead of mouse pointer
- `src/components/canvas/FurnitureModel.tsx` — remove interactionMode guard, always allow click-to-select
- `src/components/canvas/RoomMesh.tsx` — remove interactionMode guard on floor/wall clicks
- `src/components/canvas/BuildGrid.tsx` — remove interactionMode guard
- `src/components/layout/Header.tsx` — remove mode toggle, show pointer lock status
- `src/components/overlays/Crosshair.tsx` — show when pointer locked (not based on interactionMode)
- `src/components/overlays/ModeIndicator.tsx` — simplify, remove mode-based conditions
- `src/App.tsx` — remove mode-based sidebar switching, use activeTab; remove OrbitSetup

**Create files (2):**
- `src/components/panels/SidePanel.tsx` — tabbed panel (房间 + 家具)
- `src/components/overlays/LockOverlay.tsx` — "点击进入" / "点击继续" overlay

---

### Task 0: Update Types

**Files:**
- Modify: `src/types/camera.ts`
- Modify: `src/types/index.ts`

**Step 1: Rewrite camera.ts**

Replace entire file:
```ts
export type ActiveTab = 'rooms' | 'furniture';
export type BuildTool = 'select' | 'draw';
export type TransformTool = 'translate' | 'rotate' | 'scale';
```

**Step 2: Update index.ts**

Replace entire file:
```ts
export type { Room } from './room.js';
export type { Asset, FurnitureItem } from './furniture.js';
export type { ActiveTab, BuildTool, TransformTool } from './camera.js';
```

**Step 3: Run tsc to see expected errors**
Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Many errors — other files still reference deleted types. That's fine, we fix them next.

**Step 4: Commit**
```bash
git add src/types/camera.ts src/types/index.ts
git commit -m "refactor: remove InteractionMode and AppMode types, add ActiveTab"
```

---

### Task 1: Update Store Slices

**Files:**
- Modify: `src/store/slices/cameraSlice.ts`
- Modify: `src/store/slices/uiSlice.ts`
- Modify: `src/store/__tests__/uiSlice.test.ts`

**Step 1: Rewrite cameraSlice.ts**

Remove `interactionMode`, `setInteractionMode`. Rename `pointerLockActive` → `pointerLocked`:
```ts
import type { StateCreator } from 'zustand';

export interface CameraSlice {
  isFlying: boolean;
  pointerLocked: boolean;
  setFlying: (v: boolean) => void;
  setPointerLocked: (v: boolean) => void;
}

export const createCameraSlice: StateCreator<CameraSlice, [['zustand/immer', never]], [], CameraSlice> = (set) => ({
  isFlying: false,
  pointerLocked: false,
  setFlying: (v) => set((s) => { s.isFlying = v; }),
  setPointerLocked: (v) => set((s) => { s.pointerLocked = v; }),
});
```

**Step 2: Rewrite uiSlice.ts**

Remove `mode`/`setMode`/`buildTool`/`setBuildTool`. Add `activeTab`/`setActiveTab`:
```ts
import type { StateCreator } from 'zustand';
import type { ActiveTab, TransformTool } from '../../types/camera.js';

export interface UiSlice {
  activeTab: ActiveTab;
  transformTool: TransformTool;
  setActiveTab: (tab: ActiveTab) => void;
  setTransformTool: (tool: TransformTool) => void;
}

export const createUiSlice: StateCreator<UiSlice, [['zustand/immer', never]], [], UiSlice> = (set) => ({
  activeTab: 'rooms',
  transformTool: 'translate',
  setActiveTab: (tab) => set((s) => { s.activeTab = tab; }),
  setTransformTool: (tool) => set((s) => { s.transformTool = tool; }),
});
```

**Step 3: Update uiSlice test**

Replace entire test file:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';

describe('uiSlice', () => {
  beforeEach(() => { useStore.setState(useStore.getInitialState()); });

  it('default activeTab is rooms', () => {
    expect(useStore.getState().activeTab).toBe('rooms');
  });
  it('setActiveTab switches tab', () => {
    useStore.getState().setActiveTab('furniture');
    expect(useStore.getState().activeTab).toBe('furniture');
  });
  it('setTransformTool changes tool', () => {
    useStore.getState().setTransformTool('rotate');
    expect(useStore.getState().transformTool).toBe('rotate');
  });
});
```

**Step 4: Update useStore.ts** — fix any references to removed slice fields (e.g. `mode`, `interactionMode`, `pointerLockActive`). The combined store type and `partialize` for zundo may reference these. Update accordingly.

**Step 5: Run tests**
Run: `npx vitest run src/store/__tests__/uiSlice.test.ts`
Expected: 3 tests PASS

**Step 6: Commit**
```bash
git add src/store/slices/cameraSlice.ts src/store/slices/uiSlice.ts src/store/__tests__/uiSlice.test.ts src/store/useStore.ts
git commit -m "refactor: simplify store slices, remove interactionMode and appMode"
```

---

### Task 2: Delete OrbitSetup, Rewrite FPSControls

**Files:**
- Delete: `src/components/canvas/cameras/OrbitSetup.tsx`
- Modify: `src/components/canvas/cameras/FPSControls.tsx`
- Modify: `src/hooks/usePointerLock.ts`

**Step 1: Delete OrbitSetup.tsx**
```bash
rm src/components/canvas/cameras/OrbitSetup.tsx
```

**Step 2: Rewrite usePointerLock.ts**

Simplified — reads `pointerLocked` from new store shape:
```ts
import { useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore.js';

export function usePointerLock(canvasRef: React.RefObject<HTMLElement | null>) {
  const setPointerLocked = useStore((s) => s.setPointerLocked);

  const requestLock = useCallback(() => {
    canvasRef.current?.requestPointerLock();
  }, [canvasRef]);

  const exitLock = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  useEffect(() => {
    const onChange = () => {
      setPointerLocked(!!document.pointerLockElement);
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [setPointerLocked]);

  return { requestLock, exitLock };
}
```

**Step 3: Rewrite FPSControls.tsx**

Always active. Uses PointerLockControls from drei. No interactionMode check:
```tsx
import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useStore } from '../../../store/useStore.js';
import * as THREE from 'three';

const SPEED = 5;
const SPRINT_MULT = 2;
const FLY_SPEED = 8;

const _keys = new Set<string>();

export default function FPSControls() {
  const controlsRef = useRef<any>(null);
  const { camera, gl } = useThree();
  const pointerLocked = useStore((s) => s.pointerLocked);
  const isFlying = useStore((s) => s.isFlying);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => _keys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => _keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const onLock = () => useStore.getState().setPointerLocked(true);
    const onUnlock = () => {
      useStore.getState().setPointerLocked(false);
      _keys.clear();
    };
    ctrl.addEventListener('lock', onLock);
    ctrl.addEventListener('unlock', onUnlock);
    return () => {
      ctrl.removeEventListener('lock', onLock);
      ctrl.removeEventListener('unlock', onUnlock);
    };
  }, []);

  useFrame((_, delta) => {
    if (!pointerLocked) return;
    const sprint = _keys.has('ShiftLeft') || _keys.has('ShiftRight');
    const speed = (isFlying ? FLY_SPEED : SPEED) * (sprint ? SPRINT_MULT : 1) * delta;

    const dir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    if (_keys.has('KeyW')) dir.add(forward);
    if (_keys.has('KeyS')) dir.sub(forward);
    if (_keys.has('KeyD')) dir.add(right);
    if (_keys.has('KeyA')) dir.sub(right);
    if (isFlying && _keys.has('Space')) dir.y += 1;
    if (isFlying && (_keys.has('ControlLeft') || _keys.has('ControlRight'))) dir.y -= 1;

    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(speed);
      camera.position.add(dir);
    }

    if (!isFlying && camera.position.y !== 1.7) {
      camera.position.y = 1.7;
    }
  });

  return <PointerLockControls ref={controlsRef} args={[camera, gl.domElement]} />;
}
```

**Step 4: Run tsc**
Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Errors in files that still import OrbitSetup or reference `interactionMode`. We fix those in next tasks.

**Step 5: Commit**
```bash
git add -A
git commit -m "refactor: delete OrbitSetup, rewrite FPSControls as always-active"
```

---

### Task 3: Update Canvas Components (remove interactionMode guards)

**Files:**
- Modify: `src/components/canvas/FloorPlane.tsx`
- Modify: `src/components/canvas/RoomMesh.tsx`
- Modify: `src/components/canvas/BuildGrid.tsx`
- Modify: `src/components/canvas/FurnitureModel.tsx`

**Step 1: Update FloorPlane.tsx**

Remove any `interactionMode` check. Floor click should always work when pointer is locked:
- Remove `useStore((s) => s.interactionMode)` import/usage
- Add `useStore((s) => s.pointerLocked)` — only handle clicks when locked
- Keep the `onFloorClick` callback as-is

**Step 2: Update RoomMesh.tsx**

- Remove `const interactionMode = useStore((s) => s.interactionMode);`
- Remove `if (interactionMode !== 'edit') return;` guards from `handleWallClick` and floor click handler
- Add `const pointerLocked = useStore((s) => s.pointerLocked);` — only handle clicks when locked

**Step 3: Update BuildGrid.tsx**

- Remove `const interactionMode = useStore((s) => s.interactionMode);`
- Remove `const canInteract = interactionMode === 'edit';` and all `canInteract` guards
- Remove `mode` and `buildTool` checks — BuildGrid is always available (rooms tab active = grid visible)
- Add `const activeTab = useStore((s) => s.activeTab);` — only show when `activeTab === 'rooms'`
- Add `const pointerLocked = useStore((s) => s.pointerLocked);` — only handle drag when locked

**Step 4: Update FurnitureModel.tsx**

- Remove any `interactionMode` references
- Click-to-select should work when pointer is locked

**Step 5: Run tsc**
Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Fewer errors now. Remaining errors in overlays, Header, App.

**Step 6: Commit**
```bash
git add src/components/canvas/FloorPlane.tsx src/components/canvas/RoomMesh.tsx src/components/canvas/BuildGrid.tsx src/components/canvas/FurnitureModel.tsx
git commit -m "refactor: remove interactionMode guards from canvas components"
```

---

### Task 4: Update GhostPreview (center-screen raycast)

**Files:**
- Modify: `src/components/canvas/GhostPreview.tsx`
- Modify: `src/hooks/useFloorRaycast.ts`

**Step 1: Update useFloorRaycast.ts**

Change from mouse pointer to screen center (0,0). This makes the raycast always shoot from the crosshair:
```ts
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const _center = new THREE.Vector2(0, 0);
const _raycaster = new THREE.Raycaster();
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _intersection = new THREE.Vector3();

export function useFloorRaycast() {
  const { camera } = useThree();
  const point = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    _raycaster.setFromCamera(_center, camera);
    const hit = _raycaster.ray.intersectPlane(_floorPlane, _intersection);
    point.current = hit ? _intersection.clone() : null;
  });

  return point;
}
```

**Step 2: Update GhostPreview.tsx**

- Remove any `mode` check — ghost shows whenever `selectedAssetId` is set and pointer is locked
- Use `useFloorRaycast()` (now center-screen) for position
- Add max distance check (8m from camera)

**Step 3: Run tsc**
Run: `npx tsc --noEmit 2>&1 | head -10`

**Step 4: Commit**
```bash
git add src/hooks/useFloorRaycast.ts src/components/canvas/GhostPreview.tsx
git commit -m "refactor: GhostPreview uses center-screen raycast for crosshair placement"
```

---

### Task 5: Create SidePanel (tabbed), Update Header

**Files:**
- Create: `src/components/panels/SidePanel.tsx`
- Modify: `src/components/layout/Header.tsx`

**Step 1: Create SidePanel.tsx**

Tabbed panel combining RoomPanel and AssetPanel:
```tsx
import { useStore } from '../../store/useStore.js';
import type { ActiveTab } from '../../types/camera.js';
import RoomPanel from './RoomPanel.js';
import AssetPanel from './AssetPanel.js';

const tabs: { value: ActiveTab; label: string }[] = [
  { value: 'rooms', label: '房间' },
  { value: 'furniture', label: '家具' },
];

export default function SidePanel() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-zinc-700">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setActiveTab(t.value)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === t.value
                ? 'text-white border-b-2 border-indigo-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'rooms' ? <RoomPanel /> : <AssetPanel />}
      </div>
    </div>
  );
}
```

**Step 2: Update Header.tsx**

Remove Build/Decorate mode toggle. Keep project name, save/load, undo/redo:
- Remove `const mode = useStore((s) => s.mode);`
- Remove `const setMode = useStore((s) => s.setMode);`
- Remove the mode toggle buttons
- Keep undo/redo/save/load buttons

**Step 3: Run tsc**
Run: `npx tsc --noEmit 2>&1 | head -10`

**Step 4: Commit**
```bash
git add src/components/panels/SidePanel.tsx src/components/layout/Header.tsx
git commit -m "feat: add tabbed SidePanel, remove mode toggle from Header"
```

---

### Task 6: Create LockOverlay, Update Overlays

**Files:**
- Create: `src/components/overlays/LockOverlay.tsx`
- Modify: `src/components/overlays/Crosshair.tsx`
- Modify: `src/components/overlays/ModeIndicator.tsx`
- Modify: `src/components/overlays/Toolbar.tsx`

**Step 1: Create LockOverlay.tsx**

Shows "点击进入" on first load, "点击继续" after ESC:
```tsx
import { useStore } from '../../store/useStore.js';

export default function LockOverlay() {
  const pointerLocked = useStore((s) => s.pointerLocked);

  if (pointerLocked) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer">
      <div className="text-center">
        <p className="text-white text-xl font-medium mb-2">点击进入</p>
        <p className="text-zinc-400 text-sm">WASD 移动 · 鼠标环顾 · ESC 暂停</p>
      </div>
    </div>
  );
}
```

Note: The overlay itself doesn't call requestPointerLock. The canvas click handler (in SceneRoot or the parent div) handles that. When the user clicks the overlay, the click bubbles to the canvas, which triggers pointer lock.

**Step 2: Update Crosshair.tsx**

Show when pointer is locked (not based on interactionMode):
```tsx
import { useStore } from '../../store/useStore.js';

export default function Crosshair() {
  const pointerLocked = useStore((s) => s.pointerLocked);
  if (!pointerLocked) return null;

  return (
    <div className="absolute top-1/2 left-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/70 -translate-y-1/2 mix-blend-difference" />
      <div className="absolute top-0 left-1/2 w-[2px] h-full bg-white/70 -translate-x-1/2 mix-blend-difference" />
    </div>
  );
}
```

**Step 3: Update ModeIndicator.tsx**

Remove `mode` and `buildTool` references. Only show flying indicator and placement hint:
```tsx
import { useStore } from '../../store/useStore.js';

export default function ModeIndicator() {
  const isFlying = useStore((s) => s.isFlying);
  const pointerLocked = useStore((s) => s.pointerLocked);
  const selectedAssetId = useStore((s) => s.selectedAssetId);

  return (
    <>
      {pointerLocked && isFlying && (
        <div className="absolute top-4 left-4 z-10 bg-amber-600/80 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
          飞行模式 (F 切换)
        </div>
      )}
      {pointerLocked && selectedAssetId && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-indigo-600/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm border border-indigo-500/50 pointer-events-none">
          准星对准地面点击放置 · 右键取消
        </div>
      )}
    </>
  );
}
```

**Step 4: Update Toolbar.tsx**

Remove `mode` check — show transform tools whenever pointer is locked and an item is selected:
```tsx
import { useStore } from '../../store/useStore.js';
import type { TransformTool } from '../../types/index.js';

const tools: { value: TransformTool; label: string; key: string }[] = [
  { value: 'translate', label: '移动', key: 'T' },
  { value: 'rotate', label: '旋转', key: 'R' },
  { value: 'scale', label: '缩放', key: 'S' },
];

export default function Toolbar() {
  const selectedItemId = useStore((s) => s.selectedItemId);
  const transformTool = useStore((s) => s.transformTool);
  const setTransformTool = useStore((s) => s.setTransformTool);

  if (!selectedItemId) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 shadow-xl">
      {tools.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => setTransformTool(t.value)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            transformTool === t.value ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 5: Run tsc**
Run: `npx tsc --noEmit 2>&1 | head -10`

**Step 6: Commit**
```bash
git add src/components/overlays/LockOverlay.tsx src/components/overlays/Crosshair.tsx src/components/overlays/ModeIndicator.tsx src/components/overlays/Toolbar.tsx
git commit -m "feat: add LockOverlay, update overlays for pointer-lock based display"
```

---

### Task 7: Rewire App.tsx + Update Hotkeys

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/hooks/useGlobalHotkeys.ts`
- Modify: `src/components/panels/PropertyPanel.tsx`

**Step 1: Rewrite App.tsx**

Remove `mode`-based sidebar switching, remove OrbitSetup import, use SidePanel, add LockOverlay. The canvas div should handle pointer lock request on click:
```tsx
import { Suspense } from 'react';
import Header from './components/layout/Header.js';
import AppShell from './components/layout/AppShell.js';
import SceneRoot from './components/canvas/SceneRoot.js';
import BuildGrid from './components/canvas/BuildGrid.js';
import RoomMesh from './components/canvas/RoomMesh.js';
import FloorPlane from './components/canvas/FloorPlane.js';
import FurnitureModel from './components/canvas/FurnitureModel.js';
import GhostPreview from './components/canvas/GhostPreview.js';
import FPSControls from './components/canvas/cameras/FPSControls.js';
import SidePanel from './components/panels/SidePanel.js';
import PropertyPanel from './components/panels/PropertyPanel.js';
import Crosshair from './components/overlays/Crosshair.js';
import ModeIndicator from './components/overlays/ModeIndicator.js';
import Toolbar from './components/overlays/Toolbar.js';
import LockOverlay from './components/overlays/LockOverlay.js';
import { useStore } from './store/useStore.js';
import { autoScale } from './services/asset.js';
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys.js';
import { usePersistence } from './hooks/usePersistence.js';

function SceneContent() {
  const rooms = useStore((s) => s.rooms);
  const items = useStore((s) => s.items);
  const selectedAssetId = useStore((s) => s.selectedAssetId);
  const assets = useStore((s) => s.assets);
  const addItem = useStore((s) => s.addItem);

  const handleFloorClick = (point: [number, number, number]) => {
    if (!selectedAssetId) return;
    const asset = assets.find((a) => a.id === selectedAssetId);
    if (!asset) return;

    let scale: [number, number, number] = [1, 1, 1];
    let baseSize: [number, number, number] | undefined;
    let adjustedY = 0;

    if (asset.bbox) {
      const s = autoScale(asset.bbox);
      scale = [s, s, s];
      baseSize = asset.bbox.size;
      adjustedY = -asset.bbox.min[1] * s;
    }

    addItem(selectedAssetId, [point[0], adjustedY, point[2]], scale, baseSize);
  };

  return (
    <>
      <BuildGrid />
      {rooms.map((room) => (
        <RoomMesh key={room.id} room={room} onFloorClick={handleFloorClick} />
      ))}
      <FloorPlane onFloorClick={handleFloorClick} />
      <Suspense fallback={null}>
        {items.map((item) => (
          <FurnitureModel key={item.id} item={item} />
        ))}
      </Suspense>
      <GhostPreview />
      <FPSControls />
    </>
  );
}

export default function App() {
  useGlobalHotkeys();
  usePersistence();

  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-white">
      <Header />
      <AppShell
        sidebar={<SidePanel />}
        canvas={
          <div className="w-full h-full relative">
            <Crosshair />
            <ModeIndicator />
            <Toolbar />
            <LockOverlay />
            <SceneRoot>
              <SceneContent />
            </SceneRoot>
          </div>
        }
        properties={<PropertyPanel />}
      />
    </div>
  );
}
```

**Step 2: Update useGlobalHotkeys.ts**

Remove `mode === 'decorate'` check for T/R/S. Add F for fly toggle. Remove `interactionMode` references:
```ts
import { useEffect } from 'react';
import { useStore } from '../store/useStore.js';

export function useGlobalHotkeys() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.temporal.getState().undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useStore.temporal.getState().redo();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        const { selectedItemId, removeItem } = useStore.getState();
        if (selectedItemId) removeItem(selectedItemId);
        return;
      }

      if (!isInput) {
        const state = useStore.getState();
        if (e.key === 't' || e.key === 'T') state.setTransformTool('translate');
        if (e.key === 'r' || e.key === 'R') state.setTransformTool('rotate');
        if (e.key === 's' || e.key === 'S') state.setTransformTool('scale');
        if (e.key === 'f' || e.key === 'F') state.setFlying(!state.isFlying);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

**Step 3: Update PropertyPanel.tsx**

Remove `mode !== 'decorate'` check — properties panel always shows when an item is selected:
- Change the empty state message to just "选择一个家具查看属性"
- Remove the `mode` variable entirely

**Step 4: Run tsc**
Run: `npx tsc --noEmit 2>&1`
Expected: Clean (0 errors)

**Step 5: Run all tests**
Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**
```bash
git add -A
git commit -m "feat: complete FPS-only refactor, rewire App with SidePanel and LockOverlay"
```

---

### Task 8: Final Verification

**Step 1: Run tsc**
Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run all tests**
Run: `npx vitest run`
Expected: All tests pass

**Step 3: Manual smoke test checklist**
Run: `npx vite --open` (user runs this manually)

Verify:
- [ ] Page loads, shows "点击进入" overlay
- [ ] Click → pointer locks, crosshair appears, WASD moves
- [ ] ESC → pointer unlocks, overlay shows "点击进入"
- [ ] Left sidebar has 房间/家具 tabs
- [ ] 房间 tab: can add/remove rooms, rooms render as walls
- [ ] 家具 tab: can select furniture, ghost preview follows crosshair
- [ ] Left-click places furniture at crosshair position
- [ ] Click existing furniture → selects it, toolbar appears (移动/旋转/缩放)
- [ ] T/R/S hotkeys switch transform tool
- [ ] Delete key removes selected furniture
- [ ] F toggles flying mode, Space/Shift for up/down
- [ ] Ctrl+Z undo, Ctrl+Y redo
- [ ] Right panel shows properties when furniture selected
- [ ] Data persists after page refresh
