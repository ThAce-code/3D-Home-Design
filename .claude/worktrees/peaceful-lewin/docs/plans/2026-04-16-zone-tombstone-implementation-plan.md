# Zone Tombstone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover zone IDs and metadata (kind, name) after break-and-repair cycles by tombstoning destroyed zones and matching them spatially when loops re-close.

**Architecture:** Add a `ZoneTombstone` type and `zoneTombstones` array to `ArchitectureDocument`. In `rebuildZones`, feed tombstones into the existing `matchZones` pipeline as additional `previousZones` entries. No changes to `matchZones` itself — tombstones naturally fail signature matching (stale vertex IDs) and fall through to spatial overlap phases.

**Tech Stack:** TypeScript, Vitest

**Design spec:** `docs/designs/2026-04-16-zone-tombstone-design.md`

---

## File Structure

| File | Responsibility | Change |
|------|---------------|--------|
| `src/architecture/domain/zone.ts` | Zone and tombstone type definitions | Add `ZoneTombstone` interface |
| `src/architecture/domain/document.ts` | Document model and utilities | Add `zoneTombstones` field, update `createEmptyArchitectureDocument`, `cloneArchitectureDocument` |
| `src/architecture/topology/zones.ts` | Zone rebuild pipeline | Add FEED/CREATE/CONSUME tombstone logic, `MAX_TOMBSTONES` constant |
| `src/architecture/domain/__tests__/document.test.ts` | Document utility tests | Add clone deep-copy test for tombstones |
| `src/architecture/topology/__tests__/zones.test.ts` | Zone rebuild tests | Add tombstone lifecycle tests |

**Files explicitly NOT changed:** `zoneMatcher.ts`, `useArchitecturePersistence.ts`, `ZoneMeshes.tsx`, `ZonePropertyPanel.tsx`, `persistence.ts`

---

## Task 1: Add `ZoneTombstone` type

**Files:**
- Modify: `src/architecture/domain/zone.ts`

- [ ] **Step 1: Add the `ZoneTombstone` interface**

In `src/architecture/domain/zone.ts`, append after the existing `Zone` interface:

```typescript
export interface ZoneTombstone {
  id: string;
  levelId: string;
  kind: ZoneKind;
  name: string | null;
  geometry: {
    area: number;
    centroid: [number, number];
    points: Array<[number, number]>;
  };
  signature: string;
}
```

- [ ] **Step 2: Verify the type compiles**

Run: `npx tsc --noEmit`
Expected: No errors (new interface is additive, nothing references it yet)

- [ ] **Step 3: Commit**

```bash
git add src/architecture/domain/zone.ts
git commit -m "feat(zone): add ZoneTombstone type definition"
```

---

## Task 2: Add `zoneTombstones` to `ArchitectureDocument`

**Files:**
- Modify: `src/architecture/domain/document.ts`
- Modify: `src/architecture/domain/__tests__/document.test.ts`

- [ ] **Step 1: Write the failing test for clone deep-copy**

In `src/architecture/domain/__tests__/document.test.ts`, add a new test after the existing `describe` block:

```typescript
import { describe, expect, it } from 'vitest';
import {
  createEmptyArchitectureDocument,
  cloneArchitectureDocument,
} from '../document';

describe('createEmptyArchitectureDocument', () => {
  it('creates a single empty level with defaults', () => {
    const doc = createEmptyArchitectureDocument();

    expect(doc.levelOrder).toHaveLength(1);
    expect(doc.levels[doc.levelOrder[0]].wallIds).toEqual([]);
  });

  it('initializes zoneTombstones as an empty array', () => {
    const doc = createEmptyArchitectureDocument();

    expect(doc.zoneTombstones).toEqual([]);
  });
});

describe('cloneArchitectureDocument', () => {
  it('deep-copies zoneTombstones without sharing references', () => {
    const original = createEmptyArchitectureDocument();
    original.zoneTombstones = [{
      id: 'tomb-1',
      levelId: original.levelOrder[0],
      kind: 'room',
      name: 'Living Room',
      geometry: {
        area: 12,
        centroid: [2, 1.5],
        points: [[0, 0], [4, 0], [4, 3], [0, 3]],
      },
      signature: 'v1|v2|v3|v4',
    }];

    const cloned = cloneArchitectureDocument(original);

    // Values are equal
    expect(cloned.zoneTombstones).toEqual(original.zoneTombstones);

    // But references are different (deep copy)
    expect(cloned.zoneTombstones).not.toBe(original.zoneTombstones);
    expect(cloned.zoneTombstones[0]).not.toBe(original.zoneTombstones[0]);
    expect(cloned.zoneTombstones[0].geometry).not.toBe(original.zoneTombstones[0].geometry);
    expect(cloned.zoneTombstones[0].geometry.points).not.toBe(original.zoneTombstones[0].geometry.points);
    expect(cloned.zoneTombstones[0].geometry.points[0]).not.toBe(original.zoneTombstones[0].geometry.points[0]);

    // Mutating the clone does not affect the original
    cloned.zoneTombstones[0].geometry.points[0][0] = 999;
    expect(original.zoneTombstones[0].geometry.points[0][0]).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/architecture/domain/__tests__/document.test.ts`
Expected: FAIL — `zoneTombstones` property does not exist on `ArchitectureDocument`

- [ ] **Step 3: Add `zoneTombstones` to the `ArchitectureDocument` interface**

In `src/architecture/domain/document.ts`, update the import and interface:

Change the import on line 4 from:
```typescript
import type { Zone } from './zone.js';
```
to:
```typescript
import type { Zone, ZoneTombstone } from './zone.js';
```

Add `zoneTombstones` to the interface after line 13 (`zoneOrder: string[];`):
```typescript
  zoneTombstones: ZoneTombstone[];
```

- [ ] **Step 4: Update `createEmptyArchitectureDocument`**

In the return statement (around line 34-44), add after `zoneOrder: [],`:
```typescript
    zoneTombstones: [],
```

- [ ] **Step 5: Update `cloneArchitectureDocument`**

In `cloneArchitectureDocument` (around line 47-85), add after `zoneOrder: [...document.zoneOrder],`:
```typescript
    zoneTombstones: document.zoneTombstones.map((tombstone) => ({
      ...tombstone,
      geometry: {
        ...tombstone.geometry,
        centroid: [...tombstone.geometry.centroid] as [number, number],
        points: tombstone.geometry.points.map((point) => [...point] as [number, number]),
      },
    })),
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/architecture/domain/__tests__/document.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 7: Run the full test suite to check nothing is broken**

Run: `npx vitest run`
Expected: All existing tests PASS (the new field is initialized as `[]` everywhere)

- [ ] **Step 8: Commit**

```bash
git add src/architecture/domain/document.ts src/architecture/domain/__tests__/document.test.ts
git commit -m "feat(zone): add zoneTombstones field to ArchitectureDocument"
```

---

## Task 3: Implement tombstone FEED in `rebuildZones`

**Files:**
- Modify: `src/architecture/topology/zones.ts`
- Modify: `src/architecture/topology/__tests__/zones.test.ts`

This task adds the FEED step: tombstones are converted to `PreviousZoneMatchInput` entries and appended to the living zone inputs before calling `matchZones`.

- [ ] **Step 1: Write the failing test for tombstone recovery**

In `src/architecture/topology/__tests__/zones.test.ts`, add inside the existing `describe('rebuildZones', ...)` block, at the end:

```typescript
  it('recovers a zone id from a tombstone when a broken loop is re-closed', () => {
    const closedDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });

    // Build zones for the closed room
    const withZone = rebuildZones(closedDocument);
    expect(withZone.zoneOrder).toHaveLength(1);
    const originalZoneId = withZone.zoneOrder[0];

    // Manually set zone metadata to verify it survives
    withZone.zones[originalZoneId] = {
      ...withZone.zones[originalZoneId],
      kind: 'room',
      name: 'Living Room',
    };

    // Break the loop by removing wall w3
    const broken = { ...withZone };
    delete broken.walls['w3'];
    broken.wallOrder = broken.wallOrder.filter((id) => id !== 'w3');

    // Rebuild — zone should die and become a tombstone
    const withoutZone = rebuildZones(broken);
    expect(withoutZone.zoneOrder).toHaveLength(0);
    expect(withoutZone.zoneTombstones).toHaveLength(1);
    expect(withoutZone.zoneTombstones[0].id).toBe(originalZoneId);

    // Re-close the loop by adding the wall back
    const levelId = withoutZone.levelOrder[0];
    const level = withoutZone.levels[levelId];
    const repaired = { ...withoutZone };
    repaired.walls = {
      ...repaired.walls,
      w3_new: {
        id: 'w3_new',
        levelId,
        startVertexId: 'v3',
        endVertexId: 'v4',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural' as const,
      },
    };
    repaired.wallOrder = [...repaired.wallOrder, 'w3_new'];

    // Rebuild — zone should be recovered from the tombstone
    const recovered = rebuildZones(repaired);
    expect(recovered.zoneOrder).toHaveLength(1);
    expect(recovered.zoneOrder[0]).toBe(originalZoneId);
    expect(recovered.zones[originalZoneId].kind).toBe('room');
    expect(recovered.zones[originalZoneId].name).toBe('Living Room');
    expect(recovered.zoneTombstones).toHaveLength(0);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/architecture/topology/__tests__/zones.test.ts -t "recovers a zone id from a tombstone"`
Expected: FAIL — `zoneTombstones` has length 0 (tombstones are not created yet)

- [ ] **Step 3: Implement the FEED step in `rebuildZones`**

In `src/architecture/topology/zones.ts`, modify the `rebuildZones` function.

First, add the import for `ZoneTombstone` on line 6. Change:
```typescript
import type { Zone } from '../domain/zone.js';
```
to:
```typescript
import type { Zone, ZoneTombstone } from '../domain/zone.js';
```

Then, add `MAX_TOMBSTONES` after `MIN_VALID_ZONE_AREA` on line 11:
```typescript
export const MAX_TOMBSTONES = 50;
```

Now, in the `rebuildZones` function body (starting at line 457), after the loop that builds `previousZones` from living zones (after line 481), add the FEED step:

```typescript
  // FEED: Convert tombstones to match inputs (appended after living zones)
  const tombstoneById = new Map<string, ZoneTombstone>(
    document.zoneTombstones.map((t) => [t.id, t])
  );

  for (const tombstone of document.zoneTombstones) {
    previousZones.push({
      geometry: tombstone.geometry,
      levelId: tombstone.levelId,
      signature: tombstone.signature,
      zoneId: tombstone.id,
    });
  }
```

This step alone won't make the test pass — we also need CREATE and CONSUME. Proceed to Step 4.

- [ ] **Step 4: Implement the CREATE step (dead zones become tombstones)**

After the `matchZones` call (around line 517), and before the zone assembly loop, add:

```typescript
  // CREATE: Living zones that disappeared become tombstones
  const matchedZoneIds = new Set(reusableZoneIdByLoopIndex.values());
  const newTombstones: ZoneTombstone[] = [];

  for (const zoneId of document.zoneOrder) {
    if (matchedZoneIds.has(zoneId)) {
      continue;
    }

    const zone = document.zones[zoneId];

    if (!zone) {
      continue;
    }

    const geometry = buildBoundaryGeometry(document, zone.boundaryVertexIds, epsilon);

    if (!geometry) {
      continue;
    }

    newTombstones.push({
      id: zone.id,
      levelId: zone.levelId,
      kind: zone.kind,
      name: zone.name,
      geometry: {
        area: geometry.area,
        centroid: geometry.centroid,
        points: geometry.points,
      },
      signature: createBoundarySignature(document, zone.boundaryVertexIds, epsilon),
    });
  }
```

- [ ] **Step 5: Update the zone assembly to recover metadata from tombstones**

Replace the zone assembly loop (the `for (const [loopIndex, loop] of loopStates.entries())` block, currently around lines 522-537) with:

```typescript
  for (const [loopIndex, loop] of loopStates.entries()) {
    const reusableZoneId = reusableZoneIdByLoopIndex.get(loopIndex) ?? null;
    const zoneId = reusableZoneId ?? crypto.randomUUID();
    const previousZone = reusableZoneId
      ? previousZoneById.get(reusableZoneId)
      : null;
    const tombstone = reusableZoneId
      ? tombstoneById.get(reusableZoneId)
      : null;

    next.zones[zoneId] = {
      id: zoneId,
      levelId: loop.levelId,
      boundaryVertexIds: loop.canonicalBoundaryVertexIds,
      kind: previousZone?.kind ?? tombstone?.kind ?? 'unknown',
      name: previousZone?.name ?? tombstone?.name ?? null,
    };
    next.zoneOrder.push(zoneId);
  }
```

- [ ] **Step 6: Implement the CONSUME step and GC cap**

After the zone assembly loop, and before the `return syncLevelEntityIds(next);` line, add:

```typescript
  // CONSUME: Remove tombstones that were matched, carry forward the rest
  const consumedTombstoneIds = new Set(
    [...matchedZoneIds].filter((id) => tombstoneById.has(id))
  );
  const survivingTombstones = document.zoneTombstones.filter(
    (t) => !consumedTombstoneIds.has(t.id)
  );

  // GC: Apply FIFO cap
  const allTombstones = [...survivingTombstones, ...newTombstones];
  next.zoneTombstones = allTombstones.length > MAX_TOMBSTONES
    ? allTombstones.slice(-MAX_TOMBSTONES)
    : allTombstones;
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/architecture/topology/__tests__/zones.test.ts -t "recovers a zone id from a tombstone"`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/architecture/topology/zones.ts src/architecture/topology/__tests__/zones.test.ts
git commit -m "feat(zone): implement tombstone FEED/CREATE/CONSUME in rebuildZones"
```

---

## Task 4: Test that tombstones don't interfere with living zones

**Files:**
- Modify: `src/architecture/topology/__tests__/zones.test.ts`

- [ ] **Step 1: Write the test**

Add inside the existing `describe('rebuildZones', ...)` block:

```typescript
  it('does not let a tombstone steal a living zone id', () => {
    // Create two separate rectangular rooms
    const doc = createDocumentWithWalls({
      vertices: [
        // Room A
        { id: 'a1', x: 0, y: 0 },
        { id: 'a2', x: 4, y: 0 },
        { id: 'a3', x: 4, y: 3 },
        { id: 'a4', x: 0, y: 3 },
        // Room B (separate, to the right)
        { id: 'b1', x: 10, y: 0 },
        { id: 'b2', x: 14, y: 0 },
        { id: 'b3', x: 14, y: 3 },
        { id: 'b4', x: 10, y: 3 },
      ],
      walls: [
        { id: 'wa1', startVertexId: 'a1', endVertexId: 'a2' },
        { id: 'wa2', startVertexId: 'a2', endVertexId: 'a3' },
        { id: 'wa3', startVertexId: 'a3', endVertexId: 'a4' },
        { id: 'wa4', startVertexId: 'a4', endVertexId: 'a1' },
        { id: 'wb1', startVertexId: 'b1', endVertexId: 'b2' },
        { id: 'wb2', startVertexId: 'b2', endVertexId: 'b3' },
        { id: 'wb3', startVertexId: 'b3', endVertexId: 'b4' },
        { id: 'wb4', startVertexId: 'b4', endVertexId: 'b1' },
      ],
    });

    const withTwoZones = rebuildZones(doc);
    expect(withTwoZones.zoneOrder).toHaveLength(2);

    const [zoneIdA, zoneIdB] = withTwoZones.zoneOrder;

    // Break room A's loop
    const broken = { ...withTwoZones };
    delete broken.walls['wa3'];
    broken.wallOrder = broken.wallOrder.filter((id) => id !== 'wa3');

    const afterBreak = rebuildZones(broken);
    expect(afterBreak.zoneOrder).toHaveLength(1);
    // Room B is untouched
    expect(afterBreak.zoneOrder[0]).toBe(zoneIdB);
    // Room A is tombstoned
    expect(afterBreak.zoneTombstones).toHaveLength(1);
    expect(afterBreak.zoneTombstones[0].id).toBe(zoneIdA);

    // Re-close room A
    const levelId = afterBreak.levelOrder[0];
    const level = afterBreak.levels[levelId];
    const repaired = { ...afterBreak };
    repaired.walls = {
      ...repaired.walls,
      wa3_new: {
        id: 'wa3_new',
        levelId,
        startVertexId: 'a3',
        endVertexId: 'a4',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural' as const,
      },
    };
    repaired.wallOrder = [...repaired.wallOrder, 'wa3_new'];

    const recovered = rebuildZones(repaired);
    expect(recovered.zoneOrder).toHaveLength(2);
    // Both zones have their original IDs
    expect(recovered.zoneOrder).toContain(zoneIdA);
    expect(recovered.zoneOrder).toContain(zoneIdB);
    // Tombstone was consumed
    expect(recovered.zoneTombstones).toHaveLength(0);
  });
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/architecture/topology/__tests__/zones.test.ts -t "does not let a tombstone steal"`
Expected: PASS (logic already implemented in Task 3)

- [ ] **Step 3: Commit**

```bash
git add src/architecture/topology/__tests__/zones.test.ts
git commit -m "test(zone): verify tombstones don't interfere with living zones"
```

---

## Task 5: Test GC cap enforcement

**Files:**
- Modify: `src/architecture/topology/__tests__/zones.test.ts`

- [ ] **Step 1: Write the test**

Add inside the existing `describe('rebuildZones', ...)` block. Import `MAX_TOMBSTONES` at the top of the file:

```typescript
import { rebuildZones, MAX_TOMBSTONES } from '../zones';
```

Then add the test:

```typescript
  it('evicts the oldest tombstones when exceeding MAX_TOMBSTONES', () => {
    const doc = createEmptyArchitectureDocument();
    const levelId = doc.levelOrder[0];

    // Seed the document with MAX_TOMBSTONES + 1 tombstones
    doc.zoneTombstones = Array.from({ length: MAX_TOMBSTONES + 1 }, (_, index) => ({
      id: `tomb-${index}`,
      levelId,
      kind: 'unknown' as const,
      name: null,
      geometry: {
        area: 1,
        centroid: [index * 10, 0] as [number, number],
        points: [
          [index * 10, 0],
          [index * 10 + 1, 0],
          [index * 10 + 1, 1],
          [index * 10, 1],
        ] as Array<[number, number]>,
      },
      signature: `tomb-sig-${index}`,
    }));

    // Rebuild with no walls — no loops, no matches, just GC
    const result = rebuildZones(doc);

    expect(result.zoneTombstones).toHaveLength(MAX_TOMBSTONES);
    // Oldest (tomb-0) should be evicted, newest (tomb-50) should survive
    expect(result.zoneTombstones[0].id).toBe('tomb-1');
    expect(result.zoneTombstones[MAX_TOMBSTONES - 1].id).toBe(`tomb-${MAX_TOMBSTONES}`);
  });
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/architecture/topology/__tests__/zones.test.ts -t "evicts the oldest tombstones"`
Expected: PASS (GC cap already implemented in Task 3)

- [ ] **Step 3: Commit**

```bash
git add src/architecture/topology/__tests__/zones.test.ts
git commit -m "test(zone): verify tombstone GC cap evicts oldest entries"
```

---

## Task 6: Full regression — run all tests

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS. No regressions in existing zone, topology, or document tests.

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Verify no unintended files were changed**

Run: `git diff --name-only develop`
Expected output should include only:
```
docs/designs/2026-04-16-zone-tombstone-design.md
docs/plans/2026-04-16-zone-tombstone-implementation-plan.md
src/architecture/domain/__tests__/document.test.ts
src/architecture/domain/document.ts
src/architecture/domain/zone.ts
src/architecture/topology/__tests__/zones.test.ts
src/architecture/topology/zones.ts
```
