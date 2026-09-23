# Landing First Screen Balance Design

## Goal

Tighten the landing page first screen so it reads as a clean hero instead of a hero plus feature grid. The navigation should feel more left-weighted toward the brand, the top-right CTA should switch to authentication language, and the hero text stack should feel more compact and deliberate.

## Approved Changes

### Navigation

- Push the center nav link group further left until the visual gap between `Facility Design` and `Gallery` is about `1.5x` the width of the word `Gallery`.
- Keep the current glass navbar shell and brand treatment.
- Keep the nav links black by default and champagne gold on hover/focus.
- Change the right CTA text from `Launch Editor` to `Sign in / Sign up`.

### Hero

- Keep the badge, headline, subheadline, and primary CTA.
- Reduce the vertical spacing between:
  - badge and headline
  - headline and subheadline
  - subheadline and `Start Designing`
- Preserve the current headline wording and liquid-glass CTA.

### First-Screen Composition

- Remove the three feature cards from the first viewport.
- The safest implementation is to move the feature-card section below the preview section instead of trying to tune viewport-dependent spacing.
- The first viewport should read as:
  - glass navbar
  - hero badge
  - main headline
  - supporting copy
  - primary CTA

## Implementation Approach

- Keep the existing React component structure.
- Apply the nav offset with landing-specific CSS hooks rather than rewriting the navbar grid.
- Update the navbar CTA copy in `LiquidGlassNavbar.tsx`.
- Reorder the `landing-features` section in `LandingPage.tsx` so it appears after the preview section.
- Tighten hero spacing by adjusting the existing Tailwind utility classes on the hero section, heading, paragraph, and CTA wrapper.

## Validation

- Unit tests should confirm:
  - the navbar CTA text is `Sign in / Sign up`
  - the nav link group uses the stronger left-bias class
  - the feature section renders after the preview section in DOM order
- Existing landing tests should still pass.
- Run `npm run lint` and `npm run build`.
