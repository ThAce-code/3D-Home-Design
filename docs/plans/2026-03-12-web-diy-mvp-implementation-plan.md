# Web DIY MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the first productized MVP for a consumer-facing Web home-design tool with authentication, cloud project storage, official/user asset management, versioned 3D sharing, and commentable review pages.

**Architecture:** Keep the existing React + Zustand + R3F editor, but move the source of truth for projects from browser-only persistence to a cloud-backed service. Extend the existing Fastify + PostgreSQL backend from asset-library support into a full application backend with auth, project snapshots, share links, and comments. Keep IndexedDB only as a local cache / draft acceleration layer.

**Tech Stack:** React 19, TypeScript, Zustand, Vite, Fastify, PostgreSQL, `pg`, IndexedDB via `idb`, Vitest, Playwright.

---

## Phase 0: Product baseline and docs alignment

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-03-01-requirements.md`
- Create: `docs/plans/2026-03-12-web-diy-mvp-design.md`
- Create: `docs/plans/2026-03-12-web-diy-mvp-implementation-plan.md`

**Outcome:** The repo reflects the current product direction before feature work starts.

**Verification:**
- Run: `git diff --check`
- Expected: no whitespace errors

---

### Task 1: Add backend schema for users and projects

**Files:**
- Create: `server/migrations/002-auth-and-projects.sql`
- Modify: `server/src/config.ts`
- Modify: `server/src/db.ts`
- Test: `server/migrations/001-init.sql`

**Implement:**
- Create tables for `users`, `sessions`, `projects`, `project_snapshots`
- Add indexes for project owner and update times
- Keep asset tables intact
- Add any required config for session secrets / token expiry

**Verification:**
- Run: `psql $env:DATABASE_URL -f server/migrations/002-auth-and-projects.sql`
- Expected: tables created without errors

---

### Task 2: Add backend schema for sharing and comments

**Files:**
- Modify: `server/migrations/002-auth-and-projects.sql`
- Create: `server/src/routes/shares.ts`
- Create: `server/src/routes/comments.ts`
- Modify: `server/src/index.ts`

**Implement:**
- Add tables for `share_links`, `comments`, and optional `comment_threads`
- Support comment anchoring by `global`, `room`, `item`, or `point`
- Register new Fastify routes for share creation, share fetch, and comment CRUD

**Verification:**
- Run: `npm --prefix server run build`
- Expected: TypeScript compiles successfully

---

### Task 3: Add authentication backend

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/src/lib/auth.ts`
- Create: `server/src/lib/password.ts`
- Modify: `server/src/index.ts`
- Modify: `server/src/config.ts`

**Implement:**
- Add register / login / logout / current-user endpoints
- Use secure password hashing
- Add cookie or bearer-session validation middleware
- Expose authenticated user to protected routes

**Verification:**
- Run: `npm --prefix server run build`
- Expected: build passes with new auth routes wired in

---

### Task 4: Add project CRUD and snapshot APIs

**Files:**
- Create: `server/src/routes/projects.ts`
- Create: `server/src/dto-project.ts`
- Modify: `server/src/index.ts`
- Modify: `server/src/routes/internal.ts`

**Implement:**
- Add APIs for create, list, open, rename, duplicate, delete project
- Add APIs for save draft snapshot and publish shareable snapshot
- Return normalized DTOs for frontend use

**Verification:**
- Run: `npm --prefix server run build`
- Expected: build passes and project routes are registered

---

### Task 5: Add frontend auth state and screens

**Files:**
- Create: `src/types/auth.ts`
- Create: `src/services/authApi.ts`
- Create: `src/store/slices/authSlice.ts`
- Create: `src/components/auth/AuthGate.tsx`
- Create: `src/components/auth/LoginPage.tsx`
- Modify: `src/store/useStore.ts`
- Modify: `src/App.tsx`
- Test: `src/store/__tests__/authSlice.test.ts`

**Implement:**
- Add auth API client and Zustand slice
- Add login/register UI and authenticated app shell gate
- Preserve existing editor routes behind auth

**Verification:**
- Run: `npx vitest run src/store/__tests__/authSlice.test.ts`
- Expected: auth slice tests pass

---

### Task 6: Add frontend project list and cloud persistence layer

**Files:**
- Create: `src/types/project.ts`
- Create: `src/services/projectApi.ts`
- Create: `src/store/slices/projectSlice.ts`
- Create: `src/components/projects/ProjectListPage.tsx`
- Create: `src/components/projects/ProjectToolbar.tsx`
- Modify: `src/hooks/usePersistence.ts`
- Modify: `src/components/overlays/TopActions.tsx`
- Modify: `src/store/useStore.ts`
- Test: `src/__tests__/integration.test.ts`

**Implement:**
- Add project list / open / save / rename / delete flows
- Change persistence strategy from browser-only to cloud-first with local cache fallback
- Keep IndexedDB only for short-lived local restore / optimistic save buffering

**Verification:**
- Run: `npx vitest run src/__tests__/integration.test.ts`
- Expected: existing editor flows still pass after persistence refactor

---

### Task 7: Separate project scene data from asset-library state

**Files:**
- Modify: `src/hooks/usePersistence.ts`
- Modify: `src/store/slices/assetSlice.ts`
- Modify: `src/store/slices/furnitureSlice.ts`
- Modify: `src/types/furniture.ts`
- Test: `src/store/__tests__/furnitureSlice.test.ts`
- Test: `src/__tests__/integration.test.ts`

**Implement:**
- Keep project scene snapshots focused on rooms, items, materials, camera state
- Keep assets loaded from backend library APIs
- Ensure `ProjectItem` persists only `assetId` plus transform/material overrides

**Verification:**
- Run: `npx vitest run src/store/__tests__/furnitureSlice.test.ts src/__tests__/integration.test.ts`
- Expected: item placement and asset lookup remain correct

---

### Task 8: Add sharing APIs and publish flow in editor

**Files:**
- Create: `src/types/share.ts`
- Create: `src/services/shareApi.ts`
- Create: `src/store/slices/shareSlice.ts`
- Create: `src/components/share/PublishDialog.tsx`
- Modify: `src/components/overlays/TopActions.tsx`
- Modify: `src/store/useStore.ts`
- Test: `src/store/__tests__/shareSlice.test.ts`

**Implement:**
- Add publish / update share version flow
- Show generated 3D share URL to project owner
- Add share settings such as comments enabled and optional password flag placeholder

**Verification:**
- Run: `npx vitest run src/store/__tests__/shareSlice.test.ts`
- Expected: publish state transitions pass

---

### Task 9: Build read-only share page

**Files:**
- Create: `src/pages/SharePage.tsx`
- Create: `src/components/share/ShareScene.tsx`
- Create: `src/components/share/ShareSidebar.tsx`
- Modify: `src/main.tsx`
- Modify: `src/services/projectApi.ts`
- Test: `tests/share-page.spec.ts`

**Implement:**
- Add a dedicated read-only scene renderer for published snapshots
- Disable editor-only controls and destructive shortcuts
- Load snapshot version by share token

**Verification:**
- Run: `npm run test:e2e -- --grep share`
- Expected: share page renders published scene and blocks editing

---

### Task 10: Build comments and anchored review UX

**Files:**
- Create: `src/types/comment.ts`
- Create: `src/services/commentApi.ts`
- Create: `src/store/slices/commentSlice.ts`
- Create: `src/components/share/CommentPanel.tsx`
- Create: `src/components/share/CommentAnchor.tsx`
- Modify: `src/pages/SharePage.tsx`
- Modify: `src/store/useStore.ts`
- Test: `src/store/__tests__/commentSlice.test.ts`
- Test: `tests/share-comments.spec.ts`

**Implement:**
- Add anchored comments on items / rooms / scene points / project-level
- Add thread list and reply support
- Keep comments version-bound to published snapshots

**Verification:**
- Run: `npx vitest run src/store/__tests__/commentSlice.test.ts`
- Run: `npm run test:e2e -- --grep comment`
- Expected: comment state tests pass and share comment flow works end-to-end

---

### Task 11: Add official asset operations and user-owned uploads policy

**Files:**
- Modify: `server/src/routes/assets.ts`
- Modify: `server/src/dto.ts`
- Modify: `src/store/slices/assetSlice.ts`
- Modify: `src/components/panels/AssetPanel.tsx`
- Test: `src/__tests__/integration.test.ts`

**Implement:**
- Distinguish official assets vs user-owned uploads in DTOs
- Add ownership metadata and filtering rules
- Keep official assets globally available and user uploads private-by-default

**Verification:**
- Run: `npm --prefix server run build`
- Run: `npx vitest run src/__tests__/integration.test.ts`
- Expected: backend compiles and asset browsing still works

---

### Task 12: Product hardening for MVP launch

**Files:**
- Modify: `src/components/layout/OverlayRoot.tsx`
- Modify: `src/components/overlays/TopActions.tsx`
- Modify: `src/components/panels/AssetPanel.tsx`
- Modify: `server/src/index.ts`
- Create: `docs/plans/launch-checklist.md`

**Implement:**
- Add loading / saving / error UI states
- Add request failure handling and retry affordances
- Add basic backend request logging and rate-limit placeholders
- Write launch checklist for privacy, backups, monitoring, and support flows

**Verification:**
- Run: `npm run lint`
- Run: `npm run build`
- Run: `npm --prefix server run build`
- Expected: frontend and backend compile cleanly

---

## Delivery sequence recommendation

1. Backend schema foundation
2. Authentication
3. Project cloud persistence
4. Share publication model
5. Read-only share page
6. Anchored comments
7. Asset ownership rules
8. Product hardening

## Out of scope for this MVP

- Real-time multi-user editing
- Full PDF / construction drawing export
- AI floor-plan recognition
- Mobile-first editing experience
- Marketplace / commercial brand integrations

## Notes for execution

- Keep migrations additive and reversible where possible
- Preserve existing asset-library behavior while layering new product capabilities on top
- Avoid mixing share-page state with live editor state
- Do not remove IndexedDB entirely until cloud-save fallback behavior is validated
- Add tests around every state boundary: auth, project load/save, publish, and comments
