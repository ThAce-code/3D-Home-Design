import { describe, it, expect } from 'vitest';
import { autoScale } from '../asset';

describe('autoScale', () => {
  it('scales down large models', () => {
    const s = autoScale({ size: [100, 100, 100], min: [0, 0, 0] });
    expect(s).toBeCloseTo(1.5 / 100);
  });
  it('scales up tiny models', () => {
    const s = autoScale({ size: [0.01, 0.01, 0.01], min: [0, 0, 0] });
    expect(s).toBeCloseTo(1.5 / 0.01);
  });
  it('returns 1 for normal-sized models', () => {
    const s = autoScale({ size: [1, 1.5, 0.8], min: [0, 0, 0] });
    expect(s).toBe(1);
  });
  it('accepts custom targetMaxDim', () => {
    const s = autoScale({ size: [100, 100, 100], min: [0, 0, 0] }, 2);
    expect(s).toBeCloseTo(2 / 100);
  });
});
