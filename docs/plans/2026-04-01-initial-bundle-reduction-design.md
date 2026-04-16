# Initial Bundle Reduction Design

## Goal

Reduce the landing page's initial JavaScript payload so the editor's heavy 3D stack is not shipped in the landing route's first bundle.

## Root Cause

- `src/App.tsx` statically imports both `LandingPage` and `EditorApp`.
- `EditorApp` pulls in `three`, `@react-three/fiber`, `@react-three/drei`, and editor-only modules.
- Because the import is static, landing visitors pay the editor bundle cost up front.

## Approved Approach

- Convert `EditorApp` to a lazy-loaded route chunk with `React.lazy`.
- Wrap the editor route in `Suspense` with a minimal loading shell.
- Add basic `manualChunks` rules in `vite.config.ts` so large vendor groups split more predictably.

## Why This Approach

- Route-level lazy loading addresses the biggest waste immediately.
- A tiny fallback keeps route transitions valid while the editor chunk loads.
- `manualChunks` complements lazy loading by keeping large vendors from collapsing back into one oversized file.

## Validation

- Unit test should confirm `/editor` shows a loading fallback before the editor shell resolves.
- `npm run build` should still pass, and the emitted chunk layout should show the editor split out of the main landing bundle.
