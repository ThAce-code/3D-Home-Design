import { create } from 'zustand';

interface KeyboardState {
  keys: Set<string>;
  reset: () => void;
}

export const useKeyboard = create<KeyboardState>((set) => ({
  keys: new Set<string>(),
  reset: () => set({ keys: new Set() }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    useKeyboard.setState((s) => {
      if (s.keys.has(e.code)) return s;
      const next = new Set(s.keys);
      next.add(e.code);
      return { keys: next };
    });
  });
  window.addEventListener('keyup', (e) => {
    useKeyboard.setState((s) => {
      if (!s.keys.has(e.code)) return s;
      const next = new Set(s.keys);
      next.delete(e.code);
      return { keys: next };
    });
  });
  window.addEventListener('blur', () => {
    useKeyboard.getState().reset();
  });
}
