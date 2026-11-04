import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../architecture/domain/document';
import { ARCHITECTURE_HISTORY_LIMIT, useArchitectureDocumentStore } from '../architectureDocumentStore';
import { cloneArchitectureDocument } from '../../architecture/domain/document';
import { reduceArchitectureCommand } from '../../architecture/editing/reducers';

describe('architectureDocumentStore', () => {
  beforeEach(() => {
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
  });

  it('clones incoming documents when replaceDocument is called', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];

    useArchitectureDocumentStore.getState().replaceDocument(document);
    document.levels[levelId].name = 'Mutated externally';

    expect(useArchitectureDocumentStore.getState().document.levels[levelId].name).toBe('Level 1');
  });

  function renameLevel(name: string) {
    const document = cloneArchitectureDocument(useArchitectureDocumentStore.getState().document);
    document.levels[document.levelOrder[0]].name = name;
    useArchitectureDocumentStore.getState().replaceDocument(document);
  }

  it('undoes and redoes edits in order without recording history navigation', () => {
    renameLevel('A');
    renameLevel('B');
    const store = useArchitectureDocumentStore.getState;
    expect(store().undo()).toBe(true);
    expect(Object.values(store().document.levels)[0].name).toBe('A');
    expect(store().undo()).toBe(true);
    expect(Object.values(store().document.levels)[0].name).toBe('Level 1');
    expect(store().undo()).toBe(false);
    expect(store().redo()).toBe(true);
    expect(store().redo()).toBe(true);
    expect(Object.values(store().document.levels)[0].name).toBe('B');
    expect(store().redo()).toBe(false);
    expect(store().pastDocuments).toHaveLength(2);
  });

  it('discards redo when a new edit branches off the timeline', () => {
    renameLevel('A');
    renameLevel('B');
    useArchitectureDocumentStore.getState().undo();
    renameLevel('C');
    expect(useArchitectureDocumentStore.getState().redo()).toBe(false);
    useArchitectureDocumentStore.getState().undo();
    expect(Object.values(useArchitectureDocumentStore.getState().document.levels)[0].name).toBe('A');
  });

  it('ignores identical replacements and preserves the redo branch', () => {
    renameLevel('A');
    const store = useArchitectureDocumentStore.getState;
    store().undo();
    const original = store().document;
    store().replaceDocument(cloneArchitectureDocument(original));
    expect(store().document).toBe(original);
    expect(store().pastDocuments).toHaveLength(0);
    expect(store().redo()).toBe(true);
  });

  it('coalesces a focused property edit and separates the next editing session', () => {
    const store = useArchitectureDocumentStore.getState;
    store().beginHistoryGroup('name');
    renameLevel('A');
    renameLevel('AB');
    renameLevel('ABC');
    store().endHistoryGroup();
    store().beginHistoryGroup('name');
    renameLevel('ABCD');
    store().endHistoryGroup();
    expect(store().pastDocuments).toHaveLength(2);
    store().undo();
    expect(Object.values(store().document.levels)[0].name).toBe('ABC');
    store().undo();
    expect(Object.values(store().document.levels)[0].name).toBe('Level 1');
  });

  it('preserves history and redo when a grouped edit returns to its original value', () => {
    const store = useArchitectureDocumentStore.getState;
    renameLevel('A');
    store().undo();
    store().beginHistoryGroup('name');
    renameLevel('temporary');
    renameLevel('Level 1');
    store().endHistoryGroup();
    expect(store().pastDocuments).toHaveLength(0);
    expect(store().redo()).toBe(true);
    expect(Object.values(store().document.levels)[0].name).toBe('A');
  });

  it('bounds history while retaining the most recent edits', () => {
    const store = useArchitectureDocumentStore.getState;
    for (let i = 1; i <= ARCHITECTURE_HISTORY_LIMIT + 5; i += 1) renameLevel(String(i));
    expect(store().pastDocuments).toHaveLength(ARCHITECTURE_HISTORY_LIMIT);
    for (let i = 0; i < ARCHITECTURE_HISTORY_LIMIT; i += 1) expect(store().undo()).toBe(true);
    expect(Object.values(store().document.levels)[0].name).toBe('5');
    expect(store().undo()).toBe(false);
  });

  it('loads and resets a document as a fresh baseline', () => {
    const store = useArchitectureDocumentStore.getState;
    renameLevel('edited');
    const loaded = createEmptyArchitectureDocument();
    store().loadDocument(loaded);
    loaded.levelOrder.length = 0;
    expect(store().document.levelOrder).toHaveLength(1);
    expect(store().undo()).toBe(false);
    renameLevel('another edit');
    store().resetDocument();
    expect(store().pastDocuments).toHaveLength(0);
    expect(store().futureDocuments).toHaveLength(0);
  });

  it('restores exact topology and room metadata across a committed geometry edit', () => {
    const store = useArchitectureDocumentStore.getState;
    let document = store().document;
    const points: [number, number][] = [[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]];
    for (let i = 0; i < 4; i += 1) document = reduceArchitectureCommand(document, { type: 'DRAW_WALL', start: points[i], end: points[i + 1] });
    const zoneId = document.zoneOrder[0];
    document = reduceArchitectureCommand(document, { type: 'SET_ZONE_PROPS', zoneId, patch: { name: 'Living room', kind: 'living_room' } });
    store().loadDocument(document);
    const vertexId = document.walls[document.wallOrder[0]].startVertexId;
    const moved = reduceArchitectureCommand(document, { type: 'MOVE_VERTEX', vertexId, to: [-1, 0] });
    store().replaceDocument(moved);
    store().undo();
    expect(store().document).toEqual(document);
    store().redo();
    expect(store().document).toEqual(moved);
    expect(store().document.zones[zoneId]).toMatchObject({ name: 'Living room', kind: 'living_room' });
  });
});
