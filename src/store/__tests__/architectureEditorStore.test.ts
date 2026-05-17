import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../architecture/domain/document';
import { useArchitectureEditorStore } from '../architectureEditorStore';

function createDocumentWithWall() {
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

  return document;
}

describe('architectureEditorStore', () => {
  beforeEach(() => {
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
  });

  it('starts with wall drafting disabled and snap enabled', () => {
    const state = useArchitectureEditorStore.getState();

    expect(state.activeTool).toBe('select');
    expect(state.draftWall).toBeNull();
    expect(state.viewport.snapEnabled).toBe(true);
  });

  it('starts a draft wall and updates the current cursor point', () => {
    useArchitectureEditorStore.getState().startDraftWall([0, 0], 'v1');
    useArchitectureEditorStore.getState().updateDraftWall([4, 0], 'v2');

    expect(useArchitectureEditorStore.getState().draftWall).toEqual({
      startPoint: [0, 0],
      currentPoint: [4, 0],
      snappedVertexId: 'v2',
    });
  });

  it('clears draft wall state after commit', () => {
    useArchitectureEditorStore.getState().startDraftWall([0, 0], null);

    useArchitectureEditorStore.getState().commitDraftWall();

    expect(useArchitectureEditorStore.getState().draftWall).toBeNull();
  });

  it('clears draft wall state after cancel', () => {
    useArchitectureEditorStore.getState().startDraftWall([0, 0], null);

    useArchitectureEditorStore.getState().cancelDraftWall();

    expect(useArchitectureEditorStore.getState().draftWall).toBeNull();
  });

  it('drops an in-progress wall draft when switching away from the wall tool', () => {
    useArchitectureEditorStore.getState().startDraftWall([0, 0], null);

    useArchitectureEditorStore.getState().setActiveTool('select');

    expect(useArchitectureEditorStore.getState().activeTool).toBe('select');
    expect(useArchitectureEditorStore.getState().draftWall).toBeNull();
  });

  it('starts, updates, commits, and cancels wall drag state', () => {
    useArchitectureEditorStore.getState().startWallDrag(createDocumentWithWall(), 'w1', [2.5, 0]);

    expect(useArchitectureEditorStore.getState().wallDrag).toMatchObject({
      wallId: 'w1',
      grabOffset: [0.5, 0],
      currentOffset: [0, 0],
    });

    useArchitectureEditorStore.getState().updateWallDrag([1, 2]);
    expect(useArchitectureEditorStore.getState().wallDrag?.currentOffset).toEqual([1, 2]);

    useArchitectureEditorStore.getState().commitWallDrag();
    expect(useArchitectureEditorStore.getState().wallDrag).toBeNull();

    useArchitectureEditorStore.getState().startWallDrag(createDocumentWithWall(), 'w1', [2, 0]);
    useArchitectureEditorStore.getState().cancelWallDrag();
    expect(useArchitectureEditorStore.getState().wallDrag).toBeNull();
  });
});
