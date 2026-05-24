import type { MouseEvent as ReactMouseEvent } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';

type LiquidGlassNavbarProps = {
  logoSrc: string;
  logoFallbackSrc: string;
  onLogoError: (event: ReactMouseEvent<HTMLImageElement> | Event, fallbackSrc: string) => void;
  onNavigateHome: () => void;
  onAuthAction: () => void;
};

const BRAND_GRADIENT = 'linear-gradient(90deg, #26dcd6 0%, #ff9f1c 100%)';

export default function LiquidGlassNavbar({
  logoSrc,
  logoFallbackSrc,
  onLogoError,
  onNavigateHome,
  onAuthAction,
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
      <div className="liquid-glass-wrapper h-full w-full max-w-[1920px]">
        <motion.div
          data-testid="liquid-glass-navbar"
          className="liquid-glass-shell liquid-glass-navbar-shell relative h-full w-full overflow-hidden px-8"
          style={{ x: activePullX, y: activePullY }}
        >
          <span aria-hidden="true" className="liquid-glass-depth-ring" />
          <span aria-hidden="true" className="liquid-glass-inner-ring" />
          <motion.div
            aria-hidden="true"
            className="liquid-glass-highlight absolute inset-0 rounded-inherit pointer-events-none"
            style={{ background: backgroundSheen, mixBlendMode: 'overlay' }}
          />

          <div className="relative z-10 grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6">
            <button type="button" onClick={onNavigateHome} className="group flex items-center gap-3">
              <span data-testid="liquid-glass-navbar-brand" className="flex items-center gap-3 justify-self-start">
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
              </span>
            </button>
            <div
              data-testid="liquid-glass-navbar-links"
              className="liquid-glass-navbar-links-panel liquid-glass-navbar-links-panel-left-heavy hidden items-center gap-10 md:flex"
            >
              <a className="liquid-glass-nav-link liquid-glass-nav-link-ink" href="#preview">
                Gallery
              </a>
              <a className="liquid-glass-nav-link liquid-glass-nav-link-ink" href="#docs">
                Docs
              </a>
              <a className="liquid-glass-nav-link liquid-glass-nav-link-ink" href="#experience">
                Experience
              </a>
              <a className="liquid-glass-nav-link liquid-glass-nav-link-ink" href="#footer">
                Studio
              </a>
            </div>
            <div data-testid="liquid-glass-navbar-cta" className="flex items-center justify-self-end">
              <button
                type="button"
                onClick={onAuthAction}
                aria-label="Sign in / Sign up"
                className="landing-auth-button landing-auth-button-circle"
              >
                <svg
                  aria-hidden="true"
                  className="landing-auth-button-icon"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.nav>
  );
}
