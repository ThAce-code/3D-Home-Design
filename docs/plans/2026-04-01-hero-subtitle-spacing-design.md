# Hero Subtitle Spacing Design

## Goal

Increase the vertical distance between the landing hero subtitle and the `Start Designing` button by a clearly visible amount without changing the headline rhythm, CTA size, or overall hero alignment.

## Approved Change

- Only adjust the subtitle-to-CTA spacing.
- Do not change:
  - badge-to-headline spacing
  - headline-to-subtitle spacing
  - CTA size or label
  - navbar layout

## Implementation Approach

- Add a dedicated class hook to the hero subtitle.
- Move the larger bottom spacing into landing-specific CSS so the adjustment is explicit and easy to tune later.

## Validation

- Unit test should assert the hero subtitle includes the dedicated spacing hook.
- Run `npm run lint` and `npm run build`.
