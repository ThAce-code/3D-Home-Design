# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the frontend app. Key areas: `src/architecture/` for wall/zone editing core, `src/components/` for React UI and canvas layers, `src/store/` for Zustand state, `src/hooks/` and `src/services/` for shared logic.
- Unit tests live beside code in `src/**/__tests__/` and `src/__tests__/`.
- End-to-end tests live in `tests/e2e/`.
- Static assets are in `public/`. Planning and design docs are in `docs/plans/`.
- Backend asset-library code lives in `server/` with migrations in `server/migrations/`.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite frontend on port `3000`.
- `npm run build` creates a production bundle in `dist/`.
- `npm run lint` runs TypeScript checking via `tsc --noEmit`.
- `npm run test:unit` runs Vitest. Example: `npm run test:unit -- src/architecture/geometry/__tests__/wallMeshes.test.ts`.
- `npm run test:e2e` runs Playwright tests from `tests/e2e/`.
- `npm run dev:server` starts the backend service from `server/`.
- `npm run db:migrate` applies `server/migrations/001-init.sql` using `DATABASE_URL`.

## Coding Style & Naming Conventions
- Use TypeScript and React function components. Prefer 2-space indentation and keep files ASCII unless the file already uses Unicode.
- Use `PascalCase` for React components, `camelCase` for functions/variables, and `kebab-case` for docs such as `docs/plans/2026-03-31-topic.md`.
- Keep architecture logic layered: editing intent in `src/architecture/editing/`, topology in `src/architecture/topology/`, derived geometry in `src/architecture/geometry/`.
- Follow the existing ESLint/TypeScript rules in `eslint.config.js`. There is no separate formatter config, so match surrounding style.

## Testing Guidelines
- Use Vitest for unit/integration coverage and Playwright for browser flows.
- Name tests `*.test.ts`, `*.test.tsx`, or `*.spec.ts`.
- Add targeted regression tests with every bug fix, especially for snapping, topology, zone rebuilding, and wall mesh rendering.
- Prefer focused runs before broad suites, then finish with `npm run lint`.

## Commit & Pull Request Guidelines
- Follow the repository’s commit prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `merge:`.
- Keep commits scoped to one change area. Example: `fix: stabilize wall-body snap for T junctions`.
- PRs should include a short problem statement, the approach taken, tests run, and screenshots/GIFs for canvas or UI changes.
- Link the relevant issue, plan doc, or regression case when applicable.

## Configuration & Safety
- Do not commit secrets. Use `.env.example` as the template and set `DATABASE_URL` locally.
- Major architecture-core work must be implemented in a new worktree under `.worktrees/`, not directly in the root checkout.
- Design and roadmap documents belong in the root `docs/plans/` directory.
- Avoid destructive git commands on a dirty worktree. This repository commonly uses `.worktrees/` for isolated feature work.
