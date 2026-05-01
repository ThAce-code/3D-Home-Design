import { describe, expect, it } from 'vitest';
import {
  cloneArchitectureDocument,
  createEmptyArchitectureDocument,
} from '../document';

describe('createEmptyArchitectureDocument', () => {
  it('creates a single empty level with defaults', () => {
    const doc = createEmptyArchitectureDocument();

    expect(doc.levelOrder).toHaveLength(1);
    expect(doc.levels[doc.levelOrder[0]].wallIds).toEqual([]);
  });

  it('starts with no zone tombstones', () => {
    const doc = createEmptyArchitectureDocument();

    expect(doc.zoneTombstones).toEqual([]);
  });
});

describe('cloneArchitectureDocument', () => {
  it('deep clones zone tombstone geometry', () => {
    const doc = createEmptyArchitectureDocument();
    const levelId = doc.levelOrder[0];
    doc.zoneTombstones = [{
      id: 'zone-living',
      levelId,
      kind: 'room',
      name: 'Living Room',
      geometry: {
        area: 12,
        centroid: [2, 1.5],
        points: [
          [0, 0],
          [4, 0],
          [4, 3],
          [0, 3],
        ],
      },
      signature: 'v1|v2|v3|v4',
    }];

    const clone = cloneArchitectureDocument(doc);

    clone.zoneTombstones[0].geometry.centroid[0] = 99;
    clone.zoneTombstones[0].geometry.points[0][0] = 99;

    expect(doc.zoneTombstones[0].geometry.centroid[0]).toBe(2);
    expect(doc.zoneTombstones[0].geometry.points[0][0]).toBe(0);
  });
});
