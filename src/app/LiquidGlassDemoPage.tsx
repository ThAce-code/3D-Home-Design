import { useMemo, useState } from 'react';
import { LiquidGlass, LiquidGlassCta, isChromiumEngine } from './liquid-glass/index.js';
import type { LiquidGlassAppearance } from './liquid-glass/index.js';
import { navigateTo } from './router.js';

export default function LiquidGlassDemoPage() {
  const [appearance, setAppearance] = useState<LiquidGlassAppearance>('day');
  const [refraction, setRefraction] = useState(true);
  const chromium = useMemo(() => isChromiumEngine(), []);

  return (
    <div
      data-testid="liquid-glass-demo"
      data-app-theme="landing"
      data-landing-appearance={appearance}
      className="relative min-h-screen overflow-hidden bg-surface px-6 py-16 font-body text-on-surface"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            appearance === 'night'
              ? 'radial-gradient(circle at 30% 20%, #1d3a38 0%, #0b1214 55%, #070b0c 100%)'
              : 'radial-gradient(circle at 30% 20%, #ffe7c2 0%, #e8f7f6 45%, #f7f9fb 100%)',
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-label uppercase tracking-widest text-secondary">Lab</p>
            <h1 className="mt-2 text-4xl font-bold font-headline">Liquid Glass</h1>
            <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
              Material playground for the shared refracting surface. Chromium engines can enable SVG
              displacement refraction; other engines fall back to blur/saturation.
            </p>
          </div>
          <button type="button" className="landing-pref-button landing-pref-button-label" onClick={() => navigateTo('/')}>
            ← Landing
          </button>
        </header>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="landing-pref-button landing-pref-button-label"
            data-testid="demo-appearance-toggle"
            onClick={() => setAppearance((value) => (value === 'day' ? 'night' : 'day'))}
          >
            Appearance: {appearance}
          </button>
          <button
            type="button"
            className="landing-pref-button landing-pref-button-label"
            data-testid="demo-refraction-toggle"
            onClick={() => setRefraction((value) => !value)}
          >
            Refraction: {refraction ? 'on' : 'off'}
          </button>
          <span className="landing-pref-button landing-pref-button-label pointer-events-none opacity-80">
            Engine: {chromium ? 'Chromium refraction eligible' : 'CSS blur fallback'}
          </span>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <LiquidGlass variant="panel" appearance={appearance} refraction={refraction} className="min-h-48 w-full p-8" testId="demo-glass-panel">
            <div className="flex flex-col items-start gap-2 text-left">
              <strong className="font-headline text-xl">Panel surface</strong>
              <span className="text-sm opacity-80">
                Pointer sheen + optional edge refraction. Reduced motion disables highlight tracking;
                reduced transparency swaps in solid fills.
              </span>
            </div>
          </LiquidGlass>

          <LiquidGlass variant="navbar" appearance={appearance} refraction={refraction} className="min-h-24 w-full px-6" testId="demo-glass-navbar">
            <div className="flex w-full items-center justify-between gap-4">
              <span className="font-headline text-lg font-bold">Navbar shell</span>
              <span className="text-xs uppercase tracking-widest opacity-70">compact-ready</span>
            </div>
          </LiquidGlass>
        </div>

        <div className="flex justify-center">
          <LiquidGlassCta appearance={appearance} testId="demo-glass-cta" onClick={() => navigateTo('/editor')}>
            Start Designing
          </LiquidGlassCta>
        </div>
      </div>
    </div>
  );
}
