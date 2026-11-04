import { beforeEach, describe, expect, it } from 'vitest';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import { architectureHistoryActions } from '../../../services/architectureHistory';
import { reduceArchitectureCommand } from '../reducers';

describe('architecture history actions', () => {
  beforeEach(() => {
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
  });

  function drawWall() {
    const store = useArchitectureDocumentStore.getState();
    store.replaceDocument(reduceArchitectureCommand(store.document, { type: 'DRAW_WALL', start: [0, 0], end: [4, 0] }));
  }

  it('clears stale selection and hover after restoring topology', () => {
    drawWall();
    const wallId = useArchitectureDocumentStore.getState().document.wallOrder[0];
    useArchitectureEditorStore.getState().setSelection({ wallIds: [wallId], vertexIds: [], zoneIds: [] });
    useArchitectureEditorStore.getState().setHover({ wallId, vertexId: null, zoneId: null });
    expect(architectureHistoryActions.perform('undo')).toBe(true);
    expect(useArchitectureDocumentStore.getState().document.wallOrder).toHaveLength(0);
    expect(useArchitectureEditorStore.getState().selection.wallIds).toEqual([]);
    expect(useArchitectureEditorStore.getState().hover.wallId).toBeNull();
    expect(architectureHistoryActions.perform('redo')).toBe(true);
    expect(useArchitectureDocumentStore.getState().document.wallOrder).toEqual([wallId]);
  });

  it.each(['draft', 'vertex', 'wall'] as const)('first cancels an active %s preview without consuming history', (kind) => {
    drawWall();
    const document = useArchitectureDocumentStore.getState().document;
    const wallId = document.wallOrder[0];
    const editor = useArchitectureEditorStore.getState();
    if (kind === 'draft') editor.startDraftWall([6, 0]);
    if (kind === 'vertex') editor.startVertexDrag(document.walls[wallId].startVertexId, [0, 0]);
    if (kind === 'wall') editor.startWallDrag(document, wallId, [2, 0]);
    architectureHistoryActions.perform('undo');
    expect(useArchitectureDocumentStore.getState().document).toBe(document);
    expect(useArchitectureEditorStore.getState()).toMatchObject({ draftWall: null, vertexDrag: null, wallDrag: null });
    architectureHistoryActions.perform('undo');
    expect(useArchitectureDocumentStore.getState().document.wallOrder).toHaveLength(0);
  });
});
