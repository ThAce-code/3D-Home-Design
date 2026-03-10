import { describe, it, expect } from 'vitest';
import { applySnap, eulerToQuaternion } from '../transform';

describe('applySnap', () => {
  it('snaps value to grid', () => {
    expect(applySnap(1.3, 0.5)).toBe(1.5);
    expect(applySnap(1.1, 0.5)).toBe(1.0);
  });
  it('returns value when snapSize is 0', () => {
    expect(applySnap(1.3, 0)).toBe(1.3);
  });
});

describe('eulerToQuaternion', () => {
  it('returns identity for zero rotation', () => {
    const q = eulerToQuaternion([0, 0, 0]);
    expect(q[0]).toBeCloseTo(0);
    expect(q[1]).toBeCloseTo(0);
    expect(q[2]).toBeCloseTo(0);
    expect(q[3]).toBeCloseTo(1);
  });
});
