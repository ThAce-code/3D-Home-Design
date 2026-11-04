import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import {
  getTrimExtendCommitEffects,
  intersectInfiniteLines,
  resolveTrimEndpoint,
  trimExtendWallToAxis,
  trimExtendWallToWall,
} from '../trimExtendInteraction';

function createLWallDocument() {
  const document = createEmptyArchitectureDocument();
  const levelId = document.levelOrder[0];
  const level = document.levels[levelId];

  document.vertices = {
    v1: { id: 'v1', x: 0, y: 0 },
    v2: { id: 'v2', x: 4, y: 0 },
    v3: { id: 'v3', x: 2, y: 1 },
    v4: { id: 'v4', x: 2, y: 3 },
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
    w2: {
      id: 'w2',
      levelId,
      startVertexId: 'v3',
      endVertexId: 'v4',
      thickness: level.defaultWallThickness,
      height: level.defaultWallHeight,
      kind: 'structural',
    },
  };
  document.wallOrder = ['w1', 'w2'];

  return document;
}

describe('trimExtendInteraction', () => {
  it('computes infinite line intersections and endpoint choice', () => {
    const hit = intersectInfiniteLines(
      { start: [0, 0], end: [4, 0] },
      { start: [2, 1], end: [2, 3] },
    );

    expect(hit).toMatchObject({
      point: [2, 0],
      t: 0.5,
    });
    expect(resolveTrimEndpoint(0.2)).toBe('start');
    expect(resolveTrimEndpoint(0.8)).toBe('end');
  });

  it('extends a vertical wall down to meet a horizontal wall', () => {
    const document = createLWallDocument();
    const next = trimExtendWallToWall(document, 'w2', 'w1');

    expect(next?.vertices.v3).toMatchObject({ x: 2, y: 0 });
    expect(next?.vertices.v4).toMatchObject({ x: 2, y: 3 });
  });

  it('trims a wall endpoint to a horizontal axis through a point', () => {
    const document = createLWallDocument();
    const next = trimExtendWallToAxis(document, 'w2', [0, 0.5], 'horizontal');

    expect(next?.vertices.v3).toMatchObject({ x: 2, y: 0.5 });
    expect(next?.vertices.v4).toMatchObject({ x: 2, y: 3 });
  });

  it('builds history-aware replace-document commit effects', () => {
    const document = createLWallDocument();
    const commands = getTrimExtendCommitEffects({
      document,
      wallId: 'w2',
      targetWallId: 'w1',
    });

    expect(commands.map((command) => command.type)).toEqual([
      'replace-document',
      'set-selection',
    ]);
    expect(commands[0]?.type).toBe('replace-document');
    if (commands[0]?.type === 'replace-document') {
      expect(commands[0].document.vertices.v3).toMatchObject({ x: 2, y: 0 });
    }
  });
});
