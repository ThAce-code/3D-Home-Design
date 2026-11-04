import { useSyncExternalStore } from 'react';

export type AppRoute = 'landing' | 'editor' | 'liquid-glass';

function normalizeRoute(pathname: string): AppRoute {
  if (pathname.startsWith('/editor')) return 'editor';
  if (pathname.startsWith('/liquid-glass')) return 'liquid-glass';
  return 'landing';
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);
  return () => window.removeEventListener('popstate', onStoreChange);
}

function getSnapshot() {
  return normalizeRoute(window.location.pathname);
}

export function useAppRoute() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'landing' as AppRoute);
}

export function navigateTo(pathname: '/' | '/editor' | '/liquid-glass') {
  if (window.location.pathname === pathname) {
    return;
  }

  window.history.pushState({}, '', pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
