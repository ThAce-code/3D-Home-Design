import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LandingPage from '../LandingPage';

describe('LandingPage', () => {
  let mountNode: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0];

      disconnect() {}
      observe() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      unobserve() {}
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: MockIntersectionObserver,
    });
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: MockIntersectionObserver,
    });

    window.history.replaceState({}, '', '/');
    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mountNode.remove();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('renders the final landing structure and routes into the editor', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    expect(mountNode.querySelector('[data-testid="landing-nav"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="landing-hero"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="landing-preview"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="landing-features"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="landing-footer"]')).not.toBeNull();
    expect(mountNode.textContent).toContain('Facility Design');
    expect(mountNode.textContent).toContain('Build Your');
    expect(mountNode.textContent).toContain('Architectural');
    expect(mountNode.textContent).toContain('Dream. Realized.');
    expect(mountNode.textContent).toContain('Drag & Drop Geometry');
    expect(mountNode.textContent).toContain('Immersive FPS Roaming');
    expect(mountNode.textContent).toContain('Facility Optimized');
    expect(mountNode.textContent).not.toContain('View Demo');

    const primaryCta = Array.from(mountNode.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Designing'),
    );

    expect(primaryCta).toBeDefined();

    act(() => {
      primaryCta?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.location.pathname).toBe('/editor');
  });

  it('renders liquid glass hero CTA and liquid glass navbar shell', () => {
    act(() => {
      root.render(<LandingPage />);
    });

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

  it('uses shared glass surfaces and a native, keyboard-focusable CTA', () => {
    act(() => { root.render(<LandingPage />); });
    const cta = mountNode.querySelector<HTMLButtonElement>('[data-testid="liquid-glass-button"]');
    const surface = mountNode.querySelector('[data-testid="liquid-glass-button-surface"]');
    const nav = mountNode.querySelector('[data-testid="liquid-glass-navbar"]');
    expect(cta?.tagName).toBe('BUTTON');
    expect(cta?.type).toBe('button');
    expect(surface?.contains(cta!)).toBe(true);
    expect(surface?.classList.contains('lg')).toBe(true);
    expect(nav?.classList.contains('lg')).toBe(true);
    expect(surface?.querySelector('.lg-rim')).not.toBeNull();
    expect(nav?.querySelector('.lg-rim')).not.toBeNull();
    expect(mountNode.querySelector('.liquid-glass-hero-cta-fill')).toBeNull();
  });

  it('opens the mobile links and closes them with Escape while restoring focus', () => {
    act(() => { root.render(<LandingPage />); });
    const toggle = mountNode.querySelector<HTMLButtonElement>('[aria-controls="landing-mobile-menu"]')!;
    act(() => { toggle.click(); });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const menu = mountNode.querySelector('#landing-mobile-menu')!;
    expect(menu.querySelectorAll('a')).toHaveLength(4);
    act(() => { menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(mountNode.querySelector('#landing-mobile-menu')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('keeps the hero title split into the same three emphasis lines as the gemini reference', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const hero = mountNode.querySelector('[data-testid="landing-hero"]');
    const heading = hero?.querySelector('h1');
    const subtitle = hero?.querySelector('p');

    expect(hero).not.toBeNull();
    expect(hero?.textContent).toContain('Build Your');
    expect(hero?.textContent).toContain('Architectural');
    expect(hero?.textContent).toContain('Dream. Realized.');
    expect(heading?.querySelectorAll('br')).toHaveLength(2);
    expect(subtitle?.classList.contains('landing-hero-subtitle')).toBe(true);
  });

  it('falls back to local-safe imagery when landing assets fail to load', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const logo = mountNode.querySelector('img[alt="Facility Design Logo"]');
    const preview = mountNode.querySelector('img[alt="Technical top-down 3D architectural floor plan"]');

    expect(logo).not.toBeNull();
    expect(preview).not.toBeNull();

    act(() => {
      logo?.dispatchEvent(new Event('error'));
      preview?.dispatchEvent(new Event('error'));
    });

    expect((logo as HTMLImageElement).src).toContain('data:image/svg+xml');
    expect((preview as HTMLImageElement).src).toContain('data:image/svg+xml');
  });

  it('falls back to local-safe imagery when the remote hero background fails to load', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const heroImage = mountNode.querySelector('img[alt="Ultra-modern minimalist bright living room"]');

    expect(heroImage).not.toBeNull();

    act(() => {
      heroImage?.dispatchEvent(new Event('error'));
    });

    expect((heroImage as HTMLImageElement).src).toContain('data:image/svg+xml');
  });

  it('restores gemini navigation rhythm for parity', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const nav = mountNode.querySelector('[data-testid="landing-nav"]');

    expect(nav).not.toBeNull();
    expect(nav?.textContent).toContain('Gallery');
    expect(nav?.textContent).toContain('Docs');
    expect(nav?.textContent).toContain('Experience');
    expect(nav?.textContent).toContain('Studio');
  });

  it('wires the approved navigation labels to real section anchors', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const navLinks = Array.from(mountNode.querySelectorAll('[data-testid="landing-nav"] a'));
    const galleryLink = navLinks.find((link) => link.textContent?.includes('Gallery'));
    const docsLink = navLinks.find((link) => link.textContent?.includes('Docs'));
    const experienceLink = navLinks.find((link) => link.textContent?.includes('Experience'));
    const studioLink = navLinks.find((link) => link.textContent?.includes('Studio'));

    expect(galleryLink?.getAttribute('href')).toBe('#preview');
    expect(docsLink?.getAttribute('href')).toBe('#docs');
    expect(experienceLink?.getAttribute('href')).toBe('#experience');
    expect(studioLink?.getAttribute('href')).toBe('#footer');
    expect(mountNode.querySelector('#preview')).not.toBeNull();
    expect(mountNode.querySelector('#docs')).not.toBeNull();
    expect(mountNode.querySelector('#experience')).not.toBeNull();
    expect(mountNode.querySelector('#footer')).not.toBeNull();
  });

  it('restores gemini remote-first imagery for parity', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const heroImage = mountNode.querySelector('img[alt="Ultra-modern minimalist bright living room"]');
    const previewImage = mountNode.querySelector('img[alt="Technical top-down 3D architectural floor plan"]');

    expect(heroImage).not.toBeNull();
    expect(previewImage).not.toBeNull();
    expect((heroImage as HTMLImageElement).src).toContain('/hero-interior.webp');
    expect((previewImage as HTMLImageElement).src).toContain('/landing-plan.webp');
  });
});
