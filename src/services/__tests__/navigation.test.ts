import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../../store/useStore';
import { enterSceneNavigation } from '../navigation';

describe('enterSceneNavigation', () => {
  let canvas: HTMLCanvasElement;
  let lockedElement: Element | null;
  let originalLockDescriptor: PropertyDescriptor | undefined;
  const requestLock = vi.fn<() => Promise<void>>();

  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    lockedElement = null;
    originalLockDescriptor = Object.getOwnPropertyDescriptor(document, 'pointerLockElement');
    Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => lockedElement });
    Object.defineProperty(canvas, 'requestPointerLock', { value: requestLock });
    requestLock.mockReset();
    requestLock.mockImplementation(async () => { lockedElement = canvas; });
  });

  afterEach(() => {
    canvas.remove();
    if (originalLockDescriptor) {
      Object.defineProperty(document, 'pointerLockElement', originalLockDescriptor);
    } else {
      Reflect.deleteProperty(document, 'pointerLockElement');
    }
    useStore.setState(useStore.getInitialState());
  });

  it('records a successful lock even before the canvas control effects run', async () => {
    expect(await enterSceneNavigation()).toBe(true);
    expect(useStore.getState().pointerLocked).toBe(true);
    expect(useStore.getState().hasEnteredOnce).toBe(true);
  });

  it('keeps the welcome state available when the browser rejects a lock', async () => {
    requestLock.mockRejectedValue(new Error('pointer lock denied'));
    expect(await enterSceneNavigation()).toBe(false);
    expect(useStore.getState().pointerLocked).toBe(false);
    expect(useStore.getState().hasEnteredOnce).toBe(false);
  });

  it('does not report success without the actual native lock', async () => {
    requestLock.mockResolvedValue(undefined);
    expect(await enterSceneNavigation()).toBe(false);
    expect(useStore.getState().hasEnteredOnce).toBe(false);
  });

  it('does not request navigation before the canvas exists', async () => {
    canvas.remove();
    expect(await enterSceneNavigation()).toBe(false);
    expect(requestLock).not.toHaveBeenCalled();
  });
});
