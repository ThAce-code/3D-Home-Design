import { describe, expect, it } from 'vitest';
import { intersectSegments } from '../intersections';

describe('intersectSegments', () => {
  it('returns an intersection for crossing wall segments', () => {
    const hit = intersectSegments([0, 0], [4, 0], [2, -2], [2, 2]);

    expect(hit?.point).toEqual([2, 0]);
  });

  it('returns null for parallel wall segments', () => {
    const hit = intersectSegments([0, 0], [4, 0], [0, 1], [4, 1]);

    expect(hit).toBeNull();
  });

  it('returns the shared endpoint when segments touch at an endpoint', () => {
    const hit = intersectSegments([0, 0], [2, 0], [2, 0], [2, 2]);

    expect(hit?.point).toEqual([2, 0]);
  });
});
