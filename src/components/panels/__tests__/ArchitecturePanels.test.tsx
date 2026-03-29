import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import { useStore } from '../../../store/useStore';
import ArchitectureScene from '../../canvas/ArchitectureScene';
import LeftPanel from '../../layout/LeftPanel';
import PropertyPanel from '../PropertyPanel';

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

describe('architecture shell panels', () => {
  let mountNode: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
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
    useStore.setState(useStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
  });

  it('renders the building tool panel when architecture mode is enabled', () => {
    act(() => {
      useStore.setState({ dockOpen: true });
      root.render(<LeftPanel architectureModeEnabled />);
    });

    expect(mountNode.querySelector('[data-testid="building-tool-panel"]')).not.toBeNull();
  });

  it('renders the wall property panel after clicking a wall mesh in architecture mode', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(
        <>
          <ArchitectureScene />
          <PropertyPanel architectureModeEnabled />
        </>
      );
    });

    const wallMesh = mountNode.querySelector('[data-testid="architecture-wall-w1"]');

    if (!wallMesh) {
      throw new Error('missing wall mesh');
    }

    act(() => {
      wallMesh.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });

    expect(mountNode.querySelector('[data-testid="wall-property-panel"]')).not.toBeNull();
    expect(mountNode.textContent).toContain('w1');
  });

  it('renders the zone property panel after clicking a zone mesh in architecture mode', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(
        <>
          <ArchitectureScene />
          <PropertyPanel architectureModeEnabled />
        </>
      );
    });

    const zoneMesh = mountNode.querySelector('[data-testid="architecture-zone-z1"]');

    if (!zoneMesh) {
      throw new Error('missing zone mesh');
    }

    act(() => {
      zoneMesh.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });

    expect(mountNode.querySelector('[data-testid="zone-property-panel"]')).not.toBeNull();
    expect(mountNode.textContent).toContain('z1');
  });
});
