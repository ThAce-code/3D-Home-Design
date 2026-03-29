import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { saveState, loadState } from '../services/persistence.js';

const SAVE_DEBOUNCE = 2000;

export function usePersistence(enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load on startup
  useEffect(() => {
    if (!enabled) {
      return;
    }

    loadState().then((data) => {
      if (!data) return;
      useStore.setState({
        items: data.items ?? [],
      });
    });
  }, [enabled]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let prevItems = useStore.getState().items;

    const unsub = useStore.subscribe((state) => {
      if (state.items === prevItems) return;
      prevItems = state.items;

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveState({ items: state.items });
      }, SAVE_DEBOUNCE);
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, [enabled]);
}
