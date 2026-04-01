import type { MouseEvent as ReactMouseEvent } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';

type LiquidGlassNavbarProps = {
  logoSrc: string;
  logoFallbackSrc: string;
  onLogoError: (event: ReactMouseEvent<HTMLImageElement> | Event, fallbackSrc: string) => void;
  onNavigateHome: () => void;
  onLaunchEditor: () => void;
};

const BRAND_GRADIENT = 'linear-gradient(90deg, #26dcd6 0%, #ff9f1c 100%)';
const ACCENT_FILL = '#ff9f1c';
const ACCENT_TEXT = '#683c00';
const ACCENT_SHADOW = '0 20px 50px -10px rgba(255, 159, 28, 0.32)';

export default function LiquidGlassNavbar({
  logoSrc,
  logoFallbackSrc,
  onLogoError,
  onNavigateHome,
  onLaunchEditor,
}: LiquidGlassNavbarProps) {
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

  const sheenOpacity = useTransform(smoothHover, [0, 1], [0, 0.65]);
  const backgroundSheen = useMotionTemplate`radial-gradient(circle 250px at ${smoothX}px ${smoothY}px, rgba(255,255,255,${sheenOpacity}), transparent 80%)`;

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
        data-testid="liquid-glass-navbar"
        className="liquid-glass-shell liquid-glass-navbar-shell relative flex h-full w-full max-w-[1920px] items-center justify-between overflow-hidden px-8"
        style={{ x: activePullX, y: activePullY }}
      >
        <span aria-hidden="true" className="liquid-glass-depth-ring" />
        <span aria-hidden="true" className="liquid-glass-inner-ring" />
        <motion.div
          aria-hidden="true"
          className="liquid-glass-highlight absolute inset-0 rounded-inherit pointer-events-none"
          style={{ background: backgroundSheen, mixBlendMode: 'overlay' }}
        />

        <div className="relative z-10 flex items-center gap-8">
          <button type="button" onClick={onNavigateHome} className="group flex items-center gap-3">
            <img
              src={logoSrc}
              alt="Facility Design Logo"
              className="h-16 w-16 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
              onError={(event) => onLogoError(event, logoFallbackSrc)}
            />
            <span
              className="text-xl font-bold tracking-tighter text-transparent font-headline"
              style={{
                backgroundImage: BRAND_GRADIENT,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
              }}
            >
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
            <a className="text-slate-600 transition-colors hover:text-secondary-fixed-dim" href="#pricing">
              Pricing
            </a>
            <a className="text-slate-600 transition-colors hover:text-secondary-fixed-dim" href="#footer">
              About
            </a>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <button
            type="button"
            onClick={onLaunchEditor}
            className="rounded-lg px-6 py-2.5 font-bold font-headline transition-all duration-300 hover:opacity-90 active:scale-90"
            style={{
              backgroundColor: ACCENT_FILL,
              color: ACCENT_TEXT,
              boxShadow: ACCENT_SHADOW,
            }}
          >
            Launch Editor
          </button>
        </div>
      </motion.div>
    </motion.nav>
  );
}
