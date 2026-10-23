import { describe, expect, it } from 'vitest';
import { resolveWallNumericEntryPoint } from '../wallNumericEntry';

describe('wall numeric entry', () => {
  it('projects a typed length along the current draft direction', () => {
    expect(resolveWallNumericEntryPoint({
      startPoint: [1, 1],
      currentPoint: [4, 5],
      length: 10,
    })).toEqual([7, 9]);
  });

  it('returns null when the current draft direction has no length', () => {
    expect(resolveWallNumericEntryPoint({
      startPoint: [1, 1],
      currentPoint: [1, 1],
      length: 4,
    })).toBeNull();
  });
});
