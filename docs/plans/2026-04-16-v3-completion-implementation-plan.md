# V3 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 2 failing topology tests caused by over-aggressive collinear vertex collapse, then merge the V3 branch into develop.

**Architecture:** The collinear collapse in `cleanupTopology` is correct for post-deletion cleanup (e.g., removing a crossing wall leaves a redundant degree-2 vertex) but destroys intentional split boundaries created by `applyDrawWall` when collinear walls partially overlap. The fix makes collapse opt-in via a parameter: `applyDrawWall` disables it (preserves split boundaries), all other callers use the default (collapse enabled).

**Tech Stack:** TypeScript, Vitest

**Worktree:** `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base` (branch `feature/architecture-core-v3-v2base`)

---

### Task 1: Add `collapseCollinear` option to `cleanupTopology`

**Files:**
- Modify: `.worktrees/architecture-core-v3-v2base/src/architecture/topology/cleanup.ts:252-268`

- [ ] **Step 1: Add options parameter to `cleanupTopology`**

Change the function signature and guard the collapse call:

```typescript
export function cleanupTopology(
  document: ArchitectureDocument,
  epsilon = 1e-6,
  options?: { collapseCollinear?: boolean }
): ArchitectureDocument {
  const { collapseCollinear = true } = options ?? {};
  const next = cloneArchitectureDocument(document);
  removeIllegalWalls(next, epsilon);
  removeDuplicateWalls(next);
  let connectivity = buildVertexConnectivity(next);
  removeIsolatedVertices(next, connectivity);
  if (collapseCollinear) {
    collapseSafeCollinearVertices(next, epsilon);
    connectivity = buildVertexConnectivity(next);
    removeIsolatedVertices(next, connectivity);
  }
  next.zones = {};
  next.zoneOrder = [];

  return syncLevelEntityIds(next);
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd D:/3D-Home-Design/.worktrees/architecture-core-v3-v2base && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors in `cleanup.ts`

---

### Task 2: Add `collapseCollinear` option to `repairTopology` and disable in `applyDrawWall`

**Files:**
- Modify: `.worktrees/architecture-core-v3-v2base/src/architecture/topology/repair.ts:69-78` (repairTopology signature)
- Modify: `.worktrees/architecture-core-v3-v2base/src/architecture/topology/repair.ts:66` (applyDrawWall call)

- [ ] **Step 1: Add options parameter to `repairTopology` and pass through to `cleanupTopology`**

```typescript
export function repairTopology(
  document: ArchitectureDocument,
  epsilon = DEFAULT_REPAIR_EPSILON,
  options?: { collapseCollinear?: boolean }
): ArchitectureDocument {
  const splitDocument = splitIntersectingWalls(document, epsilon);
  const mergedDocument = mergeVertices(splitDocument, epsilon);
  const cleanedDocument = cleanupTopology(mergedDocument, epsilon, {
    collapseCollinear: options?.collapseCollinear,
  });

  return rebuildZones(cleanedDocument, epsilon);
}
```

- [ ] **Step 2: Disable collinear collapse in `applyDrawWall`**

Change line 66 from:

```typescript
  return repairTopology(syncLevelEntityIds(next));
```

to:

```typescript
  return repairTopology(syncLevelEntityIds(next), DEFAULT_REPAIR_EPSILON, {
    collapseCollinear: false,
  });
```

- [ ] **Step 3: Run the 2 previously failing tests to verify they now pass**

Run: `cd D:/3D-Home-Design/.worktrees/architecture-core-v3-v2base && npx vitest run src/architecture/topology/__tests__/repair.test.ts --reporter=verbose 2>&1 | tail -25`
Expected: ALL 16 tests pass (0 failures)

- [ ] **Step 4: Run the full test suite to verify no regressions**

Run: `cd D:/3D-Home-Design/.worktrees/architecture-core-v3-v2base && npx vitest run --reporter=verbose 2>&1 | tail -10`
Expected: ALL 187 tests pass (0 failures)

- [ ] **Step 5: Commit**

```bash
cd D:/3D-Home-Design/.worktrees/architecture-core-v3-v2base
git add src/architecture/topology/cleanup.ts src/architecture/topology/repair.ts
git commit -m "fix: make collinear vertex collapse opt-in to preserve split boundaries

applyDrawWall disables collapse so that collinear overlap splits are
preserved as distinct segments. All other callers (removeWall,
moveVertex, deleteVertex) use the default (collapse enabled) to clean
up redundant vertices after structural edits."
```

---

### Task 3: Push unpushed commits

**Files:** none (git operations only)

- [ ] **Step 1: Push all commits to remote**

```bash
cd D:/3D-Home-Design/.worktrees/architecture-core-v3-v2base
git push origin feature/architecture-core-v3-v2base
```

Expected: 14 commits pushed (13 previously unpushed + 1 new fix)

---

### Task 4: Merge V3 into develop

**Files:** none (git operations only)

- [ ] **Step 1: Switch to develop and merge V3 branch**

```bash
cd D:/3D-Home-Design
git merge feature/architecture-core-v3-v2base -m "merge: v3 architecture core into develop"
```

- [ ] **Step 2: Run the full test suite on develop to verify the merge**

Run: `cd D:/3D-Home-Design && npx vitest run 2>&1 | tail -10`
Expected: ALL tests pass

- [ ] **Step 3: Push develop to remote**

```bash
cd D:/3D-Home-Design
git push origin develop
```
