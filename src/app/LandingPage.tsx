import {
  Box,
  ChevronRight,
  Compass,
  Cpu,
  Gamepad2,
  Layers,
  Move,
} from 'lucide-react';
import type { MouseEvent as ReactMouseEvent, SyntheticEvent } from 'react';
import { MotionConfig, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import LiquidGlassButton from './components/LiquidGlassButton.js';
import LiquidGlassNavbar from './components/LiquidGlassNavbar.js';
import { LandingPreferencesProvider, useLandingPreferences } from './landingPreferences.js';
import { landingCopy } from './landingCopy.js';
import './landingAppearance.css';
import { navigateTo } from './router.js';

const LOGO_FALLBACK =
  "data:image/svg+xml;charset=UTF-8," +
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
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 960">
      <rect width="1440" height="960" fill="#f7f9fb"/>
      <rect x="110" y="110" width="1220" height="740" rx="48" fill="#eef3f6" stroke="#dac2ae" stroke-width="8"/>
      <rect x="180" y="180" width="440" height="260" rx="32" fill="#ffffff" stroke="#26dcd6" stroke-width="10"/>
      <rect x="680" y="180" width="580" height="180" rx="32" fill="#ffffff" stroke="#ff9f1c" stroke-width="10"/>
      <rect x="680" y="420" width="250" height="280" rx="32" fill="#ffffff" stroke="#26dcd6" stroke-width="10"/>
      <rect x="990" y="420" width="270" height="280" rx="32" fill="#ffffff" stroke="#ff9f1c" stroke-width="10"/>
      <path d="M640 180v520" stroke="#544434" stroke-width="10" stroke-dasharray="22 14"/>
      <path d="M180 500h440" stroke="#544434" stroke-width="10" stroke-dasharray="22 14"/>
    </svg>
  `);

const PLAN_FALLBACK =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
      <rect width="1080" height="1080" fill="#f2f4f6"/>
      <rect x="120" y="120" width="840" height="840" rx="40" fill="#fff" stroke="#191c1e" stroke-width="16"/>
      <rect x="220" y="220" width="260" height="260" fill="#52f6ef" fill-opacity="0.28" stroke="#006a66" stroke-width="12"/>
      <rect x="540" y="220" width="320" height="180" fill="#ff9f1c" fill-opacity="0.22" stroke="#683c00" stroke-width="12"/>
      <rect x="540" y="470" width="320" height="340" fill="#52f6ef" fill-opacity="0.18" stroke="#006a66" stroke-width="12"/>
      <path d="M500 220v590M220 520h260" stroke="#191c1e" stroke-width="16"/>
    </svg>
  `);

const LANDING_LOGO_SRC = '/logo.webp';
const LANDING_INTERIOR_SRC = '/hero-interior.webp';
  
const LANDING_PLAN_SRC = '/landing-plan.webp';
  

const LANDING_SURFACES = {
  tealFill: 'rgba(82, 246, 239, 0.3)',
  tealText: '#006a66',
  tealBorder: 'rgba(38, 220, 214, 0.2)',
  titleGradient: 'linear-gradient(135deg, #191c1e 0%, #544434 100%)',
} as const;

function applyFallbackImage(event: SyntheticEvent<HTMLImageElement> | Event, fallbackSrc: string) {
  const image = event.currentTarget as HTMLImageElement;
  image.onerror = null;
  image.src = fallbackSrc;
}

export default function LandingPage() {
  return <LandingPreferencesProvider><LandingContent /></LandingPreferencesProvider>;
}

function LandingContent() {
  const { locale, theme, origin } = useLandingPreferences();
  const t = (key: keyof typeof landingCopy) => landingCopy[key][locale];
  const reduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (reduceMotion) {
      return;
    }
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;
    mouseX.set((clientX / innerWidth - 0.5) * 2);
    mouseY.set((clientY / innerHeight - 0.5) * 2);
  };

  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const bgX = useTransform(smoothX, [-1, 1], [-15, 15]);
  const bgY = useTransform(smoothY, [-1, 1], [-15, 15]);
  const uiX = useTransform(smoothX, [-1, 1], [5, -5]);
  const uiY = useTransform(smoothY, [-1, 1], [5, -5]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-testid="landing-page"
        data-app-theme="landing"
        data-appearance={theme}
        lang={locale === 'zh' ? 'zh-CN' : 'en'}
        className="relative min-h-screen overflow-hidden bg-surface font-body text-on-surface selection:bg-secondary-container selection:text-on-secondary-container"
        onMouseMove={handleMouseMove}
      >
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <motion.img
            className="h-full w-full object-cover"
            alt={t('interiorAlt')}
            src={LANDING_INTERIOR_SRC}
            onError={(event) => applyFallbackImage(event, INTERIOR_FALLBACK)}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.85, scale: 1.05 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ x: reduceMotion ? 0 : bgX, y: reduceMotion ? 0 : bgY }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/0 via-surface/15 to-surface/70" />
          <div className="hero-gradient absolute inset-0" />
          <motion.div data-testid="landing-night-reveal" className="landing-night-reveal"
            initial={false}
            animate={{ clipPath: 'circle(' + (theme === 'dark' ? '150vmax' : '0px') + ' at ' + origin.x + '% ' + origin.y + '%)' }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.65, 0, 0.35, 1] }} />
        </div>

        <LiquidGlassNavbar
          logoSrc={LANDING_LOGO_SRC}
          logoFallbackSrc={LOGO_FALLBACK}
          onLogoError={applyFallbackImage}
          onNavigateHome={() => navigateTo('/')}
          onAuthAction={() => navigateTo('/editor')}
        />

        <motion.div style={{ x: reduceMotion ? 0 : uiX, y: reduceMotion ? 0 : uiY }} className="relative z-10 flex w-full flex-col items-center">
          <main className="flex min-h-screen w-full max-w-[1920px] flex-col items-center justify-center px-6 pb-24 pt-28 md:pt-32">
            <section data-testid="landing-hero" className="w-full max-w-5xl text-center">
              <motion.div
                initial={reduceMotion ? false : { y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-label uppercase tracking-widest md:mb-6"
                style={{
                  border: `1px solid ${LANDING_SURFACES.tealBorder}`,
                  backgroundColor: LANDING_SURFACES.tealFill,
                  color: theme === 'dark' ? '#9af3e9' : LANDING_SURFACES.tealText,
                }}
              >
                <Compass className="h-3.5 w-3.5" />
                {t('badge')}
              </motion.div>

              <motion.h1
                initial={reduceMotion ? false : { y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                className="mb-5 text-5xl font-bold leading-[0.9] tracking-tight text-on-surface font-headline md:mb-6 md:text-7xl lg:text-[6.8rem]"
              >
                {t('heroLineOne')}
                <br />
                {t('heroLineTwo')}
                <br />
                <span
                  className="text-transparent"
                  style={{
                    backgroundImage: theme === 'dark' ? 'linear-gradient(135deg, #f4fbff, #8ce5df)' : LANDING_SURFACES.titleGradient,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                  }}
                >
                  {t('heroLineThree')}
                </span>
              </motion.h1>

              <motion.p
                initial={reduceMotion ? false : { y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
                className="landing-hero-subtitle mx-auto max-w-2xl text-lg leading-relaxed text-on-surface-variant font-body md:text-xl"
              >
                {t('heroDescription')}
              </motion.p>

              <motion.div
                initial={reduceMotion ? false : { y: 30 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
                className="flex items-center justify-center"
              >
                <LiquidGlassButton onClick={() => navigateTo('/editor')}>
                  {t('startDesigning')}
                </LiquidGlassButton>
              </motion.div>
            </section>
          </main>

          <section
            id="preview"
            data-testid="landing-preview"
            className="grid w-full max-w-7xl items-center gap-20 overflow-hidden px-6 py-32 md:grid-cols-2"
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="relative order-2 md:order-1"
            >
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface-container-low shadow-2xl group">
                <img
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={t('planAlt')}
                  src={LANDING_PLAN_SRC}
                  onError={(event) => applyFallbackImage(event, PLAN_FALLBACK)}
                />
                <div className="glass-panel absolute right-6 bottom-6 left-6 flex items-center justify-between rounded-xl p-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container">
                      <Box className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-100 bg-white shadow-sm">
                      <Layers className="h-4 w-4 text-secondary" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded bg-surface-container-high px-3 py-1 text-[10px] font-bold text-on-surface font-label">
                      {t('scale')}
                    </span>
                    <span className="rounded bg-secondary-container px-3 py-1 text-[10px] font-bold text-on-secondary-container font-label">
                      {t('active')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -left-10 -z-10 h-64 w-64 rounded-full bg-secondary-container/20 blur-3xl" />
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
              className="order-1 md:order-2"
            >
              <h2 className="mb-8 text-4xl font-bold leading-tight text-on-surface font-headline md:text-5xl">
                {t('previewLineOne')} <br />
                {t('previewLineTwo')}
              </h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-1 flex-shrink-0 rounded-full bg-primary-container" />
                  <div>
                    <h4 className="mb-2 font-bold text-on-surface font-headline">{t('raytracingTitle')}</h4>
                    <p className="text-sm leading-relaxed text-on-surface-variant font-body">
                      {t('raytracingDescription')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-1 flex-shrink-0 rounded-full bg-secondary-fixed-dim" />
                  <div>
                    <h4 className="mb-2 font-bold text-on-surface font-headline">{t('assetsTitle')}</h4>
                    <p className="text-sm leading-relaxed text-on-surface-variant font-body">
                      {t('assetsDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          <section
            data-testid="landing-features"
            id="docs"
            className="grid w-full max-w-7xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-3"
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -8, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
              className="glass-panel group relative rounded-2xl p-8"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/20">
                <Move className="h-7 w-7 text-secondary-fixed-dim" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface font-headline">{t('geometryTitle')}</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant opacity-80 font-body">
                {t('geometryDescription')}
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                {t('exploreTool')} <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -8, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
              className="glass-panel group relative overflow-hidden rounded-2xl p-8"
            >
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary-container/10 blur-2xl" />
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/20">
                <Gamepad2 className="h-7 w-7 text-secondary-fixed-dim" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface font-headline">{t('roamingTitle')}</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant opacity-80 font-body">
                {t('roamingDescription')}
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                {t('viewModes')} <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -8, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
              className="glass-panel group relative rounded-2xl p-8"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/20">
                <Cpu className="h-7 w-7 text-secondary-fixed-dim" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface font-headline">{t('optimizedTitle')}</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant opacity-80 font-body">
                {t('optimizedDescription')}
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                {t('specs')} <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>
          </section>

          <section
            id="experience"
            className="w-full max-w-7xl px-6 pb-24"
          >
            <div className="glass-panel rounded-3xl p-10 text-center">
              <p className="text-[10px] font-label uppercase tracking-widest text-secondary">{t('experience')}</p>
              <h2 className="mt-4 text-3xl font-bold text-on-surface font-headline md:text-4xl">
                {t('experienceTitle')}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant font-body md:text-base">
                {t('experienceDescription')}
              </p>
            </div>
          </section>

          <footer
            id="footer"
            data-testid="landing-footer"
            className="w-full border-t border-slate-200/20 bg-slate-50 py-12"
          >
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-8 px-12 md:flex-row">
              <div className="flex flex-col items-center gap-4 md:items-start">
                <div className="flex items-center gap-3">
                  <img
                    src={LANDING_LOGO_SRC}
                    alt={t('logoAlt')}
                    className="h-12 w-12 object-contain grayscale opacity-70"
                    onError={(event) => applyFallbackImage(event, LOGO_FALLBACK)}
                  />
                  <span className="text-lg font-bold text-slate-900 font-headline">Facility Design</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-body">
                  {t('copyright')}
                </p>
              </div>
              <div className="flex gap-8">
                <a
                  className="text-xs text-slate-400 transition-all hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 font-label"
                  href="#"
                >
                  {t('privacy')}
                </a>
                <a
                  className="text-xs text-slate-400 transition-all hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 font-label"
                  href="#"
                >
                  {t('terms')}
                </a>
                <button
                  type="button"
                  onClick={() => navigateTo('/editor')}
                  className="text-xs text-slate-400 transition-all hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 font-label"
                >
                  {t('auth')}
                </button>
              </div>
            </div>
          </footer>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
