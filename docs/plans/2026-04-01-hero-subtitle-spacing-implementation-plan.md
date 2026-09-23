# Hero Subtitle Spacing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase the vertical spacing between the landing hero subtitle and the primary CTA by a noticeable amount.

**Architecture:** Keep the existing hero structure and introduce a dedicated landing subtitle spacing hook so the visual adjustment is isolated and testable.

**Tech Stack:** React 19, Tailwind utilities, landing CSS, Vitest, Vite.

---

### Task 1: Write the failing regression test

**Files:**
- Modify: `src/app/__tests__/LandingPage.test.tsx`

**Step 1: Write the failing test**

Assert that the landing hero subtitle element includes a dedicated class hook for the larger CTA spacing.

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: FAIL because the subtitle hook does not exist yet.

### Task 2: Implement the spacing increase

**Files:**
- Modify: `src/app/LandingPage.tsx`
- Modify: `src/index.css`

**Step 1: Add the subtitle spacing hook**

Attach a dedicated class to the hero subtitle paragraph.

**Step 2: Increase the bottom spacing**

Define the larger bottom spacing in landing CSS.

**Step 3: Run test to verify it passes**

Run: `npm run test:unit -- src/app/__tests__/LandingPage.test.tsx`
Expected: PASS

### Task 3: Verify integration

**Step 1: Typecheck**

Run: `npm run lint`
Expected: PASS

**Step 2: Build**

Run: `npm run build`
Expected: PASS
