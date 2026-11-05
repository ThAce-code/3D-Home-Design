# Stable Zone Identity Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `zone id` persist across natural room-editing flows so room identity follows user intent instead of fragile boundary signatures.

**Architecture:** Keep the existing `repairTopology -> rebuildZones` pipeline, but extract zone matching into a dedicated matcher layer that works on stable space snapshots. Match in three passes: exact signature reuse, one-to-one spatial continuity reuse, then conservative split/merge arbitration. Do not rewrite V2 split/merge/cleanup rules; only harden the V3 zone matcher and the debug/UI surfaces that expose it.

**Tech Stack:** TypeScript, Zustand stores, Vitest, React panels, existing architecture topology modules.

---

### Task 1: Clarify Debug Surface Before Matching Work

**Files:**
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\components\panels\ZonePropertyPanel.tsx`
- Test: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\components\panels\__tests__\EditorPanelsTheme.test.tsx`

**Step 1: Write the failing test**

Add a UI assertion that the zone card no longer says `boundary vertices`, and instead uses a less misleading label such as `boundary points` or `raw boundary points`.

```tsx
expect(screen.getByText(/boundary points:/i)).toBeInTheDocument()
expect(screen.queryByText(/boundary vertices:/i)).toBeNull()
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/panels/__tests__/EditorPanelsTheme.test.tsx`
Expected: FAIL because the panel still renders `boundary vertices`.

**Step 3: Write minimal implementation**

Change the label in `ZonePropertyPanel.tsx` only.

```tsx
<p className="text-sm" style={{ color: editorThemeVars.text }}>
  boundary points: {zone.boundaryVertexIds.length}
</p>
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/panels/__tests__/EditorPanelsTheme.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/panels/ZonePropertyPanel.tsx src/components/panels/__tests__/EditorPanelsTheme.test.tsx
git commit -m "chore: clarify zone boundary debug label"
```

### Task 2: Extract a Dedicated Zone Matcher Module

**Files:**
- Create: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\zoneMatcher.ts`
- Create: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zoneMatcher.test.ts`
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\zones.ts`

**Step 1: Write the failing test**

Add unit tests for a matcher API that accepts `previousZones` and `nextLoops` and returns a one-to-one `reusedZoneIdByLoopIndex` map.

```ts
test('reuses the old zone id for a one-to-one overlap match', () => {
  const result = matchZones({
    previousZones: [oldZoneFixture],
    nextLoops: [shiftedLoopFixture],
    epsilon: 1e-6,
  })

  expect(result.reusedZoneIdByLoopIndex.get(0)).toBe('zone-living')
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/architecture/topology/__tests__/zoneMatcher.test.ts`
Expected: FAIL because `matchZones` does not exist.

**Step 3: Write minimal implementation**

Create a pure matcher module and move the current matching helpers out of `zones.ts`.

```ts
export function matchZones(args: MatchZonesArgs): MatchZonesResult {
  return {
    reusedZoneIdByLoopIndex: new Map(),
  }
}
```

Then move in the existing exact-signature reuse and one-to-one overlap logic without changing behavior.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/architecture/topology/zoneMatcher.ts src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/zones.ts
git commit -m "refactor: extract zone matcher from rebuild pipeline"
```

### Task 3: Cover Natural Editing Flows With Red Tests

**Files:**
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zones.test.ts`
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zoneMatcher.test.ts`

**Step 1: Write the failing tests**

Add regression cases for the user behaviors we explicitly want to support:
- delete a wall segment and redraw it with a small shape change but same room body
- turn an 8-sided room into a 10-sided room through local contour edits
- keep the same room id when a room stays closed and most area remains the same
- refuse inheritance when two candidates are too close and ambiguity is high

```ts
test('keeps the same zone id when a local redraw turns an 8-side room into a 10-side room', () => {
  const result = rebuildZones(tenSidedVariant)
  expect(result.zoneOrder[0]).toBe(previousZoneId)
})

test('drops inheritance when two previous rooms overlap a new room too similarly', () => {
  const result = matchZones({ previousZones, nextLoops, epsilon: 1e-6 })
  expect(result.reusedZoneIdByLoopIndex.has(0)).toBe(false)
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts`
Expected: FAIL on the new scenarios.

**Step 3: Write minimal implementation**

Do not broaden behavior yet. Only add the smallest fixture builders and failing expectations.

**Step 4: Run tests to verify the failures are the expected ones**

Run the same command again.
Expected: FAIL because the matcher is still too weak, not because fixtures are malformed.

**Step 5: Commit**

```bash
git add src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts
git commit -m "test: capture natural room-editing identity regressions"
```

### Task 4: Implement Conservative One-to-One Spatial Continuity Matching

**Files:**
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\zoneMatcher.ts`
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\zones.ts`
- Test: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zoneMatcher.test.ts`
- Test: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zones.test.ts`

**Step 1: Write the failing test**

Add or keep a matcher-level test that requires:
- `overlap / oldArea >= 0.6`
- `overlap / newArea >= 0.6`
- same level
- one old zone maps to at most one new loop
- one new loop inherits at most one old zone id

```ts
expect(match.reusedZoneIdByLoopIndex.get(0)).toBe('zone-living')
expect(match.reusedZoneIdByLoopIndex.size).toBe(1)
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/architecture/topology/__tests__/zoneMatcher.test.ts`
Expected: FAIL because the matcher does not yet enforce the full one-to-one policy.

**Step 3: Write minimal implementation**

Implement pass order in `zoneMatcher.ts`:
1. exact signature reuse
2. simplified-collinear signature reuse
3. one-to-one overlap reuse
4. coverage fallback only when exact overlap is unavailable or numerically unstable

Keep thresholds explicit:

```ts
const MIN_ZONE_ID_OVERLAP_RATIO = 0.6
const MIN_AMBIGUITY_GAP_RATIO = 0.1
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/architecture/topology/zoneMatcher.ts src/architecture/topology/zones.ts src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts
git commit -m "fix: match zones by one-to-one spatial continuity"
```

### Task 5: Implement Split Arbitration

**Files:**
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\zoneMatcher.ts`
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zoneMatcher.test.ts`
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zones.test.ts`

**Step 1: Write the failing test**

Add a case where one old room becomes two new rooms. Only the primary child should inherit the old id and semantics.

```ts
test('keeps the old zone id only on the primary child after a split', () => {
  const result = rebuildZones(splitRoomDocument)
  expect(result.zoneOrder).toHaveLength(2)
  expect(result.zoneOrder).toContain(previousZoneId)
  expect(result.zones[previousZoneId]?.name).toBe('Living Room')
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts`
Expected: FAIL because current matching cannot arbitrate split ownership.

**Step 3: Write minimal implementation**

Implement split detection and tie-break order exactly as the design doc says:
1. overlap area largest
2. `overlap / oldArea` larger
3. centroid shift smaller
4. boundary similarity higher
5. if top candidate `< 0.4`, inherit nothing

Reset non-inheriting children to:

```ts
name: null,
kind: 'unknown',
```

**Step 4: Run test to verify it passes**

Run the same command.
Expected: PASS

**Step 5: Commit**

```bash
git add src/architecture/topology/zoneMatcher.ts src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts
git commit -m "fix: preserve only the primary zone identity across splits"
```

### Task 6: Implement Merge Arbitration

**Files:**
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\zoneMatcher.ts`
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zoneMatcher.test.ts`
- Modify: `D:\3D-Home-Design\.worktrees\architecture-core-v3-v2base\src\architecture\topology\__tests__\zones.test.ts`

**Step 1: Write the failing test**

Add a case where two rooms become one. Only one predecessor may donate the surviving id and fields.

```ts
test('keeps only one predecessor id after a merge', () => {
  const result = rebuildZones(mergedRoomDocument)
  expect(result.zoneOrder).toHaveLength(1)
  expect(['zone-a', 'zone-b']).toContain(result.zoneOrder[0])
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts`
Expected: FAIL because merge precedence is not implemented.

**Step 3: Write minimal implementation**

Implement merge arbitration with the design ordering:
1. overlap contribution to new zone largest
2. `overlap / newArea` larger
3. centroid closer
4. stronger adjacency continuity
5. if top contribution `< 0.4`, create a fresh id

**Step 4: Run test to verify it passes**

Run the same command.
Expected: PASS

**Step 5: Commit**

```bash
git add src/architecture/topology/zoneMatcher.ts src/architecture/topology/__tests__/zoneMatcher.test.ts src/architecture/topology/__tests__/zones.test.ts
git commit -m "fix: choose a single surviving zone identity across merges"
```

### Task 7: Full Regression Verification

**Files:**
- Test only

**Step 1: Run focused topology and geometry regressions**

Run:
```bash
npm run test:unit -- src/architecture/topology/__tests__/zones.test.ts src/architecture/topology/__tests__/repair.test.ts src/architecture/geometry/__tests__/zoneMeshes.test.ts src/architecture/geometry/__tests__/zoneSelection.test.ts
```
Expected: PASS

**Step 2: Run controller and editor regression set**

Run:
```bash
npm run test:unit -- src/architecture/editing/__tests__/sceneController.test.ts src/architecture/editing/__tests__/meshController.test.ts src/architecture/editing/__tests__/hotkeyController.test.ts src/architecture/editing/__tests__/propertyController.test.ts src/architecture/editing/__tests__/controllerStores.test.ts src/architecture/editing/__tests__/toolController.test.ts src/components/panels/__tests__/EditorPanelsTheme.test.tsx
```
Expected: PASS

**Step 3: Optional editor parity smoke checks**

Run:
```bash
npm run test:unit -- src/app/__tests__/LandingPage.test.tsx
npm run lint
```
Expected: PASS

**Step 4: Commit final verification-only state if needed**

Do not create a no-op commit. If the worktree is clean except `.claude/settings.json`, stop here.

### Task 8: Post-Implementation Notes

**Files:**
- Modify: `D:\3D-Home-Design\docs\plans\2026-03-31-v3-architecture-core-2-design.md` (only if implementation intentionally changes thresholds or tie-break rules)
- Otherwise: no doc change

**Step 1: Compare implementation to the current design**

If the code still follows:
- one-to-one reuse at `0.6 / 0.6`
- split guard at `0.2` and winner threshold `0.4`
- merge guard at `0.2` and winner threshold `0.4`
- ambiguity bias toward no inheritance

then do not rewrite the design doc.

**Step 2: If thresholds changed, update the design doc with exact values**

Use a tiny targeted doc patch, not a rewrite.

**Step 3: Verify docs did not drift from code**

Run: `rg -n "0.6|0.4|0.2|zone id|split|merge" D:\3D-Home-Design\docs\plans\2026-03-31-v3-architecture-core-2-design.md src/architecture/topology`
Expected: matching thresholds and terminology.
