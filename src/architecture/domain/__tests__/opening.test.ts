import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../document';
import { reduceArchitectureCommand } from '../../editing/reducers';
import { clampOpeningT, createOpeningDefaults } from '../opening';

describe('opening domain', () => {
  it('provides door and window defaults', () => {
    expect(createOpeningDefaults('door')).toEqual({
      width: 0.9,
      height: 2.1,
      sillHeight: 0,
    });
    expect(createOpeningDefaults('window').sillHeight).toBe(0.9);
    expect(clampOpeningT(1.4)).toBe(1);
    expect(clampOpeningT(-0.2)).toBe(0);
  });

  it('adds openings to a wall and keeps them through clone', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
    };
    document.walls = {
      w1: {
        id: 'w1',
        levelId,
        startVertexId: 'v1',
        endVertexId: 'v2',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
    };
    document.wallOrder = ['w1'];

    const withOpening = reduceArchitectureCommand(document, {
      type: 'ADD_OPENING',
      wallId: 'w1',
      kind: 'door',
      t: 0.5,
    });

    expect(withOpening.openingOrder).toHaveLength(1);
    const openingId = withOpening.openingOrder[0];
    expect(withOpening.openings[openingId]).toMatchObject({
      wallId: 'w1',
      kind: 'door',
      t: 0.5,
      width: 0.9,
    });

    const deletedWall = reduceArchitectureCommand(withOpening, {
      type: 'DELETE_WALL',
      wallId: 'w1',
    });
    expect(deletedWall.openingOrder).toEqual([]);
    expect(deletedWall.openings).toEqual({});
  });
});
