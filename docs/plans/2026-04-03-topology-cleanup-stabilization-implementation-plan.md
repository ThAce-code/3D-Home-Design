# Topology Cleanup Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `cleanupTopology` a conservative structural cleanup stage that removes post-split wall/vertex garbage without erasing valid junction structure.

**Architecture:** Keep the existing `splitIntersectingWalls -> mergeVertices -> cleanupTopology -> rebuildZones` pipeline. Refactor `cleanupTopology` into explicit ordered passes: illegal wall removal, duplicate wall removal, connectivity rebuild, isolated vertex removal, and safe collinear collapse. Verify the refactor with fixture-driven topology tests and a targeted idempotence check.

**Tech Stack:** TypeScript, Vitest, existing architecture topology/domain modules.

---

### Task 1: Lock the cleanup contract with failing tests

**Files:**
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\repair.test.ts`
- Read: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\cleanup.ts`
- Read: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\domain\document.ts`

**Step 1: Add helper assertions for graph cleanliness**

Add small test helpers near `listNormalizedWallSegments` so tests can assert:

```ts
function listVertexCoordinates(document: ArchitectureDocument): string[] {
  return Object.values(document.vertices)
    .map((vertex) => `${vertex.x},${vertex.y}`)
    .sort();
}

function expectRepairToBeStable(document: ArchitectureDocument) {
  const first = repairTopology(document);
  const second = repairTopology(first);

  expect(listNormalizedWallSegments(second)).toEqual(listNormalizedWallSegments(first));
  expect(listVertexCoordinates(second)).toEqual(listVertexCoordinates(first));
  expect(second.wallOrder).toEqual(first.wallOrder);
}
```

**Step 2: Write failing tests for cleanup-positive cases**

Add tests that should initially fail or expose missing coverage:

```ts
it('removes isolated vertices left behind after duplicate wall cleanup', () => {
  const document = createDocumentWithWalls({
    vertices: [
      { id: 'v1', x: 0, y: 0 },
      { id: 'v2', x: 4, y: 0 },
      { id: 'v3', x: 8, y: 0 },
    ],
    walls: [
      { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      { id: 'w2', startVertexId: 'v2', endVertexId: 'v1' },
    ],
  });

  const next = repairTopology(document);

  expect(listVertexCoordinates(next)).toEqual(['0,0', '4,0']);
});

it('collapses a redundant collinear degree-2 split point', () => {
  const document = createDocumentWithWalls({
    vertices: [
      { id: 'v1', x: 0, y: 0 },
      { id: 'v2', x: 2, y: 0 },
      { id: 'v3', x: 4, y: 0 },
    ],
    walls: [
      { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
    ],
  });

  const next = repairTopology(document);

  expect(listNormalizedWallSegments(next)).toEqual(['0,0->4,0']);
  expect(listVertexCoordinates(next)).toEqual(['0,0', '4,0']);
});
```

**Step 3: Write failing tests for cleanup-negative cases**

Add tests that must keep meaningful structure:

```ts
it('preserves a tee junction center during cleanup', () => {
  const document = createDocumentWithWalls({
    vertices: [
      { id: 'v1', x: 0, y: 0 },
      { id: 'v2', x: 2, y: 0 },
      { id: 'v3', x: 4, y: 0 },
      { id: 'v4', x: 2, y: 2 },
    ],
    walls: [
      { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
      { id: 'w3', startVertexId: 'v2', endVertexId: 'v4' },
    ],
  });

  const next = repairTopology(document);

  expect(listNormalizedWallSegments(next)).toEqual([
    '0,0->2,0',
    '2,0->2,2',
    '2,0->4,0',
  ]);
});

it('does not collapse collinear walls when attributes differ', () => {
  const document = createDocumentWithWalls({
    vertices: [
      { id: 'v1', x: 0, y: 0 },
      { id: 'v2', x: 2, y: 0 },
      { id: 'v3', x: 4, y: 0 },
    ],
    walls: [
      { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
    ],
  });

  document.walls.w2!.thickness = 0.35;

  const next = repairTopology(document);

  expect(listNormalizedWallSegments(next)).toEqual([
    '0,0->2,0',
    '2,0->4,0',
  ]);
});
```

**Step 4: Add the idempotence regression**

Add one explicit test:

```ts
it('does not keep changing a graph after the first repair pass', () => {
  const document = createDocumentWithWalls({
    vertices: [
      { id: 'v1', x: 0, y: 0 },
      { id: 'v2', x: 2, y: 0 },
      { id: 'v3', x: 4, y: 0 },
    ],
    walls: [
      { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
    ],
  });

  expectRepairToBeStable(document);
});
```

**Step 5: Run focused repair tests to verify the gap**

Run: `npm run test:unit -- src/architecture/topology/__tests__/repair.test.ts`

Expected: at least the new collinear-collapse and stability assertions should fail before implementation.

**Step 6: Commit the test-only red state**

```bash
git add src/architecture/topology/__tests__/repair.test.ts
git commit -m "test: capture topology cleanup stabilization regressions"
```

### Task 2: Refactor cleanupTopology into ordered structural passes

**Files:**
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\cleanup.ts`
- Read: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\math.ts`
- Read: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\domain\document.ts`

**Step 1: Introduce small pass helpers instead of one monolithic loop**

Refactor `cleanup.ts` into explicit helpers such as:

```ts
function removeIllegalWalls(...)
function removeDuplicateWalls(...)
function buildVertexDegrees(...)
function removeIsolatedVertices(...)
function collapseSafeCollinearVertices(...)
```

Keep each helper pure over the cloned `next` document where practical.

**Step 2: Implement illegal wall removal**

Minimal target behavior:

```ts
if (!wall || !startVertex || !endVertex) continue;
if (distanceBetweenPoints(...) <= epsilon) continue;
```

This should preserve current behavior while making the pass explicit.

**Step 3: Implement duplicate wall removal as its own pass**

Keep the existing endpoint-pair keying rule, but isolate it:

```ts
function createDuplicateWallKey(startVertexId: string, endVertexId: string, levelId: string): string
```

Survive only the first wall per normalized endpoint pair per level.

**Step 4: Rebuild connectivity from the surviving walls**

Build a map keyed by vertex id:

```ts
Map<string, string[]>
```

where each entry lists wall ids attached to that vertex.

This connectivity map will drive both isolated-vertex deletion and safe collapse checks.

**Step 5: Remove isolated vertices**

After wall filtering, retain only vertices present in the rebuilt connectivity map:

```ts
next.vertices = Object.fromEntries(
  Object.entries(next.vertices).filter(([vertexId]) => connectivity.has(vertexId))
);
```

**Step 6: Implement safe collinear collapse**

Add helpers for:

```ts
function isSafeCollinearCollapseCandidate(...)
function collapseCollinearVertex(...)
```

The candidate rule must require:

- degree exactly `2`
- collinear geometry within `epsilon`
- same `levelId`
- same `thickness`
- same `height`
- same `kind`

The collapse should:

- create one merged wall from the outer endpoints
- preserve the surviving wall id deterministically
- delete the absorbed middle wall
- delete the redundant middle vertex

Do not collapse if any condition is ambiguous.

**Step 7: Re-run connectivity and isolated-vertex cleanup after collapse**

After collinear collapse, rebuild connectivity one more time and prune any newly isolated vertices.
Then clear zones and call `syncLevelEntityIds(next)`.

**Step 8: Run focused repair tests**

Run: `npm run test:unit -- src/architecture/topology/__tests__/repair.test.ts`

Expected: PASS

**Step 9: Commit the cleanup refactor**

```bash
git add src/architecture/topology/cleanup.ts src/architecture/topology/__tests__/repair.test.ts
git commit -m "fix: stabilize topology cleanup after wall splits"
```

### Task 3: Prove the cleanup refactor did not regress zone rebuilds

**Files:**
- Read: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zones.test.ts`
- Read: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zoneMatcher.test.ts`
- Optional Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zones.test.ts`

**Step 1: Run focused topology and zone regressions**

Run: `npm run test:unit -- src/architecture/topology/__tests__/repair.test.ts src/architecture/topology/__tests__/zones.test.ts src/architecture/topology/__tests__/zoneMatcher.test.ts`

Expected: PASS

**Step 2: Run geometry regressions that depend on clean topology**

Run: `npm run test:unit -- src/architecture/geometry/__tests__/zoneMeshes.test.ts src/architecture/geometry/__tests__/zoneSelection.test.ts`

Expected: PASS

**Step 3: Add one zone-safety regression only if the refactor exposes drift**

If any existing zone extraction expectation regresses because wall ordering or collinear collapse changed, add the smallest regression needed in `zones.test.ts`.
Do not add speculative tests if the current suite already covers the behavior.

**Step 4: Commit verification-safe follow-up if tests required updates**

```bash
git add src/architecture/topology/__tests__/zones.test.ts
git commit -m "test: lock topology cleanup zone rebuild safety"
```

Skip this commit if no test changes were necessary.

### Task 4: Final verification

**Files:**
- Read only

**Step 1: Run the agreed topology suite**

Run: `npm run test:unit -- src/architecture/topology/__tests__/repair.test.ts src/architecture/topology/__tests__/zones.test.ts src/architecture/topology/__tests__/zoneMatcher.test.ts`

Expected: PASS

**Step 2: Run dependent geometry verification**

Run: `npm run test:unit -- src/architecture/geometry/__tests__/zoneMeshes.test.ts src/architecture/geometry/__tests__/zoneSelection.test.ts`

Expected: PASS

**Step 3: Run controller/panel smoke only if topology edits touched shared contracts**

Run: `npm run test:unit -- src/components/panels/__tests__/EditorPanelsTheme.test.tsx`

Expected: PASS

Skip if no shared contract changed.

**Step 4: Record the known documentation constraint**

Do not attempt to git-commit `D:\3D-Home-Design\docs\plans\...` from this worktree.
Those docs are intentionally stored outside the worktree repository root, so they can be written but will not appear in this branch's `git status`.

