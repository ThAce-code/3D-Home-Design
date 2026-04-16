import { describe, expect, it, vi } from 'vitest';
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
  getArchitectureSceneKeyDownEffects,
  getArchitectureSceneKeyUpEffects,
  applyArchitectureInteractionCommands,
  getArchitectureSceneContextMenuEffects,
  getArchitectureScenePoint,
  getArchitectureScenePointerDownEffects,
  getArchitectureScenePointerMoveEffects,
  getWallMeshPointerDownEffects,
  getZoneMeshPointerDownEffects,
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

  it('builds zone selection commands for select-tool plane clicks inside a zone', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);
    document = applyDrawWall(document, [0, 3], [0, 0]);

    const result = getArchitectureScenePointerDownEffects({
      activeTool: 'select',
      document,
      draftWall: null,
      point: [2, 1.5],
      viewport: createDefaultViewport(),
      wallTool: createDefaultWallToolState(),
    });

    expect(result.shouldStopPropagation).toBe(true);
    expect(result.commands).toEqual([
      {
        type: 'set-selection',
        selection: {
          vertexIds: [],
          wallIds: [],
          zoneIds: [document.zoneOrder[0]],
        },
      },
    ]);
  });

  it('builds draft start commands when the wall tool receives its first plane click', () => {
    const result = getArchitectureScenePointerDownEffects({
      activeTool: 'wall',
      document: createEmptyArchitectureDocument(),
      draftWall: null,
      point: [0, 0],
      viewport: createDefaultViewport(),
      wallTool: createDefaultWallToolState(),
    });

    expect(result.shouldStopPropagation).toBe(true);
    expect(result.commands).toEqual([
      {
        type: 'set-wall-closure-preview',
        candidate: null,
      },
      {
        type: 'start-draft-wall',
        draftWall: {
          startPoint: [0, 0],
          currentPoint: [0, 0],
          snappedVertexId: null,
        },
      },
    ]);
  });

  it('builds document commit commands when the wall tool completes a draft', () => {
    const result = getArchitectureScenePointerDownEffects({
      activeTool: 'wall',
      document: createEmptyArchitectureDocument(),
      draftWall: {
        startPoint: [0, 0],
        currentPoint: [4, 0],
        snappedVertexId: null,
      },
      point: [4, 0],
      viewport: createDefaultViewport(),
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    expect(result.shouldStopPropagation).toBe(true);
    expect(result.commands.map((command) => command.type)).toEqual([
      'set-wall-closure-preview',
      'replace-document',
      'commit-draft-wall',
    ]);
    expect(result.commands[0]).toEqual({
      type: 'set-wall-closure-preview',
      candidate: null,
    });
    expect(result.commands[1]?.type).toBe('replace-document');
    if (result.commands[1]?.type === 'replace-document') {
      expect(result.commands[1].document.wallOrder).toHaveLength(1);
    }
  });

  it('builds cursor and draft update commands from wall pointer movement', () => {
    const result = getArchitectureScenePointerMoveEffects({
      activeTool: 'wall',
      document: createEmptyArchitectureDocument(),
      draftWall: {
        startPoint: [0, 0],
        currentPoint: [0, 0],
        snappedVertexId: null,
      },
      point: [3, 1],
      viewport: createDefaultViewport(),
      wallTool: updateWallToolModifiers(armWallTool(createDefaultWallToolState()), { shiftKey: true }),
    });

    expect(result.commands).toEqual([
      {
        type: 'set-cursor-point',
        point: [3, 0],
      },
      {
        type: 'set-wall-closure-preview',
        candidate: null,
      },
      {
        type: 'update-draft-wall',
        draftWall: {
          startPoint: [0, 0],
          currentPoint: [3, 0],
          snappedVertexId: null,
        },
      },
    ]);
  });

  it('builds wall-tool keyboard commands only for the wall tool', () => {
    expect(getArchitectureSceneKeyDownEffects({ activeTool: 'select', key: 'Shift' })).toEqual({
      commands: [],
    });

    expect(getArchitectureSceneKeyDownEffects({ activeTool: 'wall', key: 'Shift' })).toEqual({
      commands: [
        {
          type: 'set-wall-tool-modifiers',
          modifiers: { shiftKey: true },
        },
      ],
    });
    expect(getArchitectureSceneKeyDownEffects({ activeTool: 'wall', key: 'Alt' })).toEqual({
      commands: [
        {
          type: 'set-wall-tool-modifiers',
          modifiers: { altKey: true },
        },
      ],
    });
    expect(getArchitectureSceneKeyDownEffects({ activeTool: 'wall', key: 'Tab' })).toEqual({
      commands: [
        {
          type: 'set-wall-numeric-entry-enabled',
          enabled: true,
        },
      ],
      shouldPreventDefault: true,
    });
    expect(getArchitectureSceneKeyDownEffects({ activeTool: 'wall', key: 'Escape' })).toEqual({
      commands: [
        {
          type: 'set-wall-closure-preview',
          candidate: null,
        },
        {
          type: 'set-wall-numeric-entry-enabled',
          enabled: false,
        },
        {
          type: 'cancel-draft-wall',
        },
      ],
    });
    expect(getArchitectureSceneKeyUpEffects({ activeTool: 'wall', key: 'Shift' })).toEqual({
      commands: [
        {
          type: 'set-wall-tool-modifiers',
          modifiers: { shiftKey: false },
        },
      ],
    });
    expect(getArchitectureSceneKeyUpEffects({ activeTool: 'wall', key: 'Alt' })).toEqual({
      commands: [
        {
          type: 'set-wall-tool-modifiers',
          modifiers: { altKey: false },
        },
      ],
    });
  });

  it('builds delete commands when the delete tool clicks a wall mesh', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    const wallId = document.wallOrder[0];

    const result = getWallMeshPointerDownEffects({
      activeTool: 'delete',
      document,
      wallId,
      intersections: [],
    });

    expect(result.shouldStopPropagation).toBe(true);
    expect(result.commands.map((command) => command.type)).toEqual([
      'replace-document',
      'set-selection',
    ]);
    expect(result.commands[1]).toEqual({
      type: 'set-selection',
      selection: {
        vertexIds: [],
        wallIds: [],
        zoneIds: [],
      },
    });
  });

  it('prefers selecting the containing zone when a wall click resolves to interior ground away from the wall footprint', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);
    document = applyDrawWall(document, [0, 3], [0, 0]);
    const wallId = document.wallOrder[0];
    const zoneId = document.zoneOrder[0];

    const result = getWallMeshPointerDownEffects({
      activeTool: 'select',
      document,
      wallId,
      intersections: [
        {
          objectName: 'architecture-interaction-plane',
          point: [2, 1.5],
        },
      ],
    });

    expect(result.shouldStopPropagation).toBe(true);
    expect(result.commands).toEqual([
      {
        type: 'set-selection',
        selection: {
          vertexIds: [],
          wallIds: [],
          zoneIds: [zoneId],
        },
      },
    ]);
  });

  it('keeps wall selection when the click stays near the wall footprint', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);
    document = applyDrawWall(document, [0, 3], [0, 0]);
    const wallId = document.wallOrder[0];

    const result = getWallMeshPointerDownEffects({
      activeTool: 'select',
      document,
      wallId,
      intersections: [
        {
          objectName: 'architecture-interaction-plane',
          point: [2, 0.01],
        },
      ],
    });

    expect(result.shouldStopPropagation).toBe(true);
    expect(result.commands).toEqual([
      {
        type: 'set-selection',
        selection: {
          vertexIds: [],
          wallIds: [wallId],
          zoneIds: [],
        },
      },
    ]);
  });

  it('builds zone selection commands when the select tool clicks a zone mesh', () => {
    const result = getZoneMeshPointerDownEffects({
      activeTool: 'select',
      zoneId: 'z-room',
    });

    expect(result.shouldStopPropagation).toBe(true);
    expect(result.commands).toEqual([
      {
        type: 'set-selection',
        selection: {
          vertexIds: [],
          wallIds: [],
          zoneIds: ['z-room'],
        },
      },
    ]);
  });

  it('ignores zone mesh clicks when the active tool is not select', () => {
    const result = getZoneMeshPointerDownEffects({
      activeTool: 'wall',
      zoneId: 'z-room',
    });

    expect(result.shouldStopPropagation).toBe(false);
    expect(result.commands).toEqual([]);
  });

  it('applies interaction commands through shared handlers in order', () => {
    const handlers = {
      setSelection: vi.fn(),
      setWallClosurePreview: vi.fn(),
      startDraftWall: vi.fn(),
      replaceDocument: vi.fn(),
      commitDraftWall: vi.fn(),
      setCursorPoint: vi.fn(),
      updateDraftWall: vi.fn(),
      setWallToolModifiers: vi.fn(),
      setWallNumericEntryEnabled: vi.fn(),
      cancelDraftWall: vi.fn(),
    };
    const document = createEmptyArchitectureDocument();

    applyArchitectureInteractionCommands(
      [
        {
          type: 'set-selection',
          selection: {
            vertexIds: [],
            wallIds: ['w1'],
            zoneIds: [],
          },
        },
        {
          type: 'replace-document',
          document,
        },
        {
          type: 'set-wall-numeric-entry-enabled',
          enabled: true,
        },
        {
          type: 'cancel-draft-wall',
        },
      ],
      handlers,
    );

    expect(handlers.setSelection).toHaveBeenCalledWith({
      vertexIds: [],
      wallIds: ['w1'],
      zoneIds: [],
    });
    expect(handlers.replaceDocument).toHaveBeenCalledWith(document);
    expect(handlers.setWallNumericEntryEnabled).toHaveBeenCalledWith(true);
    expect(handlers.cancelDraftWall).toHaveBeenCalledTimes(1);
    expect(handlers.setSelection.mock.invocationCallOrder[0]).toBeLessThan(
      handlers.replaceDocument.mock.invocationCallOrder[0],
    );
    expect(handlers.replaceDocument.mock.invocationCallOrder[0]).toBeLessThan(
      handlers.setWallNumericEntryEnabled.mock.invocationCallOrder[0],
    );
  });

  it('extracts a 2D scene point from an R3F-style event payload', () => {
    expect(getArchitectureScenePoint({ point: { x: 3.5, z: -1.25 } })).toEqual([3.5, -1.25]);
    expect(getArchitectureScenePoint({})).toBeNull();
  });

  it('builds cancel commands for architecture-scene context menu events', () => {
    const result = getArchitectureSceneContextMenuEffects();

    expect(result.shouldStopPropagation).toBe(true);
    expect(result.commands).toEqual([
      {
        type: 'set-wall-closure-preview',
        candidate: null,
      },
      {
        type: 'cancel-draft-wall',
      },
    ]);
  });
});
