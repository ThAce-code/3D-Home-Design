# Topology Cleanup Stabilization Design

## 1. Context

V3 architecture core is already moving through Milestone 2: topology and identity hardening.
`zone id` reuse has been hardened, but the `repairTopology` cleanup stage is still too coarse.
Current behavior is acceptable for some cases, but split-heavy edits can still leave residual wall/vertex noise that destabilizes later rebuilds.

The current pipeline is:

`splitIntersectingWalls -> mergeVertices -> cleanupTopology -> rebuildZones`

That pipeline shape stays in place for this task.
The work here focuses on making `cleanupTopology` a clear structural normalization stage instead of an ambiguous catch-all pass.

## 2. Problem Statement

The current cleanup behavior is not explicit enough about:

- which post-split residues count as illegal
- which graph fragments are safe to remove
- which collinear cut points are redundant versus semantically meaningful
- why a repaired graph should stop changing after one pass

This creates three practical risks:

- repeated repair can keep reshaping the graph
- split-heavy operations can leave dirty wall or vertex state behind
- later topology, zone extraction, and geometry code must compensate for cleanup ambiguity

## 3. Scope

This task only stabilizes structural cleanup in the topology layer.

In scope:

- remove zero-length walls
- remove walls whose endpoint references are missing
- deduplicate fully duplicate walls
- remove isolated vertices left behind after structural cleanup
- collapse safe redundant collinear split points
- add regression tests proving cleanup produces a stable, clean wall/vertex graph

Out of scope:

- shared-wall face extraction
- expanding V1 simple-loop acceptance
- changing zone matcher policy
- changing mesh or selection behavior
- adding new editor interaction tools
- inferring user intent beyond safe structural graph cleanup

## 4. Goals

- Make post-split cleanup predictable and explainable
- Ensure obviously bad graph residue is removed before zone rebuild
- Keep cleanup conservative enough that tee, cross, and corner structure is preserved
- Improve the odds that one repair pass reaches a stable graph

## 5. Design Principles

### 5.1 Cleanup Is Structural, Not Semantic

`cleanupTopology` is responsible for producing a legal, clean `wall / vertex graph`.
It is not responsible for guessing room meaning, zone continuity, or user intent.

### 5.2 Conservative Over Aggressive

If a graph simplification could plausibly erase a meaningful junction or segment boundary, do not do it in this milestone.
It is better to leave some benign fragmentation than to destroy a valid structure.

### 5.3 Fixed Stage Order

Cleanup should be a sequence of small, explicit passes with stable ordering.
This makes the behavior testable and prevents "just patch another special case" drift.

## 6. Cleanup Stage Definition

`cleanupTopology` should become an ordered structural cleanup phase with five steps.

### 6.1 Remove Illegal Walls

Delete walls that are structurally invalid:

- zero-length walls
- walls whose start vertex is missing
- walls whose end vertex is missing

These walls provide no valid topology information and only contaminate later graph analysis.

### 6.2 Remove Duplicate Walls

Deduplicate walls that represent the same geometric segment:

- same two endpoint ids in the same direction
- same two endpoint ids in reverse direction

Only one wall should survive.
The cleanup phase should not permit multi-copy duplicate segments to survive into later graph analysis.

### 6.3 Rebuild Vertex Connectivity

After invalid and duplicate walls are removed, recompute connectivity from the surviving wall set.
Later cleanup decisions must use this updated graph instead of stale assumptions.

### 6.4 Remove Isolated Vertices

Delete vertices that are no longer referenced by any surviving wall.
These vertices have no structural meaning after wall cleanup and only leave dirty document state.

### 6.5 Collapse Safe Collinear Split Points

Collapse a middle vertex only when all of the following are true:

- the vertex degree is exactly 2
- the two incident walls are collinear
- the two walls share the same `levelId`
- the two walls share the same `thickness`
- the two walls share the same `height`
- the two walls share the same `kind`
- collapsing the middle vertex would simply convert `A-B` and `B-C` into `A-C`

This is intentionally narrow.
The goal is to remove "split residue", not to aggressively simplify the graph.

## 7. What Must Not Be Collapsed

The cleanup phase must not collapse:

- tee junction centers
- cross junction centers
- corners
- any vertex with degree other than 2
- collinear degree-2 vertices whose adjacent wall attributes differ

These structures carry actual topology meaning and must survive cleanup.

## 8. Implementation Shape

The pipeline stays:

`splitIntersectingWalls -> mergeVertices -> cleanupTopology -> rebuildZones`

Implementation focus:

- keep `repair.ts` mostly unchanged
- refactor `cleanup.ts` into explicit helper passes
- add targeted regression tests in `repair.test.ts`
- add zone-safety regressions only if cleanup refactoring risks zone extraction behavior

The expected result is not a new topology architecture.
It is a safer and more legible cleanup phase within the existing V3 boundary.

## 9. Testing Strategy

Primary verification will be fixture-driven topology tests, not manual UI interaction.
Current editor UI does not yet provide reliable edge/vertex editing or polished split/merge interaction flows, so topology acceptance must stay at the kernel level for now.

Required regression coverage:

- removes zero-length walls
- removes duplicate walls
- removes isolated vertices left after cleanup
- collapses redundant collinear split points
- preserves tee junctions
- preserves cross junctions
- preserves corners
- preserves collinear boundaries when adjacent wall attributes differ
- re-running `repairTopology` on an already repaired document does not keep changing output

## 10. Risks

- Over-aggressive collinear collapse could erase meaningful junction structure
- Under-aggressive cleanup could keep leaving dirty graph fragments behind
- Cleanup refactors can unintentionally affect zone extraction if graph ordering changes more than expected

Mitigation:

- keep the collinear collapse rule intentionally strict
- write explicit negative tests for tee, cross, corner, and attribute-mismatch cases
- verify focused topology and zone regressions after the cleanup refactor

## 11. Success Criteria

This task is successful when:

- split-heavy repaired graphs no longer retain obvious garbage edges or vertices
- cleanup behavior can be explained as a fixed ordered pass sequence
- important junction structures are preserved
- a repaired graph is materially closer to idempotent under repeated `repairTopology`

## 12. V4 Manual QA Outline

This is not part of the current implementation scope.
It is the future manual test outline for when V4 interaction tooling exists.

When edit handles and edge/vertex editing become available, manual QA should cover:

- dragging a wall endpoint along a connected graph without creating ghost segments
- inserting a point on an edge and dragging it into a new corner
- deleting a divider wall to trigger merge and verifying room continuity
- drawing a divider wall to trigger split and verifying which room survives
- preview geometry matching committed geometry
- hit-test priority between wall, zone, and edit handles
- undo/redo across split, merge, delete, and restore flows
- checking whether repeated edit-handle nudges keep the repaired graph stable

The point of this outline is to validate interaction logic after Milestone 3 / V4 editing affordances exist.
