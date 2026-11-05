import { describe, it, expect } from 'vitest';
import { createRoom, validateRoomDimensions } from '../room';

describe('createRoom', () => {
  it('creates room with given dimensions', () => {
    const r = createRoom({ width: 5, depth: 4, height: 3 });
    expect(r.width).toBe(5);
    expect(r.depth).toBe(4);
    expect(r.height).toBe(3);
    expect(r.id).toBeTruthy();
  });
});

describe('validateRoomDimensions', () => {
  it('clamps dimensions to min/max', () => {
    const d = validateRoomDimensions({ width: 0.5, depth: 100, height: -1 });
    expect(d.width).toBeGreaterThanOrEqual(1);
    expect(d.depth).toBeLessThanOrEqual(50);
    expect(d.height).toBeGreaterThanOrEqual(1);
  });
});
