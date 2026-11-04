import { useCallback, useSyncExternalStore } from 'react';

export type LandingAppearance = 'day' | 'night';

export const LANDING_THEME_STORAGE_KEY = 'facility-landing-theme';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readStoredAppearance(): LandingAppearance {
  if (typeof window === 'undefined') return 'day';
  try {
    const value = window.localStorage.getItem(LANDING_THEME_STORAGE_KEY);
    return value === 'night' ? 'night' : 'day';
  } catch {
    return 'day';
  }
}

let current: LandingAppearance = typeof window === 'undefined' ? 'day' : readStoredAppearance();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return current;
}

export function getLandingAppearance(): LandingAppearance {
  return current;
}

export function setLandingAppearance(next: LandingAppearance) {
  current = next;
  try {
    window.localStorage.setItem(LANDING_THEME_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.landingAppearance = next;
  }
  emit();
}

export function toggleLandingAppearance(): LandingAppearance {
  const next = current === 'day' ? 'night' : 'day';
  setLandingAppearance(next);
  return next;
}

export function hydrateLandingAppearance() {
  const stored = readStoredAppearance();
  current = stored;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.landingAppearance = stored;
  }
  emit();
}

export function useLandingAppearance() {
  const appearance = useSyncExternalStore(subscribe, getSnapshot, () => 'day' as LandingAppearance);
  const setAppearance = useCallback((next: LandingAppearance) => {
    setLandingAppearance(next);
  }, []);
  const toggle = useCallback(() => toggleLandingAppearance(), []);
  return { appearance, setAppearance, toggle };
}
