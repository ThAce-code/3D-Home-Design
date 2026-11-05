import type { SyntheticEvent } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'motion/react';
import LiquidGlassButton from './components/LiquidGlassButton.js';
import LiquidGlassNavbar from './components/LiquidGlassNavbar.js';
import { LandingPreferencesProvider, useLandingPreferences } from './landingPreferences.js';
import './landingAppearance.css';
import { navigateTo } from './router.js';

/**
 * Validation-only demo for the landing copy + motion redesign proposal.
 * Production `/` is untouched — open `/landing-demo`.
 */

const LOGO_FALLBACK =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#26dcd6"/>
          <stop offset="100%" stop-color="#ff9f1c"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="#f7f9fb"/>
      <path d="M28 72 64 38l36 34v22H80V72H48v22H28Z" fill="url(#g)"/>
    </svg>
  `);

const INTERIOR_FALLBACK =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 960">
      <rect width="1440" height="960" fill="#e8eef0"/>
      <rect x="120" y="140" width="1200" height="680" rx="40" fill="#f7f9fb"/>
      <rect x="200" y="220" width="420" height="280" rx="28" fill="#fff" stroke="#26dcd6" stroke-width="8"/>
      <rect x="700" y="220" width="520" height="180" rx="28" fill="#fff" stroke="#ff9f1c" stroke-width="8"/>
    </svg>
  `);

const PLAN_FALLBACK =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
      <rect width="1080" height="1080" fill="#eef2f4"/>
      <rect x="120" y="120" width="840" height="840" rx="36" fill="#fff" stroke="#191c1e" stroke-width="14"/>
      <rect x="220" y="220" width="260" height="260" fill="#52f6ef" fill-opacity="0.25" stroke="#006a66" stroke-width="10"/>
      <rect x="540" y="220" width="320" height="520" fill="#ff9f1c" fill-opacity="0.18" stroke="#683c00" stroke-width="10"/>
    </svg>
  `);

const copy = {
  brand: { en: 'Facility Design', zh: 'Facility Design' },
  title: { en: 'Draw walls. Walk the plan.', zh: '画墙，走进户型' },
  subtitle: {
    en: 'Browser-native floor planning with first-person review.',
    zh: '浏览器里画户型，第一人称走查空间。',
  },
  cta: { en: 'Start Designing', zh: '开始设计' },
  ctaSecondary: { en: 'See the glass', zh: '看液态玻璃' },
  sectionDraw: {
    title: { en: 'Draw', zh: '画墙' },
    body: {
      en: 'Offset, split, and trim without redrawing.',
      zh: '偏移、分割、修剪，不用推倒重画。',
    },
  },
  sectionWalk: {
    title: { en: 'Walk in', zh: '走进去' },
    body: {
      en: 'Lock the pointer and walk the rooms you just drew.',
      zh: '锁定指针，走进刚画好的房间。',
    },
  },
  sectionKeep: {
    title: { en: 'Keep', zh: '留住稿' },
    body: {
      en: 'Edits undo. Plans stay in this browser.',
      zh: '编辑可撤销，方案留在本机浏览器。',
    },
  },
  previewTitle: {
    en: 'From layout to atmosphere.',
    zh: '从户型到氛围。',
  },
  banner: {
    en: 'Validation demo — production / is unchanged',
    zh: '验证 Demo — 线上 / 未改动',
  },
  interiorAlt: {
    en: 'Bright minimal living room',
    zh: '明亮简约客厅',
  },
  planAlt: {
    en: 'Architectural floor plan preview',
    zh: '户型俯视预览',
  },
} as const;

type Locale = 'en' | 'zh';
type Localized = { readonly en: string; readonly zh: string };

function t(locale: Locale, key: keyof typeof copy): string {
  return (copy[key] as Localized)[locale];
}

function applyFallbackImage(event: SyntheticEvent<HTMLImageElement> | Event, fallbackSrc: string) {
  const image = event.currentTarget as HTMLImageElement;
  image.onerror = null;
  image.src = fallbackSrc;
}

const ENTER = { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const };
const SECTION = { type: 'spring' as const, stiffness: 120, damping: 22 };

export default function LandingRedesignDemoPage() {
  return (
    <LandingPreferencesProvider>
      <LandingRedesignDemoContent />
    </LandingPreferencesProvider>
  );
}

function LandingRedesignDemoContent() {
  const { locale, theme, origin } = useLandingPreferences();
  const reduceMotion = useReducedMotion();

  const brand = t(locale, 'brand');
  const title = t(locale, 'title');
  const subtitle = t(locale, 'subtitle');
  const cta = t(locale, 'cta');
  const ctaSecondary = t(locale, 'ctaSecondary');

  const heroGroup = reduceMotion
    ? { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { ...ENTER, delay: 0.08 },
      };

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-testid="landing-redesign-demo"
        data-app-theme="landing"
        data-appearance={theme}
        lang={locale === 'zh' ? 'zh-CN' : 'en'}
        className="relative min-h-screen overflow-x-hidden bg-surface font-body text-on-surface selection:bg-secondary-container selection:text-on-secondary-container"
      >
        <div
          data-testid="landing-demo-banner"
          className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-label uppercase tracking-[0.14em]"
          style={{
            background: theme === 'dark' ? 'rgba(20, 32, 40, 0.72)' : 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(255,255,255,0.35)',
            backdropFilter: 'blur(10px)',
            color: theme === 'dark' ? '#cfe8e4' : '#3a4a48',
          }}
        >
          {t(locale, 'banner')}
        </div>

        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <motion.img
            className="h-full w-full object-cover"
            alt={t(locale, 'interiorAlt')}
            src="/hero-interior.webp"
            onError={(event) => applyFallbackImage(event, INTERIOR_FALLBACK)}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 0.88, scale: 1 }}
            transition={ENTER}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/5 via-surface/20 to-surface/78" />
          <div className="hero-gradient absolute inset-0" />
          <motion.div
            data-testid="landing-night-reveal"
            className="landing-night-reveal"
            initial={false}
            animate={{
              clipPath:
                'circle(' +
                (theme === 'dark' ? '150vmax' : '0px') +
                ' at ' +
                origin.x +
                '% ' +
                origin.y +
                '%)',
            }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.65, 0, 0.35, 1] }}
          />
        </div>

        <LiquidGlassNavbar
          logoSrc="/logo.webp"
          logoFallbackSrc={LOGO_FALLBACK}
          onLogoError={applyFallbackImage}
          onNavigateHome={() => navigateTo('/')}
          onAuthAction={() => navigateTo('/editor')}
        />

        <div className="relative z-10 flex w-full flex-col items-center">
          <main className="flex min-h-screen w-full max-w-[1920px] flex-col items-center justify-center px-6 pb-20 pt-28 md:pt-32">
            <section
              data-testid="landing-demo-hero"
              className="flex w-full max-w-4xl flex-col items-center text-center"
            >
              <motion.div {...heroGroup} className="flex w-full flex-col items-center">
                <p
                  data-testid="landing-demo-brand"
                  className="mb-5 font-headline text-[clamp(2.4rem,6vw,4.75rem)] font-bold leading-[0.95] tracking-[-0.04em] md:mb-6"
                  style={{
                    backgroundImage:
                      theme === 'dark'
                        ? 'linear-gradient(120deg, #f4fbff 10%, #8ce5df 90%)'
                        : 'linear-gradient(135deg, #191c1e 0%, #544434 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {brand}
                </p>

                <h1
                  data-testid="landing-demo-title"
                  className="mb-4 max-w-[18ch] font-headline text-[clamp(1.85rem,4.2vw,3.25rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-on-surface md:mb-5"
                  style={locale === 'zh' ? { lineHeight: 1.28 } : undefined}
                >
                  {title}
                </h1>

                <p
                  data-testid="landing-demo-subtitle"
                  className="landing-hero-subtitle mb-8 max-w-xl text-base leading-relaxed text-on-surface-variant md:mb-10 md:text-lg"
                >
                  {subtitle}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                  <LiquidGlassButton
                    testId="landing-demo-cta"
                    onClick={() => navigateTo('/editor')}
                  >
                    {cta}
                  </LiquidGlassButton>
                  <button
                    type="button"
                    data-testid="landing-demo-cta-secondary"
                    onClick={() => navigateTo('/liquid-glass')}
                    className="rounded-full px-5 py-3 text-sm font-medium tracking-tight text-on-surface/80 transition-colors hover:text-on-surface"
                    style={{
                      border: '1px solid rgba(255,255,255,0.35)',
                      background:
                        theme === 'dark' ? 'rgba(16,24,30,0.35)' : 'rgba(255,255,255,0.28)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    {ctaSecondary}
                  </button>
                </div>
              </motion.div>
            </section>
          </main>

          <section
            id="preview"
            data-testid="landing-demo-preview"
            className="grid w-full max-w-6xl items-center gap-12 overflow-hidden px-6 py-24 md:grid-cols-2 md:gap-16 md:py-28"
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={SECTION}
              className="relative"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-surface-container-low shadow-2xl">
                <img
                  className="h-full w-full object-cover"
                  alt={t(locale, 'planAlt')}
                  src="/landing-plan.webp"
                  onError={(event) => applyFallbackImage(event, PLAN_FALLBACK)}
                />
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ ...SECTION, delay: reduceMotion ? 0 : 0.05 }}
              className="flex flex-col gap-8 md:gap-10"
            >
              <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
                {t(locale, 'previewTitle')}
              </h2>
              {(
                [
                  ['sectionDraw', copy.sectionDraw],
                  ['sectionWalk', copy.sectionWalk],
                  ['sectionKeep', copy.sectionKeep],
                ] as const
              ).map(([key, section]) => (
                <div key={key} data-testid={`landing-demo-${key}`}>
                  <h3 className="mb-1.5 font-headline text-lg font-semibold tracking-tight text-on-surface">
                    {section.title[locale]}
                  </h3>
                  <p className="max-w-md text-sm leading-relaxed text-on-surface-variant md:text-base">
                    {section.body[locale]}
                  </p>
                </div>
              ))}
            </motion.div>
          </section>

          <footer className="w-full px-6 pb-16 pt-4 text-center text-[11px] tracking-wide text-on-surface-variant/80">
            /landing-demo · compare with{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-on-surface"
              onClick={() => navigateTo('/')}
            >
              /
            </button>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}
