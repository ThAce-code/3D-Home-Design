import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store/useStore';
import { useArchitectureDocumentStore } from '../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../store/architectureEditorStore';
import { reduceArchitectureCommand } from '../architecture/editing/reducers';
import { createEmptyArchitectureDocument } from '../architecture/domain/document';

function resetStores() {
  useStore.setState(useStore.getInitialState());
  useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
  useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
}

describe('Architecture-first shell state', () => {
  beforeEach(resetStores);

  it('defaults the dock to the building tab', () => {
    expect(useStore.getState().activeTab).toBe('building');
  });

  it('does not expose legacy room state on the app store', () => {
    const state = useStore.getState() as Record<string, unknown>;

    expect('rooms' in state).toBe(false);
    expect('selectedRoomId' in state).toBe(false);
    expect('addRoom' in state).toBe(false);
  });

  it('starts with an empty architecture level and select tool', () => {
    const document = useArchitectureDocumentStore.getState().document;
    const levelId = document.levelOrder[0];

    expect(document.levelOrder).toHaveLength(1);
    expect(document.levels[levelId]?.wallIds).toEqual([]);
    expect(useArchitectureEditorStore.getState().activeTool).toBe('select');
  });
});

describe('Dock switching', () => {
  beforeEach(resetStores);

  it('switches from building to furniture and back', () => {
    useStore.getState().setActiveTab('furniture');
    expect(useStore.getState().activeTab).toBe('furniture');

    useStore.getState().setActiveTab('building');
    expect(useStore.getState().activeTab).toBe('building');
  });
});

describe('Architecture editing flow', () => {
  beforeEach(resetStores);

  it('draws a wall into the architecture document', () => {
    const document = createEmptyArchitectureDocument();
    const next = reduceArchitectureCommand(document, {
      type: 'DRAW_WALL',
      start: [0, 0],
      end: [4, 0],
    });

    expect(next.wallOrder).toHaveLength(1);
    expect(next.levels[next.levelOrder[0]]?.wallIds).toEqual(next.wallOrder);
  });

  it('tracks wall and zone selection in the architecture editor store', () => {
    useArchitectureEditorStore.getState().setSelection({
      vertexIds: [],
      wallIds: ['w1'],
      zoneIds: ['z1'],
    });

    expect(useArchitectureEditorStore.getState().selection).toEqual({
      vertexIds: [],
      wallIds: ['w1'],
      zoneIds: ['z1'],
    });
  });
});

describe('Undo/Redo', () => {
  beforeEach(() => {
    resetStores();
    useStore.temporal.getState().clear();
  });

  it('undoes and redoes item placement without any room dependency', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    expect(useStore.getState().items).toHaveLength(1);

    useStore.temporal.getState().undo();
    expect(useStore.getState().items).toHaveLength(0);

    useStore.temporal.getState().redo();
    expect(useStore.getState().items).toHaveLength(1);
  });

  it('does not undo ui or camera state', () => {
    useStore.getState().setActiveTab('furniture');
    useStore.getState().setPointerLocked(true);

    useStore.temporal.getState().undo();

    expect(useStore.getState().activeTab).toBe('furniture');
    expect(useStore.getState().pointerLocked).toBe(true);
  });
});
