# Initial Bundle Reduction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the editor route out of the landing page's initial bundle and improve Vite chunking so the first-load warning is reduced.

**Architecture:** Replace the static `EditorApp` import in `src/App.tsx` with a lazy route chunk guarded by `Suspense`, and add a minimal loading shell for `/editor`. In `vite.config.ts`, define a small `manualChunks` strategy that separates React, motion, and three/react-three dependencies into predictable bundles.

**Tech Stack:** React 19, Vite 7, Vitest.

---

### Task 1: Write the failing regression test

**Files:**
- Modify: `src/__tests__/App.test.tsx`

**Step 1: Write the failing test**

Update the `/editor` route test to assert:
- an editor loading fallback is visible immediately after render
- the editor shell appears after the lazy module resolves

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/__tests__/App.test.tsx`
Expected: FAIL because `App.tsx` currently renders `EditorApp` synchronously with no fallback.

### Task 2: Implement route lazy loading

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add lazy import and fallback**

Use `React.lazy` for `EditorApp`, wrap the editor route in `Suspense`, and expose a minimal loading shell test id.

**Step 2: Run the route test**

Run: `npm run test:unit -- src/__tests__/App.test.tsx`
Expected: PASS

### Task 3: Add basic manual chunking

**Files:**
- Modify: `vite.config.ts`

**Step 1: Split large vendors**

Add `build.rollupOptions.output.manualChunks` entries for:
- `react` / `react-dom`
- `three` / `@react-three/*`
- `motion`

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS with a smaller main app chunk than before.

### Task 4: Final verification

**Step 1: Typecheck**

Run: `npm run lint`
Expected: PASS

**Step 2: Re-run focused app test**

Run: `npm run test:unit -- src/__tests__/App.test.tsx`
Expected: PASS
