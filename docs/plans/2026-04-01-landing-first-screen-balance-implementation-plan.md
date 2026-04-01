# Landing First Screen Balance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebalance the landing first screen by moving the nav links closer to the brand, renaming the auth CTA, removing the feature cards from the top viewport, and tightening hero spacing.

**Architecture:** Keep the existing liquid-glass navbar and hero component structure. Implement the behavior with narrow DOM-order, copy, and CSS-spacing changes so the landing page remains stable while the first screen becomes more focused.

**Tech Stack:** React 19, Motion, Tailwind utility classes, landing-specific CSS, Vitest, Vite.

---

### Task 1: Write failing regression tests for the approved first-screen behavior

**Files:**
- Modify: `src/app/__tests__/LandingPage.test.tsx`

**Step 1: Write the failing test**

Add assertions that:
- the navbar auth CTA text is `Sign in / Sign up`
- the navbar link group includes a stronger left-bias class hook
- the `landing-preview` section appears before `landing-features` in document order

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: FAIL because the CTA still says `Launch Editor`, the stronger left-bias class does not exist, and the features section is still above the preview section.

### Task 2: Implement the navbar and first-screen layout changes

**Files:**
- Modify: `src/app/components/LiquidGlassNavbar.tsx`
- Modify: `src/app/LandingPage.tsx`
- Modify: `src/index.css`

**Step 1: Update the navbar CTA copy**

Change the CTA text to `Sign in / Sign up` while preserving the existing button styling and click behavior.

**Step 2: Increase the nav left bias**

Add or update a dedicated left-bias class so the nav links move closer to the brand block without collapsing the layout.

**Step 3: Move the feature cards below the preview section**

Reorder the `landing-features` section so it no longer appears in the first viewport flow.

**Step 4: Tighten hero spacing**

Reduce vertical gaps in the hero stack by editing the existing section, heading, paragraph, and CTA wrapper spacing classes.

**Step 5: Run test to verify it passes**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: PASS

### Task 3: Verify integration

**Files:**
- No additional code changes expected

**Step 1: Typecheck**

Run: `npm run lint`
Expected: PASS

**Step 2: Build**

Run: `npm run build`
Expected: PASS
