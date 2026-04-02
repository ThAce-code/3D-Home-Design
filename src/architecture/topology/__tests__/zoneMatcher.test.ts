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

  it('refuses inheritance when two previous rooms overlap a new room too similarly', () => {
    const result = matchZones({
      previousZones: [
        {
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
          zoneId: 'zone-a',
        },
        {
          geometry: {
            area: 12,
            centroid: [2.2, 1.5],
            points: [
              [0.2, 0],
              [4.2, 0],
              [4.2, 3],
              [0.2, 3],
            ],
          },
          levelId: 'level-1',
          signature: '0.2|1.2|2.2|3.2',
          zoneId: 'zone-b',
        },
      ],
      nextLoops: [
        {
          area: 12,
          centroid: [2.1, 1.5],
          levelId: 'level-1',
          points: [
            [0.1, 0],
            [4.1, 0],
            [4.1, 3],
            [0.1, 3],
          ],
          signature: '0.1|1.1|2.1|3.1',
        },
      ],
      epsilon: 1e-6,
    });

    expect(result.reusedZoneIdByLoopIndex.has(0)).toBe(false);
  });
});
