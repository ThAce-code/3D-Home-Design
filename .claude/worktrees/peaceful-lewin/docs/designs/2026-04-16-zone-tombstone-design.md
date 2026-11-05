# Zone Tombstone Design

> Goal: Recover zone IDs (and metadata like `kind`/`name`) after break-and-repair cycles
> Status: Approved
> Date: 2026-04-16

## Problem

When a user completes a room (closed wall loop), `rebuildZones` assigns it a zone ID with associated metadata (`kind`, `name`). If the user deletes a wall — breaking the loop — the zone is removed from `document.zones`. When the user redraws the wall to close the loop again, `rebuildZones` has no memory of the previous zone. `matchZones` assigns a fresh ID and the metadata is lost.

## Solution: Zone Tombstones

When a zone is destroyed, move it to a tombstone list with a snapshot of its resolved geometry. On subsequent rebuilds, tombstones are fed into the existing `matchZones` pipeline as additional `previousZones` entries. If a new loop spatially matches a tombstone, the original zone ID and metadata are silently recovered. The tombstone is then consumed (removed from the list).

### Approach Selection

Three approaches were evaluated:

| Approach | Description | Verdict |
|----------|-------------|---------|
| **A. Tombstones as extra `previousZones`** | Append tombstones to the existing matching input | **Selected** |
| B. Dedicated 5th matching phase | Separate phase after the existing 4 | Rejected — duplicates logic for no benefit |
| C. Shadow document | Keep full document snapshot | Rejected — heavy memory cost, overkill |

Approach A was selected because:
- Zero changes to `matchZones` internals (DRY)
- Tombstones naturally fail Phase 1 (stale vertex IDs) and fall to spatial phases — built-in priority filtering
- Lightweight storage (geometry snapshot only)
- Automatic persistence (lives inside `ArchitectureDocument`)

## Data Model

### `ZoneTombstone` (new interface in `zone.ts`)

```typescript
export interface ZoneTombstone {
  id: string;           // original zone ID to recover
  levelId: string;
  kind: ZoneKind;
  name: string | null;
  geometry: {           // resolved at time of death — no vertex ID references
    area: number;
    centroid: [number, number];
    points: Array<[number, number]>;
  };
  signature: string;    // stale, but kept for fast-path when vertex IDs survive
}
```

### `ArchitectureDocument` (one new field)

```typescript
export interface ArchitectureDocument {
  // ... existing fields ...
  zoneTombstones: ZoneTombstone[];
}
```

Key decisions:
- **Geometry is resolved points**, not vertex IDs. The vertices that defined the dead zone may have been deleted or merged.
- **Signature is stored** even though it will usually be stale. It costs nothing and enables fast-path matching in the rare case where a wall is deleted and re-drawn between the exact same vertices.
- **No timestamp/counter.** A FIFO cap (50) handles cleanup.

## Lifecycle in `rebuildZones`

### Current flow

```
1. Clone document
2. Find closed loops
3. Build previousZones from document.zones (living zones)
4. Build loopStates from new loops
5. matchZones(previousZones, nextLoops) → reusedZoneIdByLoopIndex
6. Assemble new zones using matched IDs
7. Return document
```

### New flow (3 new operations marked with ★)

```
1.  Clone document
2.  Find closed loops
3.  Build previousZones from document.zones (living zones)
4.  ★ FEED: Convert tombstones → PreviousZoneMatchInput, append to previousZones
5.  Build loopStates from new loops
6.  matchZones(previousZones + tombstoneInputs, nextLoops) → reusedZoneIdByLoopIndex
7.  Assemble new zones (look up kind/name from living zone OR tombstone)
8.  ★ CREATE: Living zones that disappeared → new tombstones (snapshot geometry)
9.  ★ CONSUME: Tombstones whose IDs were reused → remove from list
10. Carry forward surviving tombstones + new tombstones, apply 50-cap
11. Return document
```

### FEED (step 4)

Each tombstone is converted to `PreviousZoneMatchInput`:

```typescript
const tombstoneInputs: PreviousZoneMatchInput[] = document.zoneTombstones.map((t) => ({
  geometry: t.geometry,
  levelId: t.levelId,
  signature: t.signature,
  zoneId: t.id,
}));
```

These are appended to the living zone inputs and passed to `matchZones`. Tombstone signatures contain old vertex IDs that no longer exist — Phase 1 (signature matching) skips them. They fall through to Phase 2+ (spatial overlap matching), where their stored geometry is compared against new loops.

### CREATE (step 8)

Any living zone whose ID does not appear in `reusedZoneIdByLoopIndex.values()` was destroyed. Snapshot its geometry against the **old** document (before topology changes):

```typescript
const survivingIds = new Set(reusedZoneIdByLoopIndex.values());
const newTombstones: ZoneTombstone[] = [];

for (const zoneId of document.zoneOrder) {
  if (survivingIds.has(zoneId)) continue;
  const zone = document.zones[zoneId];
  if (!zone) continue;

  const geometry = buildBoundaryGeometry(document, zone.boundaryVertexIds, epsilon);
  if (!geometry) continue;

  newTombstones.push({
    id: zone.id,
    levelId: zone.levelId,
    kind: zone.kind,
    name: zone.name,
    geometry: { area: geometry.area, centroid: geometry.centroid, points: geometry.points },
    signature: createBoundarySignature(document, zone.boundaryVertexIds, epsilon),
  });
}
```

Critical: `buildBoundaryGeometry` is called against the old document where the vertices still exist.

### CONSUME (step 9)

Tombstones whose IDs were reused by `matchZones` are removed:

```typescript
const tombstoneIds = new Set(document.zoneTombstones.map((t) => t.id));
const consumedTombstoneIds = new Set(
  [...reusedZoneIdByLoopIndex.values()].filter((id) => tombstoneIds.has(id))
);

const survivingTombstones = document.zoneTombstones.filter(
  (t) => !consumedTombstoneIds.has(t.id)
);
```

### Metadata recovery (step 7)

When assembling new zones, look up kind/name from living zones first, tombstones second:

```typescript
const tombstoneById = new Map(document.zoneTombstones.map((t) => [t.id, t]));

const previousZone = reusableZoneId ? previousZoneById.get(reusableZoneId) : null;
const tombstone = reusableZoneId ? tombstoneById.get(reusableZoneId) : null;

next.zones[zoneId] = {
  id: zoneId,
  levelId: loop.levelId,
  boundaryVertexIds: loop.canonicalBoundaryVertexIds,
  kind: previousZone?.kind ?? tombstone?.kind ?? 'unknown',
  name: previousZone?.name ?? tombstone?.name ?? null,
};
```

### GC cap (step 10)

```typescript
const MAX_TOMBSTONES = 50;
const allTombstones = [...survivingTombstones, ...newTombstones];
next.zoneTombstones = allTombstones.length > MAX_TOMBSTONES
  ? allTombstones.slice(-MAX_TOMBSTONES)
  : allTombstones;
```

Oldest tombstones (front of array) are evicted first.

## Document Utility Changes

### `createEmptyArchitectureDocument()`

Initialize with empty array:

```typescript
zoneTombstones: [],
```

### `cloneArchitectureDocument()`

Deep-copy tombstones including nested geometry points:

```typescript
zoneTombstones: document.zoneTombstones.map((t) => ({
  ...t,
  geometry: {
    ...t.geometry,
    points: t.geometry.points.map((p) => [...p] as [number, number]),
  },
})),
```

### `syncLevelEntityIds()`

No changes. Tombstones are document-level, not level-scoped.

## File Changelist

| File | Change |
|------|--------|
| `src/architecture/domain/zone.ts` | Add `ZoneTombstone` interface, export it |
| `src/architecture/domain/document.ts` | Add `zoneTombstones` field to `ArchitectureDocument`, update `createEmptyArchitectureDocument` and `cloneArchitectureDocument` |
| `src/architecture/topology/zones.ts` | Update `rebuildZones` with FEED/CREATE/CONSUME logic, add `MAX_TOMBSTONES` constant |
| `src/architecture/topology/__tests__/zones.test.ts` | New tests for tombstone lifecycle |
| `src/architecture/domain/__tests__/document.test.ts` | Test that clone deep-copies tombstones |

**Files explicitly NOT changed:**
- `zoneMatcher.ts` — matching logic is untouched
- `useArchitecturePersistence.ts` — tombstones persist automatically inside the document
- `ZoneMeshes.tsx` — reads `document.zones`, not tombstones
- `ZonePropertyPanel.tsx` — reads from living zones only
- `persistence.ts` — legacy furniture store, unrelated

## Testing Strategy

### Test 1: Break-and-repair recovery

Create a rectangular zone. Record its ID. Delete one wall (zone dies). Redraw the wall (zone reappears). Assert same ID, same `kind`, same `name`.

### Test 2: Tombstone does not interfere with living zones

Two zones exist. Delete a wall from zone A (tombstoned). Zone B untouched. Redraw zone A's wall. Assert zone A recovered its ID, zone B's ID unchanged throughout.

### Test 3: GC cap enforcement

Programmatically create 51 tombstones. Assert only 50 survive, oldest evicted.
