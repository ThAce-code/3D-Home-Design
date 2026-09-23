# Gallery Docs Experience Studio Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the landing navigation labels and anchors to `Gallery / Docs / Experience / Studio` and align the linked sections with that IA.

**Architecture:** Keep the current landing component structure and implement the IA change with minimal edits: update nav labels and hrefs in `LiquidGlassNavbar.tsx`, rename section ids in `LandingPage.tsx`, and refresh the old pricing section copy to fit the `Experience` label. Tests should be updated first to lock the new labels and anchors before production code changes.

**Tech Stack:** React 19, Motion, Vitest, Playwright, Vite.

---

### Task 1: Write failing regression tests

**Files:**
- Modify: `src/app/__tests__/LandingPage.test.tsx`
- Modify: `tests/e2e/landing-parity.spec.ts`

**Step 1: Write the failing tests**

Assert that:
- the navbar text includes `Gallery`, `Docs`, `Experience`, `Studio`
- the four navbar anchors resolve to `#preview`, `#docs`, `#experience`, `#footer`
- the lower informational section exists at `#experience`

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: FAIL because the current navbar still renders `Features`, `Pricing`, and `About`.

### Task 2: Implement the nav IA update

**Files:**
- Modify: `src/app/components/LiquidGlassNavbar.tsx`
- Modify: `src/app/LandingPage.tsx`

**Step 1: Update nav labels and hrefs**

Change the navbar links to:
- `Gallery` -> `#preview`
- `Docs` -> `#docs`
- `Experience` -> `#experience`
- `Studio` -> `#footer`

**Step 2: Update section ids and copy**

- Rename the feature-card section id to `docs`
- Rename the old pricing section id to `experience`
- Replace pricing-specific copy with experience-oriented wording

**Step 3: Run tests to verify they pass**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: PASS

### Task 3: Verify integration

**Step 1: Run targeted e2e**

Run: `npm run test:e2e -- tests/e2e/landing-parity.spec.ts`
Expected: PASS

**Step 2: Typecheck**

Run: `npm run lint`
Expected: PASS

**Step 3: Build**

Run: `npm run build`
Expected: PASS
