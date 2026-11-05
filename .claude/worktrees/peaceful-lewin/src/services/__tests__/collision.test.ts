import { describe, it, expect } from 'vitest';
import { checkAABBOverlap, clampToRoom } from '../collision';

describe('checkAABBOverlap', () => {
  it('detects overlap', () => {
    const a = { min: [0,0,0] as [number,number,number], max: [2,2,2] as [number,number,number] };
    const b = { min: [1,1,1] as [number,number,number], max: [3,3,3] as [number,number,number] };
    expect(checkAABBOverlap(a, b)).toBe(true);
  });
  it('no overlap when separated', () => {
    const a = { min: [0,0,0] as [number,number,number], max: [1,1,1] as [number,number,number] };
    const b = { min: [2,2,2] as [number,number,number], max: [3,3,3] as [number,number,number] };
    expect(checkAABBOverlap(a, b)).toBe(false);
  });
});

describe('clampToRoom', () => {
  it('clamps position inside room bounds', () => {
    const room = { x: 0, z: 0, width: 10, depth: 10, height: 3 };
    const pos = clampToRoom([20, 0, 20], [1, 1, 1], room);
    expect(pos[0]).toBeLessThanOrEqual(room.x + room.width / 2);
    expect(pos[2]).toBeLessThanOrEqual(room.z + room.depth / 2);
  });
});
