# Gallery Docs Experience Studio Navigation Design

## Goal

Replace the current generic landing navigation labels with the approved information architecture: `Gallery / Docs / Experience / Studio`, and align each label to a meaningful landing section.

## Approved Labels

- `Gallery`
- `Docs`
- `Experience`
- `Studio`

## Section Mapping

- `Gallery` -> preview section
- `Docs` -> current feature-card section, but with a docs-oriented anchor id
- `Experience` -> current lower informational section, retitled and re-anchored away from pricing language
- `Studio` -> footer / studio identity area

## Implementation Approach

- Update only the landing navbar labels and href targets.
- Keep the existing page structure, but rename the relevant section ids so the anchors make semantic sense.
- Remove leftover pricing-first language in the section reached by `Experience`.
- Keep test ids stable where possible to avoid unnecessary churn.

## Validation

- Unit tests should assert:
  - the navbar contains `Gallery / Docs / Experience / Studio`
  - the nav anchors point to `#preview / #docs / #experience / #footer`
  - the `Experience` section exists
- Targeted landing e2e should still pass.
- Run `npm run lint` and `npm run build`.
