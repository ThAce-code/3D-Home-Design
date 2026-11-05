import { describe, it, expect, beforeEach } from 'vitest';
import { useKeyboard } from '../useKeyboard';

describe('useKeyboard', () => {
  beforeEach(() => { useKeyboard.getState().reset(); });

  it('tracks keydown', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(useKeyboard.getState().keys.has('KeyW')).toBe(true);
  });
  it('tracks keyup', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(useKeyboard.getState().keys.has('KeyW')).toBe(false);
  });
  it('reset clears all keys', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    useKeyboard.getState().reset();
    expect(useKeyboard.getState().keys.size).toBe(0);
  });
});
