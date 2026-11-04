import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { buildZoneAreaDescriptors, getZoneArea, getZoneCentroid } from '../zoneArea';

describe('zoneArea', () => {
  it('computes rectangle area and centroid', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];

    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
      v3: { id: 'v3', x: 4, y: 3 },
      v4: { id: 'v4', x: 0, y: 3 },
    };
    document.zones = {
      z1: {
        id: 'z1',
        levelId,
        boundaryVertexIds: ['v1', 'v2', 'v3', 'v4'],
        kind: 'living_room',
        name: '客厅',
      },
    };
    document.zoneOrder = ['z1'];

    expect(getZoneArea(document, 'z1')).toBe(12);
    expect(getZoneCentroid([
      [0, 0],
      [4, 0],
      [4, 3],
      [0, 3],
    ])).toEqual([2, 1.5]);
    expect(buildZoneAreaDescriptors(document)).toEqual([
      {
        zoneId: 'z1',
        area: 12,
        centroid: [2, 1.5],
        name: '客厅',
        kind: 'living_room',
      },
    ]);
  });
});
