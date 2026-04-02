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

  it('does not reuse a zone id across levels even when the geometry matches', () => {
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
        levelId: 'level-2',
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

    expect(result.reusedZoneIdByLoopIndex.has(0)).toBe(false);
  });

  it('uses each old zone id at most once across matching loops', () => {
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
      nextLoops: [
        {
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
        },
        {
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
        },
      ],
      epsilon: 1e-6,
    });

    expect(result.reusedZoneIdByLoopIndex.size).toBe(1);
    expect(result.reusedZoneIdByLoopIndex.get(0)).toBe('zone-living');
    expect(result.reusedZoneIdByLoopIndex.has(1)).toBe(false);
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

  it('inherits the primary split child when one room becomes two rooms', () => {
    const result = matchZones({
      previousZones: [{
        geometry: {
          area: 16,
          centroid: [2, 2],
          points: [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
          ],
        },
        levelId: 'level-1',
        signature: '0|1|2|3',
        zoneId: 'zone-living',
      }],
      nextLoops: [
        {
          area: 8.5,
          centroid: [1.44, 1.44],
          levelId: 'level-1',
          points: [
            [0, 0],
            [4, 0],
            [4, 1],
            [1.5, 1],
            [1.5, 4],
            [0, 4],
          ],
          signature: '0|1|2|3|4|5',
        },
        {
          area: 7.5,
          centroid: [2.75, 2.5],
          levelId: 'level-1',
          points: [
            [1.5, 1],
            [4, 1],
            [4, 4],
            [1.5, 4],
          ],
          signature: '1|2|3|4',
        },
      ],
      epsilon: 1e-6,
    });

    expect(result.reusedZoneIdByLoopIndex.get(0)).toBe('zone-living');
    expect(result.reusedZoneIdByLoopIndex.has(1)).toBe(false);
  });
});
