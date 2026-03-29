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

    expect(mountNode.querySelector('[data-testid="architecture-scene"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="architecture-wall-w1"]')).toBeNull();
    expect(mountNode.querySelector('[data-testid="architecture-zone-z1"]')).toBeNull();
  });

  it('renders wall and zone meshes from the architecture document', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(<ArchitectureScene />);
    });

    expect(mountNode.querySelector('[data-testid="architecture-scene"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="architecture-wall-w1"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="architecture-zone-z1"]')).not.toBeNull();
  });

  it('renders a draft wall preview while a wall is in progress', () => {
    act(() => {
      useArchitectureEditorStore.getState().startDraftWall([0, 0], 'v1');
      useArchitectureEditorStore.getState().updateDraftWall([4, 0], 'v2');
      root.render(<ArchitectureScene />);
    });

    expect(mountNode.querySelector('[data-testid="draft-wall-preview"]')).not.toBeNull();
  });

  it('starts, updates, and commits a draft wall through the wall interaction helpers', () => {
    const document = useArchitectureDocumentStore.getState().document;
    const started = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: null,
      point: [0, 0],
    });

    expect(started.draftWall?.startPoint).toEqual([0, 0]);

    const updatedDraft = updateWallDraftPointer({
      activeTool: 'wall',
      draftWall: started.draftWall,
      point: [4, 0],
    });

    expect(updatedDraft?.currentPoint).toEqual([4, 0]);

    const committed = advanceWallDraftInteraction({
      activeTool: 'wall',
      document,
      draftWall: updatedDraft,
      point: [4, 0],
    });

    expect(committed.draftWall).toBeNull();
    expect(committed.document.wallOrder).toHaveLength(1);
  });
});
