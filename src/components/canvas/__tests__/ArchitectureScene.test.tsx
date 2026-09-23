import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../../architecture/domain/document';
import ArchitectureScene from '../ArchitectureScene';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import {
  advanceWallDraftInteraction,
  updateWallDraftPointer,
} from '../../../architecture/editing/interaction';
import { createDefaultViewport } from '../../../architecture/editing/tools';
import { armWallTool, createDefaultWallToolState, updateWallToolModifiers } from '../../../architecture/editing/wallTool';

function createDocumentWithWallAndZone(): ArchitectureDocument {
  const document = createEmptyArchitectureDocument();
  const levelId = document.levelOrder[0];
  const level = document.levels[levelId];

  document.vertices = {
    v1: { id: 'v1', x: 0, y: 0 },
    v2: { id: 'v2', x: 4, y: 0 },
    v3: { id: 'v3', x: 4, y: 3 },
    v4: { id: 'v4', x: 0, y: 3 },
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
  document.zones = {
    z1: {
      id: 'z1',
      levelId,
      boundaryVertexIds: ['v1', 'v2', 'v3', 'v4'],
      kind: 'unknown',
      name: null,
    },
  };
  document.zoneOrder = ['z1'];
  document.levels[levelId] = {
    ...level,
    vertexIds: ['v1', 'v2', 'v3', 'v4'],
    wallIds: ['w1'],
    zoneIds: ['z1'],
  };

  return document;
}

describe('ArchitectureScene', () => {
  let mountNode: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mountNode.remove();
    consoleErrorSpy.mockRestore();
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
  });

  it('renders an empty architecture scene without wall or zone meshes', () => {
    act(() => {
      root.render(<ArchitectureScene />);
    });

    expect(mountNode.querySelector('[name="architecture-scene"]')).not.toBeNull();
    expect(mountNode.querySelector('[name="wall:w1"]')).toBeNull();
    expect(mountNode.querySelector('[name="zone:z1"]')).toBeNull();
  });

  it('renders wall and zone meshes from the architecture document', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(<ArchitectureScene />);
    });

    expect(mountNode.querySelector('[name="architecture-scene"]')).not.toBeNull();
    expect(mountNode.querySelector('[name="wall:w1"]')).not.toBeNull();
    expect(mountNode.querySelector('[name="zone:z1"]')).not.toBeNull();
  });

  it('renders a draft wall preview while a wall is in progress', () => {
    act(() => {
      useArchitectureEditorStore.getState().startDraftWall([0, 0], 'v1');
      useArchitectureEditorStore.getState().updateDraftWall([4, 0], 'v2');
      root.render(<ArchitectureScene />);
    });

    expect(mountNode.querySelector('[name="draft-wall-preview"]')).not.toBeNull();
  });

  it('starts, updates, and commits a draft wall through the wall interaction helpers', () => {
    const document = useArchitectureDocumentStore.getState().document;
    const started = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: null,
      point: [0, 0],
      viewport: createDefaultViewport(),
      wallTool: createDefaultWallToolState(),
    });

    expect(started.draftWall?.startPoint).toEqual([0, 0]);

    const updatedDraft = updateWallDraftPointer({
      activeTool: 'wall',
      document,
      draftWall: started.draftWall,
      point: [4, 0],
      viewport: createDefaultViewport(),
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    expect(updatedDraft.draftWall?.currentPoint).toEqual([4, 0]);

    const committed = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: updatedDraft.draftWall,
      point: [4, 0],
      viewport: createDefaultViewport(),
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    expect(committed.draftWall).toBeNull();
    expect(committed.document.wallOrder).toHaveLength(1);
  });

  it('updates the wall draft using the constrained snap result instead of the raw pointer', () => {
    const started = advanceWallDraftInteraction({
      activeTool: 'wall',
      document: useArchitectureDocumentStore.getState().document,
      draftWall: null,
      point: [0, 0],
      viewport: createDefaultViewport(),
      wallTool: createDefaultWallToolState(),
    });

    const updatedDraft = updateWallDraftPointer({
      activeTool: 'wall',
      document: useArchitectureDocumentStore.getState().document,
      draftWall: started.draftWall,
      point: [3, 1],
      viewport: createDefaultViewport(),
      wallTool: updateWallToolModifiers(armWallTool(createDefaultWallToolState()), { shiftKey: true }),
    });

    expect(updatedDraft.draftWall?.currentPoint).toEqual([3, 0]);
    expect(updatedDraft.axisLock).toBe('horizontal');
  });

  it('writes wall tool keyboard modifiers into the editor store during drafting', () => {
    act(() => {
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([0, 0], null);
      root.render(<ArchitectureScene />);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    });

    expect(useArchitectureEditorStore.getState().toolState.wall.modifiers.shiftKey).toBe(true);
    expect(useArchitectureEditorStore.getState().toolState.wall.modifiers.altKey).toBe(true);
    expect(useArchitectureEditorStore.getState().toolState.wall.constraints.numericEntryEnabled).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
    });

    expect(useArchitectureEditorStore.getState().toolState.wall.modifiers.shiftKey).toBe(false);
    expect(useArchitectureEditorStore.getState().toolState.wall.modifiers.altKey).toBe(false);
  });
});
