# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D interior home design tool built with React + Three.js. Users navigate in first-person (FPS controls), create rooms, upload GLB furniture models, and arrange them in 3D space. All data persists to IndexedDB.

## Commands

```bash
npm run dev          # Dev server on port 3000
npm run build        # Production build (Vite)
npm run lint         # Type checking only (tsc --noEmit)
npm run test:unit    # Unit tests (Vitest, watch mode)
npx vitest run       # Unit tests, single run
npx vitest run src/services/__tests__/room.test.ts  # Single test file
npm run test:e2e     # E2E tests (Playwright, needs dev server running)
```

## Tech Stack

- React 19 + TypeScript 5.9 (strict mode) + Vite 7
- Three.js via React Three Fiber + Drei
- Zustand + Immer for state, Zundo for undo/redo
- Tailwind CSS 4 for styling
- IndexedDB (via `idb`) for persistence
- Vitest (unit) + Playwright (e2e)

## Architecture

### State Management (`src/store/`)

Single Zustand store with 5 slices combined via `immer()` and `temporal()` middleware:

- **roomSlice** — Room CRUD, selection, adjacency map recalculation
- **furnitureSlice** — Furniture item CRUD, selection
- **assetSlice** — Uploaded GLB asset library
- **cameraSlice** — FPS flight mode, pointer lock state
- **uiSlice** — Active dock tab, transform tool mode, dock open/close

Only `rooms` and `items` are tracked by undo/redo (temporal). Persistence auto-saves rooms+items to IndexedDB with 2s debounce.

### Component Layers

- **`src/components/canvas/`** — Three.js/R3F scene: room meshes, furniture models, grid, floor plane, FPS camera. These run inside the R3F Canvas context.
- **`src/components/layout/`** — HTML overlay structure: OverlayRoot, DockBar (bottom tabs), LeftPanel
- **`src/components/panels/`** — Tab content: RoomPanel, AssetPanel, PropertyPanel. MaterialPanel/MeasurePanel/ExportPanel are stubs.
- **`src/components/overlays/`** — HUD elements: crosshair, mode indicator, lock overlay

### Services (`src/services/`)

Pure functions for business logic, no React dependencies:

- **adjacency.ts** — Computes wall overlaps between adjacent rooms (used by RoomMesh to hide shared walls)
- **collision.ts** — AABB overlap detection, room boundary clamping for furniture
- **room.ts** — Room creation with dimension validation (1-50 range)
- **asset.ts** — Bounding box computation, auto-scaling GLB models to ~1.5 units
- **transform.ts** — Quaternion/Euler conversion, 15° rotation snapping
- **persistence.ts** — IndexedDB database `home-design-v2`, single `state` object store

### Hooks (`src/hooks/`)

- **useGlobalHotkeys** — Ctrl+Z/Y undo/redo, T/R/S/Q transform tools, F fly toggle, 1-5 dock tabs, Delete remove
- **useKeyboard** — Tracks pressed keys for FPS movement
- **usePointerLock** — Pointer lock lifecycle management
- **usePersistence** — Auto-save on state changes
- **useFloorRaycast** — Floor intersection for furniture placement

## Key Patterns

- Rooms are axis-aligned boxes defined by `(x, z, width, depth, height)`. Wall adjacency is recomputed on any room change.
- Furniture items store rotation as quaternions. Transform tools (translate/rotate/scale) are toggled via keyboard shortcuts.
- The app uses pointer lock for FPS camera. Alt key temporarily unlocks the cursor for UI interaction.
- Path alias: `@` maps to project root in imports.

## Theme

Dark jade color palette defined in `src/theme.ts`. Panel backgrounds use `#133D2F` with 0.85 alpha, accent color is `#28A375`. Use these theme constants rather than hardcoding colors.

## Documentation

- `docs/plans/2026-03-01-requirements.md` — Feature roadmap with status tracking
- Design docs in `docs/plans/` cover specific features (UI redesign, FPS refactor, etc.)
- Documentation is written in Chinese.
