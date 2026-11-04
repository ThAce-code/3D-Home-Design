import {
  useCallback,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { usePrefersReducedMotion } from './media.js';

export type PointerHighlightState = {
  x: number;
  y: number;
  active: boolean;
};

export type UsePointerHighlightResult = {
  highlightStyle: CSSProperties;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  enabled: boolean;
  state: PointerHighlightState;
  filterId: string;
};

const IDLE: PointerHighlightState = { x: 50, y: 50, active: false };

export function usePointerHighlight(
  surfaceRef?: RefObject<HTMLElement | null>,
  options?: { enabled?: boolean; radiusPx?: number },
): UsePointerHighlightResult {
  const reducedMotion = usePrefersReducedMotion();
  const enabled = (options?.enabled ?? true) && !reducedMotion;
  const radiusPx = options?.radiusPx ?? 220;
  const filterId = useId().replace(/:/g, '');
  const [state, setState] = useState<PointerHighlightState>(IDLE);

  useEffect(() => {
    if (!enabled) setState(IDLE);
  }, [enabled]);

  const updateFromEvent = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      const target = surfaceRef?.current ?? event.currentTarget;
      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setState({ x, y, active: true });
    },
    [enabled, surfaceRef],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => updateFromEvent(event), [updateFromEvent]);
  const onPointerEnter = useCallback((event: ReactPointerEvent<HTMLElement>) => updateFromEvent(event), [updateFromEvent]);
  const onPointerLeave = useCallback(() => setState((prev) => ({ ...prev, active: false })), []);

  const highlightStyle: CSSProperties = enabled
    ? {
        background: `radial-gradient(circle ${radiusPx}px at ${state.x}% ${state.y}%, rgba(255,255,255,${state.active ? 0.42 : 0}), transparent 72%)`,
        opacity: state.active ? 1 : 0,
        mixBlendMode: 'overlay',
      }
    : { opacity: 0 };

  return { highlightStyle, onPointerMove, onPointerEnter, onPointerLeave, enabled, state, filterId };
}
