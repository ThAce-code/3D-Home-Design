import { beforeEach, describe, expect, it } from 'vitest';
import { useArchitectureEditorStore } from '../architectureEditorStore';

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
});
