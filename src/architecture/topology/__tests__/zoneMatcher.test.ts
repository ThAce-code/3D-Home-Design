import { describe, expect, it } from 'vitest';
import { matchZones } from '../zoneMatcher.js';

describe('matchZones', () => {
  it('reuses the old zone id for a one-to-one overlap match', () => {
    const result = matchZones({
      previousZones: [{
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
        levelId: 'level-1',
        signature: '0|1|2|3',
        zoneId: 'zone-living',
      }],
      nextLoops: [{
        area: 12,
        centroid: [2, 1.5],
        levelId: 'level-1',
        points: [
          [0, 0],
          [4, 0],
          [4, 3],
          [0, 3],
        ],
        signature: '0|1|2|3',
      }],
      epsilon: 1e-6,
    });

    expect(result.reusedZoneIdByLoopIndex.get(0)).toBe('zone-living');
  });
});
