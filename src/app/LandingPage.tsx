import {
  ArrowRight,
  Box,
  ChevronRight,
  Compass,
  Cpu,
  Gamepad2,
  Layers,
  Move,
} from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { navigateTo } from './router.js';

function LiquidNavbar() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const hoverState = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const smoothHover = useSpring(hoverState, { stiffness: 100, damping: 15 });

  const handleMouseMove = (event: ReactMouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  };

  const pullX = useTransform(smoothX, (value) => {
    const width = typeof window === 'undefined' ? 1 : window.innerWidth;
    return ((value - width / 2) / (width / 2)) * 10;
  });

  const pullY = useTransform(smoothY, (value) => {
    const height = typeof window === 'undefined' ? 1 : 96;
    return ((value - height / 2) / (height / 2)) * 8;
  });

  const activePullX = useTransform(() => pullX.get() * smoothHover.get());
  const activePullY = useTransform(() => pullY.get() * smoothHover.get());

  const sheenOpacity = useTransform(smoothHover, [0, 1], [0, 0.7]);
  const backgroundSheen = useMotionTemplate`radial-gradient(circle 250px at ${smoothX}px ${smoothY}px, rgba(255,255,255,${sheenOpacity}), transparent 80%)`;

  const chromaX = useTransform(smoothX, (value) => {
    const width = typeof window === 'undefined' ? 1 : window.innerWidth;
    return ((value - width / 2) / (width / 2)) * 6;
  });
  const chromaY = useTransform(smoothY, (value) => {
    const height = typeof window === 'undefined' ? 1 : 96;
    return ((value - height / 2) / (height / 2)) * 6;
  });
  const chromaOpacity = useTransform(smoothHover, [0, 1], [0, 0.3]);
  const chromaShadow = useMotionTemplate`
    inset ${chromaX}px ${chromaY}px 12px rgba(255, 0, 0, ${chromaOpacity}),
    inset calc(${chromaX}px * -1) calc(${chromaY}px * -1) 12px rgba(0, 255, 255, ${chromaOpacity})
  `;

  return (
    <motion.nav
      data-testid="landing-nav"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => hoverState.set(1)}
      onMouseLeave={() => hoverState.set(0)}
      style={{ paddingLeft: '32px', paddingRight: '32px', y: 16 }}
      className="fixed top-0 z-50 flex h-24 w-full items-center justify-center"
    >
      <motion.div
        className="relative flex h-full w-full max-w-[1920px] items-center justify-between overflow-hidden px-8"
        style={{
          x: activePullX,
          y: activePullY,
          borderRadius: '32px',
          boxShadow:
            'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.1), 0 20px 40px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(3px) saturate(110%)',
          WebkitBackdropFilter: 'blur(3px) saturate(110%)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderTop: '1px solid rgba(255, 255, 255, 0.4)',
          transformOrigin: 'center center',
        }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: backgroundSheen, mixBlendMode: 'overlay' }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0 rounded-inherit"
          style={{ boxShadow: chromaShadow, mixBlendMode: 'color-burn' }}
        />

        <div
          className="pointer-events-none absolute inset-0 rounded-inherit"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 20px rgba(255,255,255,0.1)',
            mixBlendMode: 'screen',
          }}
        />

        <div className="relative z-10 flex items-center gap-8">
          <button type="button" onClick={() => navigateTo('/')} className="group flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Facility Design Logo"
              className="h-16 w-16 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
            />
            <span className="bg-gradient-to-r from-secondary-fixed-dim to-primary-container bg-clip-text text-xl font-bold tracking-tighter text-transparent font-headline">
              Facility Design
            </span>
          </button>
          <div className="hidden gap-8 font-headline text-sm tracking-tight md:flex">
            <a className="text-slate-600 transition-colors hover:text-secondary-fixed-dim" href="#preview">
              Gallery
            </a>
            <a className="text-slate-600 transition-colors hover:text-secondary-fixed-dim" href="#features">
              Features
            </a>
            <a className="text-slate-600 transition-colors hover:text-secondary-fixed-dim" href="#footer">
              About
            </a>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <button
            type="button"
            onClick={() => navigateTo('/editor')}
            className="rounded-lg bg-primary-container px-6 py-2.5 font-bold font-headline text-on-primary-container shadow-lg shadow-primary-container/20 transition-all duration-300 hover:opacity-90 active:scale-90"
          >
            Launch Editor
          </button>
        </div>
      </motion.div>
    </motion.nav>
  );
}

export default function LandingPage() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
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
    <div
      data-testid="landing-page"
      data-app-theme="landing"
      className="relative min-h-screen overflow-hidden bg-surface font-body text-on-surface selection:bg-secondary-container selection:text-on-secondary-container"
      onMouseMove={handleMouseMove}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.img
          className="h-full w-full object-cover opacity-60"
          alt="Ultra-modern minimalist bright living room"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWFzjYbOAim9JYHcDd1mqyRNrXaKGpfB4_3NjpmzUDTGD0YpNa-lRGZ06Z0-1lgTDSdi2GzSzUOffbEbjdV6qTfE7PsvzOlZS9jLaXVKLrr9R1nCTawml0bVoMDk17hLaDRJKT820KaknhLLr_etWKFbKghkm1dfhVB-ZO_zOs2Xj1rwOK3eBTnwACZMAPnftpWUXLXD9x-GVFlvYSSRAthQToIIViL1F9XNR5D1TxhvxcHBSqqkX_8UctAiH_HhxAHlyKfsj4kajE"
          initial={{ filter: 'blur(20px)', scale: 1.1 }}
          animate={{ filter: 'blur(2px)', scale: 1.05 }}
          transition={{ duration: 2, ease: 'easeOut' }}
          style={{ x: bgX, y: bgY }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/20 via-surface/40 to-surface" />
        <div className="hero-gradient absolute inset-0" />
      </div>

      <LiquidNavbar />

      <motion.div style={{ x: uiX, y: uiY }} className="relative z-10 flex w-full flex-col items-center">
        <main className="flex min-h-screen w-full max-w-[1920px] flex-col items-center px-6 pb-20 pt-32">
          <section data-testid="landing-hero" className="mt-12 mb-24 max-w-4xl text-center md:mt-24">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-secondary-fixed-dim/20 bg-secondary-container/30 px-3 py-1 text-[10px] font-label uppercase tracking-widest text-secondary"
            >
              <Compass className="h-3.5 w-3.5" />
              Next-Gen Spatial Engine
            </motion.div>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
              className="mb-8 text-5xl font-bold leading-[0.95] tracking-tight text-on-surface font-headline md:text-7xl lg:text-8xl"
            >
              Build Your Architectural <br />
              <span className="bg-gradient-to-br from-on-surface to-on-surface-variant bg-clip-text text-transparent">
                Dream. Realized.
              </span>
            </motion.h1>

            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
              className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-on-surface-variant font-body md:text-xl"
            >
              A precision configurator for interactive 3D interior design and floor planning. Craft
              environments with the fluidity of an artist and the precision of an engineer.
            </motion.p>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.0, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateTo('/editor')}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl bg-primary-container px-10 py-5 font-bold font-headline text-on-primary-container shadow-[0_0_40px_-10px_rgba(255,159,28,0.5)] transition-shadow duration-500 hover:shadow-[0_20px_50px_-10px_rgba(255,159,28,0.8)]"
              >
                <span className="relative z-10">Start Designing</span>
                <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.button>

              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="#preview"
                className="rounded-xl border border-secondary-fixed-dim/50 bg-white/40 px-10 py-5 font-bold font-headline text-secondary backdrop-blur-md transition-colors duration-300 hover:border-teal-400/80 hover:bg-teal-400/10"
              >
                View Demo
              </motion.a>
            </motion.div>
          </section>

          <section data-testid="landing-features" id="features" className="mt-auto grid w-full max-w-7xl grid-cols-1 gap-6 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              whileHover={{ y: -8, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
              className="glass-panel group relative rounded-2xl p-8"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/20">
                <Move className="h-7 w-7 text-secondary-fixed-dim" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface font-headline">Drag &amp; Drop Geometry</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant opacity-80 font-body">
                Seamlessly manipulate 3D volumes with our proprietary spatial snapping engine.
                Architecture made tactile.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                Explore Tool <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              whileHover={{ y: -8, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
              className="glass-panel group relative overflow-hidden rounded-2xl p-8"
            >
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary-container/10 blur-2xl" />
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/20">
                <Gamepad2 className="h-7 w-7 text-secondary-fixed-dim" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface font-headline">Immersive FPS Roaming</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant opacity-80 font-body">
                Experience your floor plans in real-time first-person perspective. Walk through your
                creation before a single brick is laid.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                View Modes <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              whileHover={{ y: -8, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
              className="glass-panel group relative rounded-2xl p-8"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/20">
                <Cpu className="h-7 w-7 text-secondary-fixed-dim" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-on-surface font-headline">Facility Optimized</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant opacity-80 font-body">
                Engineered for large-scale architectural workflows. High-poly counts, real-time
                lighting, and precise CAD exports.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                Specs <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>
          </section>
        </main>

        <section
          id="preview"
          data-testid="landing-preview"
          className="grid w-full max-w-7xl items-center gap-20 overflow-hidden px-6 py-32 md:grid-cols-2"
        >
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="relative order-2 md:order-1"
          >
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface-container-low shadow-2xl group">
              <img
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt="Technical top-down 3D architectural floor plan"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0LS8jvYWCaJnhXSPGbH7ZBDU8WXiNSqt6xl9iZKLU8rT1M2h8_9A8ENmRbnqR0KRAZHpiIpB76Ks_w96UUF_iFb5Zsz2O4yYaPN7Et-NLJ-E37LK4-JHgDJ3AzvNfzZ7a21sNTPpjvsClPymNZbAMHTJKER8G26FBIeF3HbfBfs0usBOslRRTLagEElWwxMOeo3freqDwR7lBjA0rYUfRdaDc1dnmMufW1AR571jBRgLqyAGzkO_p3tfptqFToZm690ztcLz5o6lT"
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
                    SCALE: 1:50
                  </span>
                  <span className="rounded bg-secondary-container px-3 py-1 text-[10px] font-bold text-on-secondary-container font-label">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -left-10 -z-10 h-64 w-64 rounded-full bg-secondary-container/20 blur-3xl" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
            className="order-1 md:order-2"
          >
            <h2 className="mb-8 text-4xl font-bold leading-tight text-on-surface font-headline md:text-5xl">
              Design with the <br />
              Speed of Thought.
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-1 flex-shrink-0 rounded-full bg-primary-container" />
                <div>
                  <h4 className="mb-2 font-bold text-on-surface font-headline">Real-time Raytracing</h4>
                  <p className="text-sm leading-relaxed text-on-surface-variant font-body">
                    Visualize materials, lighting, and textures with cinematic fidelity as you work.
                    No wait times, just instant beauty.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-1 flex-shrink-0 rounded-full bg-secondary-fixed-dim" />
                <div>
                  <h4 className="mb-2 font-bold text-on-surface font-headline">Smart Asset Library</h4>
                  <p className="text-sm leading-relaxed text-on-surface-variant font-body">
                    Access a curated gallery of 5,000+ architect-certified furniture pieces, fixtures,
                    and structural elements.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
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
                  src="/logo.png"
                  alt="Facility Design Logo"
                  className="h-12 w-12 object-contain grayscale opacity-70"
                />
                <span className="text-lg font-bold text-slate-900 font-headline">Facility Design</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-body">
                © 2024 Facility Design Architectural Studio. All rights reserved.
              </p>
            </div>
            <div className="flex gap-8">
              <a
                className="text-xs text-slate-400 transition-all hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 font-label"
                href="#"
              >
                Privacy Policy
              </a>
              <a
                className="text-xs text-slate-400 transition-all hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 font-label"
                href="#"
              >
                Terms of Service
              </a>
              <button
                type="button"
                onClick={() => navigateTo('/editor')}
                className="text-xs text-slate-400 transition-all hover:text-orange-400 hover:underline decoration-secondary-fixed-dim underline-offset-4 font-label"
              >
                Launch Editor
              </button>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
