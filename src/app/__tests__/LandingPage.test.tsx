import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import LandingPage from '../LandingPage';

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

  it('scopes the demo-style motion structure to the hero CTA only', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const heroLiquidCta = mountNode.querySelector('[data-testid="liquid-glass-button"]');
    const navbarCta = mountNode.querySelector('[data-testid="liquid-glass-navbar-cta"] button');

    expect(heroLiquidCta?.classList.contains('hero-liquid-glass-button')).toBe(true);
    expect(heroLiquidCta?.querySelector('.liquid-glass-hero-cta-ink')).not.toBeNull();
    expect(heroLiquidCta?.querySelector('.liquid-glass-hero-cta-arrow-primary')).not.toBeNull();
    expect(heroLiquidCta?.querySelector('.liquid-glass-hero-cta-arrow-secondary')).not.toBeNull();
    expect(heroLiquidCta?.querySelector('.liquid-glass-hero-cta-label')).not.toBeNull();

    expect(navbarCta?.querySelector('.liquid-glass-hero-cta-ink')).toBeNull();
    expect(navbarCta?.querySelector('.liquid-glass-hero-cta-arrow-primary')).toBeNull();
    expect(navbarCta?.querySelector('.liquid-glass-hero-cta-arrow-secondary')).toBeNull();
  });

  it('keeps the liquid glass contrast layer outside the blur shell and left-biases the navbar links', () => {
    act(() => {
      root.render(<LandingPage />);
    });

    const liquidWrappers = mountNode.querySelectorAll('.liquid-glass-wrapper');
    const heroLiquidCta = mountNode.querySelector('[data-testid="liquid-glass-button"]');
    const navbarShell = mountNode.querySelector('[data-testid="liquid-glass-navbar"]');
    const navbarLinks = mountNode.querySelector('[data-testid="liquid-glass-navbar-links"]');
    const navAnchors = Array.from(mountNode.querySelectorAll('[data-testid="landing-nav"] a'));
    const navbarCta = mountNode.querySelector('[data-testid="liquid-glass-navbar-cta"] button');
    const navbarCtaIcon = navbarCta?.querySelector('.landing-auth-button-icon');
    const previewSection = mountNode.querySelector('[data-testid="landing-preview"]');
    const featuresSection = mountNode.querySelector('[data-testid="landing-features"]');

    expect(liquidWrappers).toHaveLength(2);
    expect(heroLiquidCta?.parentElement?.classList.contains('liquid-glass-wrapper')).toBe(true);
    expect(navbarShell?.parentElement?.classList.contains('liquid-glass-wrapper')).toBe(true);
    expect(navbarLinks?.classList.contains('liquid-glass-navbar-links-panel')).toBe(true);
    expect(navbarLinks?.classList.contains('liquid-glass-navbar-links-panel-left-heavy')).toBe(true);
    expect(navbarCta?.classList.contains('landing-auth-button')).toBe(true);
    expect(navbarCta?.classList.contains('landing-auth-button-circle')).toBe(true);
    expect(navbarCta?.getAttribute('aria-label')).toBe('Sign in / Sign up');
    expect(navbarCtaIcon).not.toBeNull();
    expect(navAnchors).toHaveLength(4);
    navAnchors.forEach((anchor) => {
      expect(anchor.classList.contains('liquid-glass-nav-link')).toBe(true);
      expect(anchor.classList.contains('liquid-glass-nav-link-ink')).toBe(true);
    });
    expect(previewSection?.compareDocumentPosition(featuresSection as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect((heroImage as HTMLImageElement).src).toContain('lh3.googleusercontent.com');
    expect((previewImage as HTMLImageElement).src).toContain('lh3.googleusercontent.com');
  });
});
