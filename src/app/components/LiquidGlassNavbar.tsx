import { Menu, Moon, Sun, User, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { LiquidGlass } from '../liquid-glass/index.js';
import type { LandingCopy } from '../landing-locale.js';
import type { LandingAppearance } from '../landing-theme.js';

type LiquidGlassNavbarProps = {
  logoSrc: string;
  logoFallbackSrc: string;
  onLogoError: (event: SyntheticEvent<HTMLImageElement> | Event, fallbackSrc: string) => void;
  onNavigateHome: () => void;
  onAuthAction: () => void;
  appearance: LandingAppearance;
  onToggleAppearance: () => void;
  copy: LandingCopy;
  onToggleLocale: () => void;
  localeLabel: string;
};

const BRAND_GRADIENT = 'linear-gradient(90deg, #26dcd6 0%, #ff9f1c 100%)';
const NAV_EXPANDED_MAX = 1280;
const NAV_COMPACT_MAX = 900;
const NAV_EXPANDED_HEIGHT = 80;
const NAV_COMPACT_HEIGHT = 64;
const SCROLL_COMPACT_AT = 100;
const SCROLL_EXPAND_AT = 48;

const NAV_LINKS = [
  { href: '#preview', key: 'navGallery' as const },
  { href: '#docs', key: 'navDocs' as const },
  { href: '#experience', key: 'navExperience' as const },
  { href: '#footer', key: 'navStudio' as const },
];

export default function LiquidGlassNavbar({
  logoSrc,
  logoFallbackSrc,
  onLogoError,
  onNavigateHome,
  onAuthAction,
  appearance,
  onToggleAppearance,
  copy,
  onToggleLocale,
  localeLabel,
}: LiquidGlassNavbarProps) {
  const reduceMotion = useReducedMotion();
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setCompact((wasCompact) => {
        if (!wasCompact && y >= SCROLL_COMPACT_AT) return true;
        if (wasCompact && y <= SCROLL_EXPAND_AT) return false;
        return wasCompact;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const shellMax = compact ? NAV_COMPACT_MAX : NAV_EXPANDED_MAX;
  const shellHeight = compact ? NAV_COMPACT_HEIGHT : NAV_EXPANDED_HEIGHT;
  const mobileHeight = NAV_COMPACT_HEIGHT;

  return (
    <motion.nav
      data-testid="landing-nav"
      data-nav-compact={compact ? 'true' : 'false'}
      className="fixed top-0 z-50 flex w-full items-start justify-center px-4 pt-3 md:px-8 md:pt-4"
      initial={false}
    >
      <motion.div
        className="hidden w-full md:block"
        animate={reduceMotion ? { maxWidth: shellMax } : { maxWidth: shellMax }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 32 }}
        style={{ maxWidth: shellMax }}
      >
        <LiquidGlass
          variant="navbar"
          appearance={appearance}
          testId="liquid-glass-navbar"
          wrapperClassName="h-full w-full"
          className="liquid-glass-navbar-shell relative w-full overflow-hidden px-6"
          style={{ height: shellHeight }}
          radius={32}
          contentClassName="liquid-glass-content-fill"
        >
          <div className="relative z-10 grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
            <button type="button" onClick={onNavigateHome} className="group flex items-center gap-3 justify-self-start">
              <span data-testid="liquid-glass-navbar-brand" className="flex items-center gap-3">
                <img
                  src={logoSrc}
                  alt={`${copy.brand} Logo`}
                  className="h-12 w-12 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                  onError={(event) => onLogoError(event, logoFallbackSrc)}
                />
                <span
                  className="text-lg font-bold tracking-tighter text-transparent font-headline"
                  style={{ backgroundImage: BRAND_GRADIENT, backgroundClip: 'text', WebkitBackgroundClip: 'text' }}
                >
                  {copy.brand}
                </span>
              </span>
            </button>

            <div
              data-testid="liquid-glass-navbar-links"
              className="liquid-glass-navbar-links-panel liquid-glass-navbar-links-panel-left-heavy flex items-center gap-8"
            >
              {NAV_LINKS.map((link) => (
                <a key={link.href} className="liquid-glass-nav-link liquid-glass-nav-link-ink" href={link.href}>
                  {copy[link.key]}
                </a>
              ))}
            </div>

            <div data-testid="liquid-glass-navbar-cta" className="flex items-center justify-self-end gap-2">
              <button
                type="button"
                className="landing-pref-button"
                onClick={onToggleAppearance}
                aria-label={appearance === 'day' ? copy.appearanceNight : copy.appearanceDay}
                data-testid="landing-appearance-toggle"
              >
                {appearance === 'day' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className="landing-pref-button landing-pref-button-label"
                onClick={onToggleLocale}
                aria-label={localeLabel}
                data-testid="landing-locale-toggle"
              >
                {localeLabel}
              </button>
              <button
                type="button"
                onClick={onAuthAction}
                aria-label={copy.authAria}
                className="landing-auth-button landing-auth-button-circle"
              >
                <User className="landing-auth-button-icon h-[22px] w-[22px]" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </LiquidGlass>
      </motion.div>

      <div className="w-full md:hidden" style={{ maxWidth: 720 }}>
        <LiquidGlass
          variant="navbar"
          appearance={appearance}
          testId="liquid-glass-navbar-mobile"
          wrapperClassName="h-full w-full"
          className="liquid-glass-navbar-shell relative w-full overflow-hidden px-4"
          style={{ height: mobileHeight }}
          radius={24}
          contentClassName="liquid-glass-content-fill"
        >
          <div className="relative z-10 flex h-full w-full items-center justify-between gap-3">
            <button type="button" onClick={onNavigateHome} className="flex items-center gap-2">
              <img
                src={logoSrc}
                alt={`${copy.brand} Logo`}
                className="h-10 w-10 object-contain"
                onError={(event) => onLogoError(event, logoFallbackSrc)}
              />
              <span
                className="text-base font-bold tracking-tighter text-transparent font-headline"
                style={{ backgroundImage: BRAND_GRADIENT, backgroundClip: 'text', WebkitBackgroundClip: 'text' }}
              >
                {copy.brand}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="landing-pref-button"
                onClick={onToggleAppearance}
                aria-label={appearance === 'day' ? copy.appearanceNight : copy.appearanceDay}
              >
                {appearance === 'day' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className="landing-pref-button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? copy.menuClose : copy.menuOpen}
                aria-expanded={menuOpen}
                data-testid="landing-mobile-menu-toggle"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </LiquidGlass>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              key="mobile-menu"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="mt-2"
              data-testid="landing-mobile-menu"
            >
              <LiquidGlass variant="panel" appearance={appearance} wrapperClassName="w-full" className="w-full px-4 py-4" contentClassName="liquid-glass-content-fill">
                <div className="flex w-full flex-col gap-3">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      className="liquid-glass-nav-link liquid-glass-nav-link-ink py-2"
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {copy[link.key]}
                    </a>
                  ))}
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-black/10 pt-3">
                    <button
                      type="button"
                      className="landing-pref-button landing-pref-button-label"
                      onClick={onToggleLocale}
                      data-testid="landing-locale-toggle-mobile"
                    >
                      {localeLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onAuthAction();
                      }}
                      aria-label={copy.authAria}
                      className="landing-auth-button landing-auth-button-circle"
                    >
                      <User className="landing-auth-button-icon h-[22px] w-[22px]" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </LiquidGlass>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
