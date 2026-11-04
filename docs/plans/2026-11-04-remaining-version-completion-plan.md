# Remaining Version Completion Plan

> Date: 2026-11-04  
> Branch: `cursor/feat-liquid-glass-bd05`  
> Base: `main` after PR #6 (architecture undo/redo)

## Already landed on main

- V3 architecture core (Level / Vertex / Wall / Zone)
- WallTool V2
- V4 Phase 1–2 professional editing (select, vertex/wall drag, split, numeric entry, multiselect)
- V4 browser acceptance + review fixes
- V4 architecture undo/redo (PR #6)

## Status (2026-11-04)

- PR #6 merged to `main` (architecture undo/redo).
- Sections A–D implemented on `cursor/feat-liquid-glass-bd05`.
- V7+ remains explicitly out of scope.

## This completion pass

### A. Liquid Glass landing motion (lost local WIP, recreate) ✅

- Shared refracting / frosted glass surface for navbar + Start Designing CTA
- Remove backdrop-isolating wrapper filters
- Navbar scroll compaction with hysteresis; mobile menu
- CTA hover lift, arrow travel, spring press; reduced-motion paths
- Day/night appearance + zh/en locale preferences on the homepage
- Optional `/liquid-glass` lab route for material tuning

### B. V4 Phase 3 — remaining edit tools ✅

- **Offset wall**: parallel offset of selected wall(s) by typed/dragged distance
- **Trim / Extend**: shorten or lengthen a wall to meet another wall/axis
- Tool switching in the architecture toolbar; history via existing document commits

### C. V5 — Residential semantics (MVP) ✅

- **Openings** domain: doors/windows attached to walls (position along wall, width, height, sill)
- Place / select / delete openings; mesh cutout or placeholder geometry
- Zone kind/name already exist — expose presets in room properties and keep IDs stable

### D. V6 — Presentation & delivery (MVP) ✅

- Persistent room area / dimension labels in the editor
- Screenshot export (PNG) of the canvas / plan view
- Lightweight plan-export panel entry point

### Out of scope for this pass (V7+)

- Multiplayer collaboration, online asset marketplace, floorplan image import,
  multi-storey / stairs, hosted share-link productization beyond existing server stubs
