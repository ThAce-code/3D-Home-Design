import { describe, expect, it } from 'vitest';
import {
  createEmptyArchitectureDocument,
  cloneArchitectureDocument,
} from '../document';

describe('createEmptyArchitectureDocument', () => {
  it('creates a single empty level with defaults', () => {
    const doc = createEmptyArchitectureDocument();

    expect(doc.levelOrder).toHaveLength(1);
    expect(doc.levels[doc.levelOrder[0]].wallIds).toEqual([]);
  });

  it('initializes zoneTombstones as an empty array', () => {
    const doc = createEmptyArchitectureDocument();

    expect(doc.zoneTombstones).toEqual([]);
  });
});

describe('cloneArchitectureDocument', () => {
  it('deep-copies zoneTombstones without sharing references', () => {
    const original = createEmptyArchitectureDocument();
    original.zoneTombstones = [{
      id: 'tomb-1',
      levelId: original.levelOrder[0],
      kind: 'room',
      name: 'Living Room',
      geometry: {
        area: 12,
        centroid: [2, 1.5],
        points: [[0, 0], [4, 0], [4, 3], [0, 3]],
      },
      signature: 'v1|v2|v3|v4',
    }];

    const cloned = cloneArchitectureDocument(original);

    // Values are equal
    expect(cloned.zoneTombstones).toEqual(original.zoneTombstones);

    // But references are different (deep copy)
    expect(cloned.zoneTombstones).not.toBe(original.zoneTombstones);
    expect(cloned.zoneTombstones[0]).not.toBe(original.zoneTombstones[0]);
    expect(cloned.zoneTombstones[0].geometry).not.toBe(original.zoneTombstones[0].geometry);
    expect(cloned.zoneTombstones[0].geometry.points).not.toBe(original.zoneTombstones[0].geometry.points);
    expect(cloned.zoneTombstones[0].geometry.points[0]).not.toBe(original.zoneTombstones[0].geometry.points[0]);

    // Mutating the clone does not affect the original
    cloned.zoneTombstones[0].geometry.points[0][0] = 999;
    expect(original.zoneTombstones[0].geometry.points[0][0]).toBe(0);
  });
});
