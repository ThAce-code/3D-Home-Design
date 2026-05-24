# Circular Auth Icon Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the landing navbar auth text CTA with a circular amber-glass user icon button that retains the `Sign in / Sign up` accessible label.

**Architecture:** Keep the existing navbar behavior and landing-specific amber-glass CSS, but swap the button content from text to an inline SVG user icon and change the CTA shell to a circular footprint. Preserve the existing accessible button name through `aria-label` instead of visible text.

**Tech Stack:** React 19, Motion, landing CSS, Vitest, Playwright, Vite.

---

### Task 1: Write the failing regression test

**Files:**
- Modify: `src/app/__tests__/LandingPage.test.tsx`

**Step 1: Write the failing test**

Assert that the navbar CTA button:
- includes the circular CTA class hook
- has `aria-label="Sign in / Sign up"`
- contains an element with the dedicated auth icon class hook

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: FAIL because the button still uses the text CTA structure.

### Task 2: Implement the circular icon CTA

**Files:**
- Modify: `src/app/components/LiquidGlassNavbar.tsx`
- Modify: `src/index.css`

**Step 1: Update CTA markup**

Replace the inner text span with an inline SVG icon and add the `aria-label`.

**Step 2: Update CTA styling**

Switch the amber-glass CTA shell from pill sizing to circular sizing and add icon-specific styles.

**Step 3: Run test to verify it passes**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: PASS

### Task 3: Verify integration

**Step 1: Run targeted unit test**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: PASS

**Step 2: Run targeted e2e test**

Run: `npm run test:e2e -- tests/e2e/landing-parity.spec.ts`
Expected: PASS

**Step 3: Typecheck**

Run: `npm run lint`
Expected: PASS

**Step 4: Build**

Run: `npm run build`
Expected: PASS
