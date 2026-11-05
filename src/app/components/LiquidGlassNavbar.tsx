import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import LiquidGlass from '../liquid-glass/LiquidGlass.js';
import { useLandingPreferences } from '../landingPreferences.js';
import './landing-liquid-glass.css';

type LiquidGlassNavbarProps = {
  logoSrc: string;
  logoFallbackSrc: string;
  onLogoError: (event: SyntheticEvent<HTMLImageElement> | Event, fallbackSrc: string) => void;
  onNavigateHome: () => void;
  onAuthAction: () => void;
};

const LINKS = [['#preview', 'Gallery'], ['#docs', 'Docs'], ['#experience', 'Experience'], ['#footer', 'Studio']];
const SETTLE = { type: 'spring', stiffness: 240, damping: 30 } as const;

export default function LiquidGlassNavbar({
  logoSrc, logoFallbackSrc, onLogoError, onNavigateHome, onAuthAction,
}: LiquidGlassNavbarProps) {
  const reduceMotion = useReducedMotion();
  const { theme, locale, setTheme, setLocale, setOrigin } = useLandingPreferences();
  const labels = locale === 'zh' ? ['作品', '文档', '体验', '工作室'] : LINKS.map(link => link[1]);
  const authLabel = locale === 'zh' ? '登录 / 注册' : 'Sign in / Sign up';
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(() => window.scrollY > 100);
  const [viewport, setViewport] = useState(() => window.innerWidth);
  const navRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { scrollY } = useScroll();
  // Hysteresis keeps the shell from oscillating at the scroll threshold.
  useMotionValueEvent(scrollY, 'change', (y) => {
    setCompact((current) => current ? y > 48 : y > 100);
  });

  useEffect(() => {
    const resize = () => {
      setViewport(window.innerWidth);
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [menuOpen]);

  const mobile = viewport < 1024;
  const width = Math.min(compact ? 900 : 1280, viewport - (mobile ? 24 : 48));

  return (
    <nav ref={navRef} data-testid="landing-nav" aria-label={locale === 'zh' ? '主导航' : 'Main navigation'}
      className="landing-liquid-nav"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}>
      <LiquidGlass
        data-testid="liquid-glass-navbar"
        data-compact={compact}
        radius={32}
        tone={theme}
        sheen
        className="landing-liquid-nav-surface"
        initial={false}
        animate={{ width, height: mobile || compact ? 64 : 80 }}
        transition={reduceMotion ? { duration: 0 } : SETTLE}
      >
        <button type="button" onClick={onNavigateHome} className="landing-liquid-brand" aria-label={locale === 'zh' ? '返回首页' : 'Facility Design home'}>
          <span data-testid="liquid-glass-navbar-brand" className="landing-liquid-brand-content">
            <img src={logoSrc} alt="" width="40" height="40" onError={(event) => onLogoError(event, logoFallbackSrc)} />
            <span>Facility Design</span>
          </span>
        </button>
        <div data-testid="liquid-glass-navbar-links" className="landing-liquid-links">
          {LINKS.map(([href], index) => <a key={href} href={href}>{labels[index]}</a>)}
        </div>
        <div data-testid="liquid-glass-navbar-cta" className="landing-liquid-actions">
          <motion.button type="button" data-testid="landing-theme-toggle" className="landing-theme-toggle"
            aria-label={locale === 'zh' ? '切换昼夜模式' : 'Toggle day / night'} aria-pressed={theme === 'dark'}
            title={locale === 'zh' ? (theme === 'dark' ? '切换日间' : '切换夜间') : (theme === 'dark' ? 'Switch to day' : 'Switch to night')}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setOrigin({ x: (rect.x + rect.width / 2) / window.innerWidth * 100, y: (rect.y + rect.height / 2) / window.innerHeight * 100 });
              setTheme(theme === 'light' ? 'dark' : 'light');
            }}>
            <motion.span className="landing-sky-orbit" initial={false}
              animate={{ rotate: theme === 'dark' ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.7, type: 'tween', ease: [0.34, 1.56, 0.64, 1] }}>
              <Sun className="landing-sun" size={22} aria-hidden="true" />
              <Moon className="landing-moon" size={22} aria-hidden="true" />
            </motion.span>
          </motion.button>
          <button type="button" data-testid="landing-language-toggle" className="landing-language-toggle"
            aria-label={locale === 'zh' ? 'Switch to English' : '切换为中文'} onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}>
            <span className={locale === 'zh' ? 'selected' : ''}>中</span><span aria-hidden="true">/</span><span className={locale === 'en' ? 'selected' : ''}>EN</span>
          </button>
          <button ref={menuButton} type="button" aria-label={locale === 'zh' ? '导航菜单' : 'Navigation menu'} aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} className="landing-liquid-menu-toggle">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <motion.button type="button" onClick={onAuthAction} aria-label={authLabel}
            className="landing-liquid-account" whileHover={reduceMotion ? undefined : { y: -1 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }} transition={SETTLE}>
            <UserRound size={20} aria-hidden="true" />
          </motion.button>
        </div>
      </LiquidGlass>
      {menuOpen ? (
        <LiquidGlass id="landing-mobile-menu" radius={24} tone={theme}
          className="landing-liquid-mobile-menu"
          initial={reduceMotion ? false : { y: -8 }} animate={{ y: 0 }} transition={SETTLE}>
          {LINKS.map(([href], index) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>{labels[index]}</a>
          ))}
        </LiquidGlass>
      ) : null}
    </nav>
  );
}
