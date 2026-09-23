# Architecture Core Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current room-based building editor with a new single-level wall-graph architecture core that supports wall drawing, topology repair, and zone generation.

**Architecture:** Build a new `src/architecture` domain alongside the existing app shell, keeping old room code intact until the new wall-graph pipeline is stable. Drive implementation through tests first for topology behavior, then connect a minimal R3F scene and editor state, and only after that switch the application shell to the new building editor.

**Tech Stack:** React 19, TypeScript, Zustand, zundo, Vitest, React Three Fiber, Three.js, IndexedDB via `idb`

---

### Task 1: Bootstrap the architecture domain and document store

**Files:**
- Create: `src/architecture/domain/level.ts`
- Create: `src/architecture/domain/vertex.ts`
- Create: `src/architecture/domain/wall.ts`
- Create: `src/architecture/domain/zone.ts`
- Create: `src/architecture/domain/document.ts`
- Create: `src/store/architectureDocumentStore.ts`
- Test: `src/architecture/domain/__tests__/document.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../document';

describe('createEmptyArchitectureDocument', () => {
  it('creates a single empty level with defaults', () => {
    const doc = createEmptyArchitectureDocument();
    expect(doc.levelOrder).toHaveLength(1);
    expect(doc.levels[doc.levelOrder[0]].wallIds).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/architecture/domain/__tests__/document.test.ts`
Expected: FAIL with module or symbol not found.

**Step 3: Write minimal implementation**

Create domain types for `Level`, `Vertex`, `Wall`, `Zone`, and `ArchitectureDocument`. Add `createEmptyArchitectureDocument()` that creates one level with default height and thickness and empty entity maps.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/architecture/domain/__tests__/document.test.ts`
Expected: PASS.

**Step 5: Add the document store**

Create `src/store/architectureDocumentStore.ts` with a Zustand store that holds the architecture document and exposes `resetDocument` and `replaceDocument` actions.

**Step 6: Run the targeted test and typecheck**

Run: `npm run test:unit -- --run src/architecture/domain/__tests__/document.test.ts`
Run: `npm run lint`
Expected: PASS.

**Step 7: Commit**

```bash
git add src/architecture/domain src/store/architectureDocumentStore.ts
git commit -m "feat: bootstrap architecture domain"
```

### Task 2: Add geometry primitives, snapping, and segment intersection tests

**Files:**
- Create: `src/architecture/topology/math.ts`
- Create: `src/architecture/topology/snap.ts`
- Create: `src/architecture/topology/intersections.ts`
- Test: `src/architecture/topology/__tests__/snap.test.ts`
- Test: `src/architecture/topology/__tests__/intersections.test.ts`

**Step 1: Write the failing snap test**

```ts
it('snaps a point to an existing vertex within tolerance', () => {
  const result = snapPointToVertices([1.02, 0], [{ id: 'v1', x: 1, y: 0 }], 0.05);
  expect(result.vertexId).toBe('v1');
});
```

**Step 2: Write the failing intersection test**

```ts
it('returns an intersection for crossing wall segments', () => {
  const hit = intersectSegments([0, 0], [4, 0], [2, -2], [2, 2]);
  expect(hit?.point).toEqual([2, 0]);
});
```

**Step 3: Run tests to verify they fail**

Run: `npm run test:unit -- --run src/architecture/topology/__tests__/snap.test.ts src/architecture/topology/__tests__/intersections.test.ts`
Expected: FAIL.

**Step 4: Write minimal implementation**

Add shared 2D vector math helpers, `snapPointToVertices`, and `intersectSegments`. Keep these modules pure and detached from React or Zustand.

**Step 5: Add edge-case coverage**

Extend tests for no-snap cases, parallel segments, endpoint-touch intersections, and tolerance boundaries.

**Step 6: Run tests and typecheck**

Run: `npm run test:unit -- --run src/architecture/topology/__tests__/snap.test.ts src/architecture/topology/__tests__/intersections.test.ts`
Run: `npm run lint`
Expected: PASS.

**Step 7: Commit**

```bash
git add src/architecture/topology
git commit -m "feat: add architecture topology primitives"
```

### Task 3: Build the topology repair pipeline for wall insertion

**Files:**
- Create: `src/architecture/topology/splitWalls.ts`
- Create: `src/architecture/topology/mergeVertices.ts`
- Create: `src/architecture/topology/cleanup.ts`
- Create: `src/architecture/topology/repair.ts`
- Test: `src/architecture/topology/__tests__/repair.test.ts`
- Modify: `src/architecture/domain/document.ts`

**Step 1: Write the failing repair tests**

```ts
it('splits an existing wall when a crossing wall is inserted', () => {
  const next = applyDrawWall(document, [2, -2], [2, 2]);
  expect(next.wallOrder).toHaveLength(4);
  expect(Object.keys(next.vertices)).toHaveLength(5);
});

it('removes zero-length wall segments during cleanup', () => {
  const next = repairTopology(documentWithDegenerateWall);
  expect(next.wallOrder).toHaveLength(0);
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --run src/architecture/topology/__tests__/repair.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement the repair pipeline in this order:
1. Snap wall endpoints to nearby vertices.
2. Detect intersections against affected walls.
3. Insert intersection vertices.
4. Split crossed walls into legal segments.
5. Merge near-duplicate vertices.
6. Remove zero-length or duplicate walls.

**Step 4: Add regression tests**

Add cases for T-junction insertion, overlapping duplicate walls, and intersection exactly at an existing endpoint.

**Step 5: Run tests and typecheck**

Run: `npm run test:unit -- --run src/architecture/topology/__tests__/repair.test.ts`
Run: `npm run lint`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/architecture/topology src/architecture/domain/document.ts
git commit -m "feat: add wall repair pipeline"
```

### Task 4: Derive loops and zones from the repaired wall graph

**Files:**
- Create: `src/architecture/topology/loops.ts`
- Create: `src/architecture/topology/zones.ts`
- Create: `src/architecture/geometry/floorPolygons.ts`
- Test: `src/architecture/topology/__tests__/zones.test.ts`
- Modify: `src/architecture/topology/repair.ts`

**Step 1: Write the failing zone tests**

```ts
it('creates one zone from a rectangular closed loop', () => {
  const result = rebuildZones(rectangleDocument);
  expect(result.zoneOrder).toHaveLength(1);
  expect(result.zones[result.zoneOrder[0]].boundaryVertexIds).toHaveLength(4);
});

it('removes the zone when the loop is broken', () => {
  const result = rebuildZones(openLoopDocument);
  expect(result.zoneOrder).toEqual([]);
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --run src/architecture/topology/__tests__/zones.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement graph traversal helpers that find closed loops, normalize loop winding, filter invalid/self-intersecting candidates, and build `Zone` entities. Have `repairTopology` rebuild zones after wall updates.

**Step 4: Add regression tests**

Add tests for nested loops, shared-wall invalid cases, and deletion of one wall from a valid rectangle.

**Step 5: Run tests and typecheck**

Run: `npm run test:unit -- --run src/architecture/topology/__tests__/zones.test.ts src/architecture/topology/__tests__/repair.test.ts`
Run: `npm run lint`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/architecture/topology src/architecture/geometry/floorPolygons.ts
git commit -m "feat: derive zones from wall graph"
```

### Task 5: Add editor store, commands, and wall drafting state

**Files:**
- Create: `src/architecture/editing/commands.ts`
- Create: `src/architecture/editing/reducers.ts`
- Create: `src/architecture/editing/tools.ts`
- Create: `src/store/architectureEditorStore.ts`
- Test: `src/architecture/editing/__tests__/commands.test.ts`
- Test: `src/store/__tests__/architectureEditorStore.test.ts`

**Step 1: Write the failing command tests**

```ts
it('dispatches DRAW_WALL through the repair pipeline', () => {
  const next = reduceArchitectureCommand(document, {
    type: 'DRAW_WALL',
    start: [0, 0],
    end: [4, 0],
  });
  expect(next.wallOrder).toHaveLength(1);
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --run src/architecture/editing/__tests__/commands.test.ts src/store/__tests__/architectureEditorStore.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Create command types, a reducer that maps commands into document mutations plus topology repair, and an editor store for active tool, draft wall, hover, selection, snap settings, and tool transitions.

**Step 4: Add editor interaction tests**

Add tests for starting a draft wall, updating the cursor point, and clearing draft state after commit or cancel.

**Step 5: Run tests and typecheck**

Run: `npm run test:unit -- --run src/architecture/editing/__tests__/commands.test.ts src/store/__tests__/architectureEditorStore.test.ts`
Run: `npm run lint`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/architecture/editing src/store/architectureEditorStore.ts src/store/__tests__/architectureEditorStore.test.ts
git commit -m "feat: add architecture editor state"
```

### Task 6: Render the minimal architecture scene in R3F

**Files:**
- Create: `src/architecture/geometry/wallMeshes.ts`
- Create: `src/components/canvas/ArchitectureScene.tsx`
- Create: `src/components/canvas/WallMeshes.tsx`
- Create: `src/components/canvas/ZoneMeshes.tsx`
- Create: `src/components/canvas/DraftWallPreview.tsx`
- Test: `src/components/canvas/__tests__/ArchitectureScene.test.tsx`
- Modify: `src/components/canvas/SceneRoot.tsx`

**Step 1: Write the failing scene test**

```tsx
it('renders wall and zone meshes from the architecture document', () => {
  render(<ArchitectureScene />);
  expect(screen.getByTestId('architecture-scene')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/components/canvas/__tests__/ArchitectureScene.test.tsx`
Expected: FAIL.

**Step 3: Write minimal implementation**

Create geometry helpers that derive renderable wall segments and zone floor shapes from the architecture document. Build `ArchitectureScene`, `WallMeshes`, `ZoneMeshes`, and `DraftWallPreview` with test IDs and no dependency on legacy `RoomMesh`.

**Step 4: Add rendering behavior coverage**

Add tests for draft preview visibility and empty-scene rendering.

**Step 5: Run tests and typecheck**

Run: `npm run test:unit -- --run src/components/canvas/__tests__/ArchitectureScene.test.tsx`
Run: `npm run lint`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/architecture/geometry src/components/canvas src/components/canvas/__tests__
git commit -m "feat: render architecture scene"
```

### Task 7: Wire the new editor into the app shell behind a feature flag

**Files:**
- Create: `src/components/panels/BuildingToolPanel.tsx`
- Create: `src/components/panels/WallPropertyPanel.tsx`
- Create: `src/components/panels/ZonePropertyPanel.tsx`
- Create: `src/hooks/useArchitecturePersistence.ts`
- Test: `src/hooks/__tests__/useArchitecturePersistence.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/LeftPanel.tsx`
- Modify: `src/components/panels/PropertyPanel.tsx`
- Modify: `src/hooks/usePersistence.ts`

**Step 1: Write the failing persistence test**

```ts
it('saves and restores the architecture document', async () => {
  await saveArchitectureDocument(document);
  const restored = await loadArchitectureDocument();
  expect(restored?.levelOrder).toEqual(document.levelOrder);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/hooks/__tests__/useArchitecturePersistence.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add a separate IndexedDB schema for the architecture document, wire a new persistence hook, and expose the new scene behind a temporary feature flag or constant in `App.tsx`. Update the left panel to show building tools when the new mode is enabled, and update the property panel to read wall or zone selection.

**Step 4: Manually verify the shell wiring**

Run: `npm run dev`
Expected: The app loads the new architecture scene, wall drafting works, and the document persists across reloads when the feature flag is enabled.

**Step 5: Run automated verification**

Run: `npm run test:unit -- --run src/hooks/__tests__/useArchitecturePersistence.test.ts`
Run: `npm run lint`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/App.tsx src/components/layout/LeftPanel.tsx src/components/panels src/hooks src/store
git commit -m "feat: wire architecture editor into app shell"
```

### Task 8: Retire legacy room-based building modules after the new editor is stable

**Files:**
- Delete: `src/types/room.ts`
- Delete: `src/services/adjacency.ts`
- Delete: `src/store/slices/roomSlice.ts`
- Delete: `src/components/canvas/RoomMesh.tsx`
- Delete: `src/components/panels/RoomPanel.tsx`
- Modify: `src/store/useStore.ts`
- Modify: `src/components/layout/LeftPanel.tsx`
- Modify: `src/__tests__/integration.test.ts`
- Modify: `src/store/__tests__/roomSlice.test.ts`

**Step 1: Write the failing regression updates**

Update integration and store tests to stop referencing `rooms` and start referencing the new building entry points.

**Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --run src/__tests__/integration.test.ts`
Expected: FAIL due to legacy room assertions.

**Step 3: Remove legacy room modules**

Delete room-specific files, remove room slice composition from `src/store/useStore.ts`, and update shell tests to exercise the new architecture scene and panels.

**Step 4: Run full verification**

Run: `npm run test:unit -- --run`
Run: `npm run lint`
Expected: PASS.

**Step 5: Commit**

```bash
git add src
git commit -m "refactor: remove legacy room building core"
```

## Notes

- Use `superpowers:test-driven-development` discipline for every topology or state-management change.
- Keep the old room system untouched until Task 7 is stable; do not mix partial legacy deletion into earlier tasks.
- Favor pure functions in `src/architecture/topology` and `src/architecture/geometry`; React components should consume derived data, not calculate topology.
- If a task exposes unexpected topology behavior, stop and tighten tests before expanding scope.
