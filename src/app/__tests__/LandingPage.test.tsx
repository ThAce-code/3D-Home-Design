import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import LandingPage from '../LandingPage';
import { setLandingAppearance } from '../landing-theme';
import { setLandingLocale } from '../landing-locale';

describe('LandingPage', () => {
  let mountNode: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0];
      disconnect() {}
      observe() {}
      takeRecords(): IntersectionObserverEntry[] { return []; }
      unobserve() {}
    }
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: MockIntersectionObserver });
    Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, writable: true, value: MockIntersectionObserver });
    window.localStorage.clear();
    setLandingAppearance('day');
    setLandingLocale('en');
    window.history.replaceState({}, '', '/');
    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    mountNode.remove();
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
    setLandingAppearance('day');
    setLandingLocale('en');
  });

  it('renders the final landing structure and routes into the editor', () => {
    act(() => { root.render(<LandingPage />); });
    expect(mountNode.querySelector('[data-testid="landing-nav"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="landing-hero"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="landing-preview"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="landing-features"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="landing-footer"]')).not.toBeNull();
    expect(mountNode.textContent).toContain('Facility Design');
    expect(mountNode.textContent).toContain('Build Your');
    expect(mountNode.textContent).toContain('Dream. Realized.');
    expect(mountNode.textContent).not.toContain('View Demo');
    const primaryCta = Array.from(mountNode.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Designing'),
    );
    expect(primaryCta).toBeDefined();
    act(() => { primaryCta?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(window.location.pathname).toBe('/editor');
  });

  it('renders liquid glass hero CTA and liquid glass navbar shell', () => {
    act(() => { root.render(<LandingPage />); });
    const nav = mountNode.querySelector('[data-testid="landing-nav"]');
    const hero = mountNode.querySelector('[data-testid="landing-hero"]');
    const heroLiquidCta = hero?.querySelector('[data-testid="liquid-glass-button"]');
    const navbarShell = nav?.querySelector('[data-testid="liquid-glass-navbar"]');
    expect(navbarShell).not.toBeNull();
    expect(navbarShell?.querySelector('[data-testid="liquid-glass-navbar-brand"]')).not.toBeNull();
    expect(navbarShell?.querySelector('[data-testid="liquid-glass-navbar-links"]')).not.toBeNull();
    expect(navbarShell?.querySelector('[data-testid="liquid-glass-navbar-cta"]')).not.toBeNull();
    expect(heroLiquidCta).not.toBeNull();
    expect(heroLiquidCta?.textContent).toContain('Start Designing');
  });

  it('uses the shared LiquidGlass CTA with arrow travel structure', () => {
    act(() => { root.render(<LandingPage />); });
    const heroLiquidCta = mountNode.querySelector('[data-testid="liquid-glass-button"]');
    expect(heroLiquidCta?.classList.contains('hero-liquid-glass-button')).toBe(true);
    expect(heroLiquidCta?.classList.contains('liquid-glass-surface')).toBe(true);
    expect(heroLiquidCta?.getAttribute('data-lg-variant')).toBe('cta');
    expect(heroLiquidCta?.querySelector('.liquid-glass-cta-label')).not.toBeNull();
    expect(heroLiquidCta?.querySelector('.liquid-glass-cta-arrow')).not.toBeNull();
  });

  it('keeps liquid glass wrappers outside the blur shell and left-biases navbar links', () => {
    act(() => { root.render(<LandingPage />); });
    const heroLiquidCta = mountNode.querySelector('[data-testid="liquid-glass-button"]');
    const navbarShell = mountNode.querySelector('[data-testid="liquid-glass-navbar"]');
    const navbarLinks = mountNode.querySelector('[data-testid="liquid-glass-navbar-links"]');
    const navAnchors = Array.from(mountNode.querySelectorAll('[data-testid="liquid-glass-navbar-links"] a'));
    const navbarAuth = mountNode.querySelector('[data-testid="liquid-glass-navbar-cta"] button[aria-label="Sign in / Sign up"]');
    const previewSection = mountNode.querySelector('[data-testid="landing-preview"]');
    const featuresSection = mountNode.querySelector('[data-testid="landing-features"]');
    expect(heroLiquidCta?.parentElement?.classList.contains('liquid-glass-wrapper')).toBe(true);
    expect(navbarShell?.parentElement?.classList.contains('liquid-glass-wrapper')).toBe(true);
    expect(navbarLinks?.classList.contains('liquid-glass-navbar-links-panel-left-heavy')).toBe(true);
    expect(navbarAuth?.classList.contains('landing-auth-button-circle')).toBe(true);
    expect(navAnchors).toHaveLength(4);
    expect(previewSection!.compareDocumentPosition(featuresSection as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not apply a backdrop-isolating filter on liquid-glass wrappers', () => {
    act(() => { root.render(<LandingPage />); });
    const wrappers = Array.from(mountNode.querySelectorAll('.liquid-glass-wrapper'));
    expect(wrappers.length).toBeGreaterThanOrEqual(2);
    wrappers.forEach((wrapper) => {
      expect((wrapper as HTMLElement).style.filter).toBe('');
    });
  });

  it('keeps the hero title split into three emphasis lines', () => {
    act(() => { root.render(<LandingPage />); });
    const hero = mountNode.querySelector('[data-testid="landing-hero"]');
    const heading = hero?.querySelector('h1');
    expect(heading?.querySelectorAll('br')).toHaveLength(2);
    expect(hero?.querySelector('p')?.classList.contains('landing-hero-subtitle')).toBe(true);
  });

  it('falls back to local-safe imagery when landing assets fail to load', () => {
    act(() => { root.render(<LandingPage />); });
    const logo = mountNode.querySelector('img[alt="Facility Design Logo"]');
    const preview = mountNode.querySelector('img[alt="Technical top-down 3D architectural floor plan"]');
    act(() => {
      logo?.dispatchEvent(new Event('error'));
      preview?.dispatchEvent(new Event('error'));
    });
    expect((logo as HTMLImageElement).src).toContain('data:image/svg+xml');
    expect((preview as HTMLImageElement).src).toContain('data:image/svg+xml');
  });

  it('falls back when the hero background fails to load', () => {
    act(() => { root.render(<LandingPage />); });
    const heroImage = mountNode.querySelector('img[alt="Ultra-modern minimalist bright living room"]');
    act(() => { heroImage?.dispatchEvent(new Event('error')); });
    expect((heroImage as HTMLImageElement).src).toContain('data:image/svg+xml');
  });

  it('restores gemini navigation rhythm for parity', () => {
    act(() => { root.render(<LandingPage />); });
    const nav = mountNode.querySelector('[data-testid="landing-nav"]');
    expect(nav?.textContent).toContain('Gallery');
    expect(nav?.textContent).toContain('Docs');
    expect(nav?.textContent).toContain('Experience');
    expect(nav?.textContent).toContain('Studio');
  });

  it('wires the approved navigation labels to real section anchors', () => {
    act(() => { root.render(<LandingPage />); });
    const navLinks = Array.from(mountNode.querySelectorAll('[data-testid="liquid-glass-navbar-links"] a'));
    expect(navLinks.find((l) => l.textContent?.includes('Gallery'))?.getAttribute('href')).toBe('#preview');
    expect(navLinks.find((l) => l.textContent?.includes('Docs'))?.getAttribute('href')).toBe('#docs');
    expect(navLinks.find((l) => l.textContent?.includes('Experience'))?.getAttribute('href')).toBe('#experience');
    expect(navLinks.find((l) => l.textContent?.includes('Studio'))?.getAttribute('href')).toBe('#footer');
  });

  it('restores gemini remote-first imagery for parity', () => {
    act(() => { root.render(<LandingPage />); });
    const heroImage = mountNode.querySelector('img[alt="Ultra-modern minimalist bright living room"]');
    const previewImage = mountNode.querySelector('img[alt="Technical top-down 3D architectural floor plan"]');
    expect((heroImage as HTMLImageElement).src).toContain('/hero-interior.webp');
    expect((previewImage as HTMLImageElement).src).toContain('/landing-plan.webp');
  });

  it('toggles day/night appearance and zh/en locale preferences', () => {
    act(() => { root.render(<LandingPage />); });
    const page = mountNode.querySelector('[data-testid="landing-page"]');
    const appearanceToggle = mountNode.querySelector('[data-testid="landing-appearance-toggle"]');
    const localeToggle = mountNode.querySelector('[data-testid="landing-locale-toggle"]');
    expect(page?.getAttribute('data-landing-appearance')).toBe('day');
    expect(page?.getAttribute('data-landing-locale')).toBe('en');
    act(() => { appearanceToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(page?.getAttribute('data-landing-appearance')).toBe('night');
    expect(window.localStorage.getItem('facility-landing-theme')).toBe('night');
    act(() => { localeToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(page?.getAttribute('data-landing-locale')).toBe('zh');
    expect(window.localStorage.getItem('facility-landing-locale')).toBe('zh');
    expect(mountNode.textContent).toContain('开始设计');
    expect(mountNode.textContent).toContain('图廊');
  });
});
