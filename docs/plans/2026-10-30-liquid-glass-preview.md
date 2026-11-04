# Liquid Glass Preview

> Date: 2026-10-30 (recreated 2026-11-04 after lost local WIP)  
> Scope: Landing motion system + shared refracting surface

## Goal

Ship a polished Liquid Glass material for the homepage navbar and Start Designing CTA, with an optional `/liquid-glass` lab route for tuning. Do not rewrite the architecture editor.

## Shared module — `src/app/liquid-glass/`

| Piece | Role |
| --- | --- |
| `LiquidGlass` | Reusable surface (variants: default / navbar / cta / panel) |
| `LiquidGlassCta` | CTA with hover lift, arrow travel, spring press (`motion`) |
| `usePointerHighlight` | Soft radial sheen under the pointer |
| `useDisplacementMap` | ResizeObserver-backed map prep before paint |
| `displacement.ts` | Canvas displacement maps + bounded LRU cache (~32) |
| `liquid-glass.css` | Material tokens; **no wrapper `filter`** |

### Refraction gate

- **Chromium**: optional SVG `feDisplacementMap` refraction layer (sibling overlay — never a CSS `filter` on the backdrop shell).
- **Other engines**: CSS `backdrop-filter: blur + saturate` only.
- `prefers-reduced-transparency`: solid backgrounds, no refraction.
- `prefers-reduced-motion`: disable pointer-highlight tracking and CTA travel/lift.

### Critical fix

Do **not** put `filter` (e.g. `contrast(1.05)`) on `.liquid-glass-wrapper`. A CSS filter on an ancestor creates a containing group that isolates `backdrop-filter` and kills the glass read.

## Homepage behavior

- Navbar + CTA reuse the shared surface; material stays consistent day/night.
- Scroll compaction with hysteresis: expanded ~1280×80 → compact ~900×64; compact at scroll ≥100, expand at ≤48.
- Legibility via **text halo**, not an opaque wash over the glass.
- Mobile: 64px shell + glass menu drawer.
- Day/night + zh/en preferences (`landing-theme.ts` / `landing-locale.ts`), persisted in `localStorage`.
- Night reveal is a color veil only — no `isolation` / ancestor `filter` that would break backdrop sampling.
- Keep brand + nav IA: Gallery / Docs / Experience / Studio.
- Narrower CTA; stronger keyboard focus rings.

## Lab route

- Lazy `/liquid-glass` demo for material / refraction / appearance toggles.

## Validation

- Unit: LandingPage structure, preferences, liquid-glass displacement helpers.
- E2E: `landing-parity`, `landing-preferences`, `liquid-glass` demo route.
- `npm run lint` + targeted vitest.
