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
    expect(mountNode.textContent).toContain('Build Your Architectural');
    expect(mountNode.textContent).toContain('Dream. Realized.');
    expect(mountNode.textContent).toContain('Drag & Drop Geometry');
    expect(mountNode.textContent).toContain('Immersive FPS Roaming');
    expect(mountNode.textContent).toContain('Facility Optimized');

    const primaryCta = Array.from(mountNode.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Designing'),
    );

    expect(primaryCta).toBeDefined();

    act(() => {
      primaryCta?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.location.pathname).toBe('/editor');
  });
});
