# WallTool V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the single-level architecture editor so wall drawing provides explicit snap/axis/closure feedback and reliably produces closed loops and zones.

**Architecture:** Introduce a dedicated WallTool interaction layer above the existing command/topology pipeline. Keep `reduceArchitectureCommand()` and `repairTopology()` as the commit layer, but move draft-state interpretation, snap ranking, axis locking, and closure feedback into focused editing/geometry modules. UI overlays expose the current constraint state explicitly.

**Tech Stack:** React 19, Zustand, TypeScript, Vitest, Playwright, @react-three/fiber, Three.js

---

### Task 1: Add WallTool V2 interaction model

**Files:**
- Create: `src/architecture/editing/wallTool.ts`
- Modify: `src/architecture/editing/tools.ts`
- Modify: `src/store/architectureEditorStore.ts`
- Test: `src/architecture/editing/__tests__/wallTool.test.ts`

**Step 1: Write the failing test**

Cover:
- default draft state
- `Shift` => axis lock
- `Alt` => snap bypass
- `Tab` => numeric entry mode
- closure preview metadata

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/architecture/editing/__tests__/wallTool.test.ts`
Expected: FAIL because the new tool model does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- `WallToolMode`
- `WallDraftConstraintState`
- helper reducers for mode transitions

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/architecture/editing/__tests__/wallTool.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/architecture/editing/wallTool.ts src/architecture/editing/tools.ts src/store/architectureEditorStore.ts src/architecture/editing/__tests__/wallTool.test.ts
git commit -m "feat: add wall tool v2 interaction state"
```

### Task 2: Add ranked snap and orthogonal constraint helpers

**Files:**
- Create: `src/architecture/geometry/wallDraftSnap.ts`
- Create: `src/architecture/geometry/__tests__/wallDraftSnap.test.ts`
- Modify: `src/architecture/geometry/wallSelection.ts`

**Step 1: Write the failing test**

Cover:
- endpoint snap beats grid snap
- closure candidate beats free point
- `Shift` locks horizontal/vertical
- `Alt` bypasses snap
- visible wall face selection still routes to wall when footprint is near wall

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/architecture/geometry/__tests__/wallDraftSnap.test.ts`
Expected: FAIL because helper does not exist.

**Step 3: Write minimal implementation**

Implement:
- snap candidate scoring
- orthogonal projection helper
- closure candidate detection
- footprint proximity helper reuse

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/architecture/geometry/__tests__/wallDraftSnap.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/architecture/geometry/wallDraftSnap.ts src/architecture/geometry/wallSelection.ts src/architecture/geometry/__tests__/wallDraftSnap.test.ts
git commit -m "feat: add ranked wall draft snapping"
```

### Task 3: Rewire ArchitectureScene to use WallTool V2

**Files:**
- Modify: `src/components/canvas/ArchitectureScene.tsx`
- Modify: `src/architecture/editing/interaction.ts`
- Test: `src/components/canvas/__tests__/ArchitectureScene.test.tsx`
- Test: `src/components/panels/__tests__/ArchitecturePanels.test.tsx`

**Step 1: Write the failing test**

Cover:
- wall draw uses constrained draft point, not raw pointer point
- wall selection still works on visible wall faces
- interior click selects zone when wall ray hit is far-wall occlusion

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/components/canvas/__tests__/ArchitectureScene.test.tsx src/components/panels/__tests__/ArchitecturePanels.test.tsx`
Expected: FAIL on missing constraint-aware behavior.

**Step 3: Write minimal implementation**

Wire:
- draft updates through `wallDraftSnap`
- commit uses snapped/locked endpoint
- wall click disambiguation remains based on ground footprint

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/components/canvas/__tests__/ArchitectureScene.test.tsx src/components/panels/__tests__/ArchitecturePanels.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/canvas/ArchitectureScene.tsx src/architecture/editing/interaction.ts src/components/canvas/__tests__/ArchitectureScene.test.tsx src/components/panels/__tests__/ArchitecturePanels.test.tsx
git commit -m "feat: wire wall tool v2 interactions"
```

### Task 4: Add explicit wall drawing feedback UI

**Files:**
- Create: `src/components/canvas/WallDraftHud.tsx`
- Modify: `src/components/canvas/DraftWallPreview.tsx`
- Modify: `src/components/canvas/ArchitectureScene.tsx`
- Test: `src/components/canvas/__tests__/DraftWallPreview.test.tsx`

**Step 1: Write the failing test**

Cover:
- shows `按墙中线绘制`
- shows `正交锁定`
- shows `释放以闭合`
- shows `按 Tab 输入长度`

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/components/canvas/__tests__/DraftWallPreview.test.tsx`
Expected: FAIL because the HUD is missing.

**Step 3: Write minimal implementation**

Render:
- draft centerline
- closure point highlight
- compact text hints derived from editor store

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/components/canvas/__tests__/DraftWallPreview.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/canvas/WallDraftHud.tsx src/components/canvas/DraftWallPreview.tsx src/components/canvas/ArchitectureScene.tsx src/components/canvas/__tests__/DraftWallPreview.test.tsx
git commit -m "feat: add explicit wall drawing feedback"
```

### Task 5: Strengthen closure reliability regression coverage

**Files:**
- Modify: `src/architecture/topology/__tests__/repair.test.ts`
- Modify: `src/architecture/topology/__tests__/zones.test.ts`
- Modify: `tests/e2e/architecture-zone-debug.spec.ts`

**Step 1: Write the failing test**

Add regressions for:
- visually near-closed corners becoming one loop
- oblique camera zone selection after closure
- visible wall faces still selectable after zone fix

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/architecture/topology/__tests__/repair.test.ts src/architecture/topology/__tests__/zones.test.ts`
Run: `npm run test:e2e -- tests/e2e/architecture-zone-debug.spec.ts`
Expected: At least one new regression fails before implementation is complete.

**Step 3: Write minimal implementation**

Only if tests still expose closure weakness after Tasks 1-4:
- tune snap/closure threshold wiring
- avoid creating near-duplicate terminal vertices on final wall commit

**Step 4: Run test to verify it passes**

Run:
- `npm run test:unit -- --run src/architecture/topology/__tests__/repair.test.ts src/architecture/topology/__tests__/zones.test.ts`
- `npm run test:e2e -- tests/e2e/architecture-zone-debug.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/architecture/topology/__tests__/repair.test.ts src/architecture/topology/__tests__/zones.test.ts tests/e2e/architecture-zone-debug.spec.ts
git commit -m "test: cover wall tool v2 closure regressions"
```

### Task 6: Final verification and docs sync

**Files:**
- Modify: `docs/plans/2026-03-30-walltool-v2-design.md`
- Modify: `docs/plans/2026-03-30-walltool-v2-implementation-plan.md` (only if actual paths or commands changed)

**Step 1: Run targeted verification**

Run:
- `npm run test:unit -- --run src/architecture/editing/__tests__/wallTool.test.ts src/architecture/geometry/__tests__/wallDraftSnap.test.ts src/components/canvas/__tests__/ArchitectureScene.test.tsx src/components/canvas/__tests__/DraftWallPreview.test.tsx src/components/panels/__tests__/ArchitecturePanels.test.tsx src/architecture/topology/__tests__/repair.test.ts src/architecture/topology/__tests__/zones.test.ts`
- `npm run test:e2e -- tests/e2e/architecture-zone-debug.spec.ts`
- `npm run lint`
- `npm run build`

Expected: all green

**Step 2: Manual smoke checklist**

Verify in browser:
- draw a rectangle freely => one zone appears
- hold `Shift` => only horizontal/vertical walls
- near-closure corner => explicit closure hint appears
- click visible wall face => wall panel
- click enclosed floor region => zone panel

**Step 3: Commit**

```bash
git add docs/plans/2026-03-30-walltool-v2-design.md docs/plans/2026-03-30-walltool-v2-implementation-plan.md
git commit -m "docs: finalize wall tool v2 plan"
```
