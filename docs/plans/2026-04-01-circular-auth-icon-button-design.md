# Circular Auth Icon Button Design

## Goal

Replace the landing navbar `Sign in / Sign up` text CTA with a circular amber-glass user icon button that matches the provided demo more closely while preserving accessibility and the existing navbar balance.

## Approved Direction

- Use a circular button, not a pill.
- Inline the user icon SVG directly in the navbar component.
- Keep the restrained amber-glass material language already introduced for the auth CTA.
- Preserve `aria-label="Sign in / Sign up"` so the button still reads correctly to assistive tech and tests.

## Visual Language

- Fixed circular footprint around `52px`
- Semi-transparent amber glass shell
- Light backdrop blur
- Inner highlight and darker inner depth
- Diagonal sheen overlay
- White stroked user icon with a small shadow
- Hover lift plus a subtle icon scale-up

## Constraints

- Do not alter the navbar layout beyond the CTA footprint change.
- Keep the icon centered and readable on bright backgrounds.
- Avoid introducing a separate icon asset file; inline SVG is sufficient.

## Validation

- Unit test should confirm the CTA button has:
  - the circular auth button hook
  - the accessible label
  - the dedicated icon hook
- Targeted landing e2e test should still pass via button role/name.
- Run `npm run lint` and `npm run build`.
