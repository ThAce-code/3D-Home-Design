import { describe, expect, it } from 'vitest';
import { snapPointToVertices } from '../snap';

describe('snapPointToVertices', () => {
  it('snaps a point to an existing vertex within tolerance', () => {
    const result = snapPointToVertices([1.02, 0], [{ id: 'v1', x: 1, y: 0 }], 0.05);

    expect(result.vertexId).toBe('v1');
  });

  it('does not snap when no vertex is within tolerance', () => {
    const result = snapPointToVertices([1.08, 0], [{ id: 'v1', x: 1, y: 0 }], 0.05);

    expect(result.vertexId).toBeNull();
    expect(result.point).toEqual([1.08, 0]);
  });

  it('snaps when a point falls exactly on the tolerance boundary', () => {
    const result = snapPointToVertices([1.05, 0], [{ id: 'v1', x: 1, y: 0 }], 0.05);

    expect(result.vertexId).toBe('v1');
    expect(result.point).toEqual([1, 0]);
  });
});
