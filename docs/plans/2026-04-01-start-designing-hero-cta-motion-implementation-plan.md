# Start Designing Hero CTA Motion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the approved demo-style motion treatment to the landing hero `Start Designing` CTA without changing navbar or other buttons.

**Architecture:** Keep the current liquid glass button as the shared base, then add a Hero-only variant that renders dedicated motion layers for ink fill, text inversion, and arrow travel. Drive the change with tests first so the motion structure is explicitly scoped to the hero CTA.

**Tech Stack:** React 19, TypeScript, Tailwind-compatible utility classes, repo CSS in `src/index.css`, Vitest, React DOM test rendering.

---

### Task 1: Lock the Hero CTA structure in tests

**Files:**
- Modify: `src/app/__tests__/LandingPage.test.tsx`

**Step 1: Write the failing test**

Add a test that renders `LandingPage` and asserts:
- the hero CTA has class `hero-liquid-glass-button`
- it contains `.liquid-glass-hero-cta-ink`
- it contains `.liquid-glass-hero-cta-arrow-primary`
- it contains `.liquid-glass-hero-cta-arrow-secondary`
- it contains `.liquid-glass-hero-cta-label`

Add a second assertion that the navbar CTA does not contain the hero-only motion structure.

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/app/__tests__/LandingPage.test.tsx`
Expected: FAIL because the hero-only motion structure does not exist yet.

**Step 3: Commit**

Do not commit yet.

### Task 2: Add a Hero-only button variant

**Files:**
- Modify: `src/app/components/LiquidGlassButton.tsx`
- Modify: `src/app/LandingPage.tsx`

**Step 1: Write minimal implementation**

In `LiquidGlassButton.tsx`:
- add a prop for a hero CTA motion variant
- keep default structure unchanged for non-hero usage
- render hero-only layers with stable class names for testing

In `LandingPage.tsx`:
- pass the hero CTA variant only to the `Start Designing` button

**Step 2: Run test to verify it passes**

Run: `npm run test:unit -- --run src/app/__tests__/LandingPage.test.tsx`
Expected: PASS.

### Task 3: Implement the approved demo-style motion styling

**Files:**
- Modify: `src/index.css`

**Step 1: Write minimal implementation**

Add hero-only CTA CSS for:
- shell sizing and layout
- left ink circle positioning
- independent top glass highlight layer
- label color transition
- dual-arrow motion choreography
- active state scale

Keep selectors scoped under `[data-app-theme='landing']` and `.hero-liquid-glass-button` / hero-only class names.

**Step 2: Run test to verify structure still passes**

Run: `npm run test:unit -- --run src/app/__tests__/LandingPage.test.tsx`
Expected: PASS.

### Task 4: Final verification

**Files:**
- Modify: `src/app/__tests__/LandingPage.test.tsx` (only if expectations need tightening)

**Step 1: Run targeted verification**

Run: `npm run test:unit -- --run src/app/__tests__/LandingPage.test.tsx`
Expected: PASS.

**Step 2: Run broader landing verification**

Run: `npm run test:unit -- --run src/__tests__/App.test.tsx src/app/__tests__/LandingPage.test.tsx`
Expected: PASS.

**Step 3: Review diff**

Run: `git diff -- src/app/components/LiquidGlassButton.tsx src/app/LandingPage.tsx src/index.css src/app/__tests__/LandingPage.test.tsx`
Expected: only hero CTA motion changes and related tests.
