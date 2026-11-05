# Liquid Glass preview and landing fixes

## Preview

Run `npm run dev`, then open `/liquid-glass` on the printed local URL.
The demo is a lazy-loaded route separate from the homepage.

- Drag the round and rectangular lenses across text and stripes.
- Open the bottom-right settings panel to adjust refraction, bezel width, dispersion,
  blur and saturation. Toggle refraction to compare against frosted glass.
- Press buttons, switch the segmented control with the pointer or arrow keys,
  and scroll to see the navigation compact and adapt to the dark section.
- The comparison section renders the original broken backdrop root, frost and refraction
  against the same background.

## Implementation

`src/app/liquid-glass/` contains the reusable surface, signed-distance displacement-map
generator, pointer highlight hook and CSS. Refraction uses an SVG displacement map with
optional separate RGB displacements. The current engine gate enables it on Chromium;
other engines use CSS blur and saturation. Browser detection is a compatibility heuristic,
not a guarantee for every browser/GPU combination.

Displacement maps are prepared in a layout effect before first paint. ResizeObserver
commits updated dimensions and maps together before paint instead of invalidating the
filter during resize. The former 120ms resize debounce and 40ms map delay are removed;
a bounded 32-map cache reuses recent spring sizes. Resizing does not enter frost mode.

Reduced motion disables pointer highlight tracking and motion transforms through MotionConfig.
Reduced transparency uses solid backgrounds when the browser supports that media feature.
The homepage navbar and Start Designing CTA now reuse the same refracting component.
The navbar contracts from a maximum 1280px/80px to 900px/64px after scrolling, with a
48/100px hysteresis band. The material remains identical before/after scrolling: no
homepage tint/blur/refraction overrides. It inherits the approved lab defaults (10% white,
3px blur, 36px displacement, 18px bezel, 0.12 dispersion, 1.7 saturation).
Legibility uses a local text halo rather than an opaque surface-wide wash.
Mobile uses a 64px shell and a separate glass menu. The CTA uses a subtle hover lift,
arrow travel and spring press, keeping its label and translucent material stable.
Reduced-motion users get static highlights/press feedback and immediate navbar resizing.
The route and menu actions are preserved. Legacy CTA fill and duplicate animation CSS
have been removed; the original surface CSS remains only for the demo comparison.

Additional homepage fixes:

- Removed the wrapper filter that isolated the backdrop and disabled visible blur.
- Corrected desktop navigation alignment, added a mobile menu, and kept the nav stationary.
- Removed competing press transforms, shortened entrance delays, and respected reduced motion.
- Improved brand/hover text contrast, keyboard focus, and narrow-screen CTA sizing.
- Added a 256px WebP logo (9,704 bytes versus the original 2,939,427-byte PNG).
- Assigned shared React/CommonJS/Vite preload helpers separately so the homepage does not
  eagerly fetch the editor-only Three.js chunk.

## Homepage appearance and language controls

The top navigation now contains a day/night control and a Chinese/English control.
Night mode reveals a dark backdrop from the clicked button's position over 900ms,
with a 700ms sun/moon orbit. The reveal is a sibling of the glass, so it does not
isolate its backdrop. The navbar, mobile menu and CTA use the shared dark tone;
their refraction settings remain unchanged. Reduced motion makes both transitions
immediate. Rapid reversals are supported.

The homepage copy, navigation, accessible labels and image descriptions are localized.
Chinese headings have their own line height and responsive sizing. At narrow widths
the brand retains its logo to make space for all controls. Preferences persist under
`landing-theme` and `landing-locale`; blocked storage leaves the controls functional.
These preferences apply to the homepage, not the editor.

The appearance regression suite checks animated intermediate frames, persistence,
storage failure, rapid reversals, reduced motion and layouts at 320/390/768/1024/1440px.
Final combined run of `landing-preferences.spec.ts`, `landing-parity.spec.ts` and
`liquid-glass.spec.ts`: 23 passed. TypeScript checking and the production build also
passed after the Chinese layout fix. Screenshots are in `test-results/landing-appearance/`.

## Verification

- `npx vitest run`: 51 files / 261 tests passed.
- `npx playwright test tests/e2e/liquid-glass.spec.ts tests/e2e/landing-parity.spec.ts --workers=2`:
  15 tests cover settings/reset, drag, keyboard controls, dark demo nav, reduced motion,
  fallback selection, homepage press/hover, scroll compaction, editor routing, and layouts
  at 320, 390, 768 and 1440px.
- Material parity test normalizes the real lab lens, homepage navbar (expanded/compact),
  and CTA to 300x104 over the same diagnostic backdrop, hides content only, and requires
  identical optics/map data and pixel-identical material screenshots. This isolates material
  parity from differences in the page background and element dimensions.
- A frame-sampling regression asserts that the first rendered frame and subsequent
  contraction/expansion/viewport-resize frames keep the SVG refraction pipeline active.
- A subsequent 320px CTA regression check covers the narrow-screen button fix.
- `npm run lint`, `npm run build`, `git diff --check`.
- Production browser smoke check covers `/`, `/liquid-glass` and `/editor`, verifies no
  eager Three.js request on `/`, and collects page errors/screenshots.

The fallback test changes the user agent in Chromium to exercise our compatibility branch;
it is not native Safari/Firefox rendering verification. Actual acceptance here is Chromium.
The editor chunk still triggers Vite's 500kB size advisory; it loads only when entering the editor.
The existing Three.js duplicate-instance warning appears in two unit-test modules.
