import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { createDisplacementMapUrl } from './displacementMap.js';

export type LiquidGlassSettings = {
  /** Allow SVG edge refraction where the browser supports it. */
  refract: boolean;
  /** Track the pointer with the rim highlight. */
  specular: boolean;
  /** feDisplacementMap scale in px; the largest offset is half of this. */
  refraction: number;
  /** Rim width in px. */
  bezel: number;
  /** Extra displacement for the green/blue channels, as a fraction of `refraction`. */
  dispersion: number;
  blur: number;
  saturation: number;
};

export const DEFAULT_LIQUID_GLASS_SETTINGS: LiquidGlassSettings = {
  refract: true,
  specular: true,
  refraction: 36,
  bezel: 18,
  dispersion: 0.12,
  blur: 3,
  saturation: 1.7,
};

export const LiquidGlassSettingsContext = createContext<LiquidGlassSettings>(DEFAULT_LIQUID_GLASS_SETTINGS);

export function useLiquidGlassSettings() {
  return useContext(LiquidGlassSettingsContext);
}

let svgBackdropSupport: boolean | undefined;

/**
 * `backdrop-filter: url(#svg)` only renders in Chromium. Safari and Firefox parse the value but
 * draw nothing, so feature queries are not enough and the engine has to be sniffed.
 * iOS browsers are all WebKit and do not advertise `Chrome/`.
 */
export function supportsSvgBackdropFilter() {
  if (svgBackdropSupport !== undefined) {
    return svgBackdropSupport;
  }

  if (typeof navigator === 'undefined' || typeof CSS === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  // No leading \b: headless Chromium reports "HeadlessChrome/".
  const isChromium = /(Chrome|Chromium)\//.test(userAgent) && !/\bFirefox\//.test(userAgent);
  svgBackdropSupport = isChromium && CSS.supports('backdrop-filter', 'url(#a)');
  return svgBackdropSupport;
}

type Size = { width: number; height: number };

// Reuse recent spring sizes without retaining an unbounded number of maps.
const mapCache = new Map<string, string>();
const MAX_CACHED_MAPS = 32;

function displacementUrl(size: Size, radius: number, bezel: number) {
  const key = [size.width, size.height, radius, bezel].join(':');
  const cached = mapCache.get(key);
  if (cached) return cached;
  const url = createDisplacementMapUrl({ ...size, radius, bezel });
  if (url) {
    mapCache.set(key, url);
    if (mapCache.size > MAX_CACHED_MAPS) mapCache.delete(mapCache.keys().next().value!);
  }
  return url;
}

/** Build before paint and update geometry/map atomically. Resizing never invalidates
 * an already rendered filter or switches the material back to CSS frost.
 */
export function useLiquidGlassFilter(radius: number | 'pill', bezel: number) {
  const ref = useRef<HTMLDivElement>(null);
  const filterId = 'lg-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [snapshot, setSnapshot] = useState<{ size: Size; radius: number; url: string | null } | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let lastKey = '';
    const measure = () => {
      const size = { width: element.offsetWidth, height: element.offsetHeight };
      if (size.width < 2 || size.height < 2) return;
      const resolvedRadius = radius === 'pill' ? Math.min(size.width, size.height) / 2 : radius;
      const key = [size.width, size.height, resolvedRadius, bezel].join(':');
      if (key === lastKey) return;
      lastKey = key;
      const url = supportsSvgBackdropFilter() ? displacementUrl(size, resolvedRadius, bezel) : null;
      setSnapshot({ size, radius: resolvedRadius, url });
    };
    // Layout effects finish before first paint: no delayed frost-to-refraction swap.
    measure();
    const observer = new ResizeObserver(() => {
      // ResizeObserver runs before paint; commit the new map in the same frame.
      flushSync(measure);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [radius, bezel]);

  return {
    ref,
    filterId,
    size: snapshot?.size ?? null,
    mapUrl: snapshot?.url ?? null,
    resolvedRadius: snapshot?.radius ?? 0,
    ready: Boolean(snapshot?.url),
  };
}

/**
 * Points the rim highlight at the cursor. Writes CSS variables directly so pointer movement never
 * re-renders React. The angle is unwrapped so the CSS transition never spins the long way round.
 */
export function useSpecularTracking(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) {
      element?.style.removeProperty('--lg-angle');
      element?.style.removeProperty('--lg-glow');
      element?.style.removeProperty('--lg-px');
      element?.style.removeProperty('--lg-py');
      return undefined;
    }

    let frame = 0;
    let lastAngle: number | null = null;
    let pointer: { x: number; y: number } | null = null;

    const update = () => {
      frame = 0;
      if (!pointer) {
        return;
      }

      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        return;
      }
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      // Conic gradients start at 12 o'clock; atan2 starts at 3 o'clock.
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

      if (lastAngle !== null) {
        angle = lastAngle + ((((angle - lastAngle) % 360) + 540) % 360) - 180;
      }
      lastAngle = angle;

      const reach = Math.max(rect.width, rect.height) * 1.5 + 240;
      const glow = Math.max(0.45, 1 - Math.hypot(dx, dy) / reach);

      element.style.setProperty('--lg-angle', `${angle.toFixed(1)}deg`);
      element.style.setProperty('--lg-glow', glow.toFixed(3));
      element.style.setProperty('--lg-px', `${(pointer.x - rect.left).toFixed(0)}px`);
      element.style.setProperty('--lg-py', `${(pointer.y - rect.top).toFixed(0)}px`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);
}
