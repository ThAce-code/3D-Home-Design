import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { saveState, loadState } from '../services/persistence.js';

const SAVE_DEBOUNCE = 2000;

export function usePersistence() {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load on startup
  useEffect(() => {
    loadState().then((data) => {
      if (!data) return;
      useStore.setState({
        rooms: data.rooms ?? [],
        items: data.items ?? [],
      });
      useStore.getState().recalculateAdjacency();
    });
  }, []);

  // Auto-save on changes (debounced)
  useEffect(() => {
    let prevRooms = useStore.getState().rooms;
    let prevItems = useStore.getState().items;

    const unsub = useStore.subscribe((state) => {
      if (state.rooms === prevRooms && state.items === prevItems) return;
      prevRooms = state.rooms;
      prevItems = state.items;

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveState({ rooms: state.rooms, items: state.items });
      }, SAVE_DEBOUNCE);
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, []);
}
