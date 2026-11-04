import { useLayoutEffect, useState, type RefObject } from 'react';
import { createDisplacementMapDataUrl, isChromiumEngine } from './displacement.js';
import { usePrefersReducedTransparency } from './media.js';

export type DisplacementMapState = {
  enabled: boolean;
  mapUrl: string;
  width: number;
  height: number;
  radius: number;
};

const EMPTY: DisplacementMapState = { enabled: false, mapUrl: '', width: 0, height: 0, radius: 28 };

export function useDisplacementMap(
  surfaceRef: RefObject<HTMLElement | null>,
  options?: { radius?: number; enabled?: boolean },
): DisplacementMapState {
  const reducedTransparency = usePrefersReducedTransparency();
  const radius = options?.radius ?? 28;
  const wantEnabled = (options?.enabled ?? true) && !reducedTransparency && isChromiumEngine();
  const [state, setState] = useState<DisplacementMapState>(EMPTY);

  useLayoutEffect(() => {
    const node = surfaceRef.current;
    if (!node || !wantEnabled) {
      setState(EMPTY);
      return;
    }

    const sync = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const mapUrl = createDisplacementMapDataUrl(width, height, radius);
      setState({ enabled: Boolean(mapUrl), mapUrl, width, height, radius });
    };

    sync();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', sync);
      return () => window.removeEventListener('resize', sync);
    }

    const observer = new ResizeObserver(() => sync());
    observer.observe(node);
    return () => observer.disconnect();
  }, [surfaceRef, wantEnabled, radius]);

  return state;
}
