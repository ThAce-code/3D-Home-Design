import type { StateCreator } from 'zustand';
import type { AppState } from '../useStore.js';

export interface CameraSlice {
  isFlying: boolean;
  pointerLocked: boolean;
  altUnlocked: boolean;
  hasEnteredOnce: boolean;
  setFlying: (v: boolean) => void;
  setPointerLocked: (v: boolean) => void;
  setAltUnlocked: (v: boolean) => void;
  setHasEnteredOnce: () => void;
}

export const createCameraSlice: StateCreator<AppState, [['zustand/immer', never]], [], CameraSlice> = (set) => ({
  isFlying: false,
  pointerLocked: false,
  altUnlocked: false,
  hasEnteredOnce: false,
  setFlying: (v) => set((s) => { s.isFlying = v; }),
  setPointerLocked: (v) => set((s) => { s.pointerLocked = v; }),
  setAltUnlocked: (v) => set((s) => { s.altUnlocked = v; }),
  setHasEnteredOnce: () => set((s) => { s.hasEnteredOnce = true; }),
});
