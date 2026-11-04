import { useSyncExternalStore } from 'react';
import { isChromiumEngine } from './displacement.js';

function subscribeToMediaQuery(query: string, onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const media = window.matchMedia(query);
  const listener = () => onChange();
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

function getMediaMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeToMediaQuery('(prefers-reduced-motion: reduce)', onChange),
    () => getMediaMatches('(prefers-reduced-motion: reduce)'),
    () => false,
  );
}

export function usePrefersReducedTransparency(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeToMediaQuery('(prefers-reduced-transparency: reduce)', onChange),
    () => getMediaMatches('(prefers-reduced-transparency: reduce)'),
    () => false,
  );
}

export function useIsChromiumEngine(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => isChromiumEngine(),
    () => false,
  );
}
