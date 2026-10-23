import { useStore } from '../store/useStore.js';

export async function enterSceneNavigation(): Promise<boolean> {
  const canvas = document.querySelector('canvas');
  if (!canvas) return false;

  try {
    await canvas.requestPointerLock();
    if (document.pointerLockElement !== canvas) return false;
    const state = useStore.getState();
    state.setPointerLocked(true);
    state.setHasEnteredOnce();
    return true;
  } catch {
    return false;
  }
}
