import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { applyDrawWall } from '../../topology/repair';
import { createDefaultViewport } from '../tools';
import {
  armWallTool,
  createDefaultWallToolState,
  updateWallToolModifiers,
} from '../wallTool';
import {
  advanceWallDraftInteraction,
  updateWallDraftPointer,
} from '../interaction';

describe('wall draft interaction', () => {
  it('commits the existing draft preview point instead of recomputing a new axis lock from the click point', () => {
    const document = createEmptyArchitectureDocument();
    const viewport = createDefaultViewport();
    const shiftedWallTool = updateWallToolModifiers(armWallTool(createDefaultWallToolState()), {
      shiftKey: true,
    });

    const started = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: null,
      point: [0, 0],
      viewport,
      wallTool: createDefaultWallToolState(),
    });
    const updated = updateWallDraftPointer({
      activeTool: 'wall',
      document,
      draftWall: started.draftWall,
      point: [3, 1],
      viewport,
      wallTool: shiftedWallTool,
    });

    expect(updated.draftWall?.currentPoint).toEqual([3, 0]);

    const committed = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: updated.draftWall,
      point: [1, 3],
      viewport,
      wallTool: shiftedWallTool,
    });
    const wall = committed.document.walls[committed.document.wallOrder[0] ?? ''];

    expect(wall).toBeDefined();
    expect(wall ? committed.document.vertices[wall.endVertexId] : null).toMatchObject({
      x: 3,
      y: 0,
    });
  });

  it('still allows a near-closing click to snap onto the start vertex and rebuild the zone', () => {
    const viewport = createDefaultViewport();
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);

    const committed = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: {
        startPoint: [0, 3],
        currentPoint: [0.16, 0.12],
        snappedVertexId: null,
      },
      point: [0.08, 0.04],
      viewport,
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    expect(committed.document.zoneOrder).toHaveLength(1);
    expect(committed.document.zones[committed.document.zoneOrder[0] ?? '']?.boundaryVertexIds).toHaveLength(4);
  });

  it('snaps the first click onto an existing wall body so a T-junction splits correctly', () => {
    const viewport = createDefaultViewport();
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);

    const started = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: null,
      point: [2.02, 0.03],
      viewport: {
        ...viewport,
        snapTolerance: 0.15,
      },
      wallTool: createDefaultWallToolState(),
    });

    expect(started.draftWall?.startPoint).toEqual([2.02, 0]);

    const updated = updateWallDraftPointer({
      activeTool: 'wall',
      document,
      draftWall: started.draftWall,
      point: [2.02, 2],
      viewport: {
        ...viewport,
        snapTolerance: 0.15,
      },
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    const committed = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: updated.draftWall,
      point: [2.02, 2],
      viewport: {
        ...viewport,
        snapTolerance: 0.15,
      },
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    expect(committed.document.wallOrder).toHaveLength(3);
    expect(Object.values(committed.document.vertices).some((vertex) => vertex.x === 2.02 && vertex.y === 0)).toBe(true);
  });

  it('still allows the final wall of an inner rectangle to close near its start point inside an outer room', () => {
    const viewport = createDefaultViewport();
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [8, 0]);
    document = applyDrawWall(document, [8, 0], [8, 8]);
    document = applyDrawWall(document, [8, 8], [0, 8]);
    document = applyDrawWall(document, [0, 8], [0, 0]);
    document = applyDrawWall(document, [2, 2], [6, 2]);
    document = applyDrawWall(document, [6, 2], [6, 6]);
    document = applyDrawWall(document, [6, 6], [2, 6]);

    const committed = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: {
        startPoint: [2, 6],
        currentPoint: [2.18, 2.12],
        snappedVertexId: null,
      },
      point: [2.05, 2.03],
      viewport,
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    expect(committed.document.zoneOrder).toHaveLength(2);
  });
});
