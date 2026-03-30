import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';

const canvasSpy = vi.fn();

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    canvasSpy(props);

    return (
      <div data-testid={String(props['data-testid'] ?? 'mock-canvas')}>
        {children}
      </div>
    );
  },
}));

vi.mock('@react-three/drei', () => ({
  Grid: () => <div data-testid="mock-grid" />,
}));

vi.mock('../SceneDebugBridge', () => ({
  default: () => <div data-testid="mock-scene-debug-bridge" />,
}));

import SceneRoot from '../SceneRoot';

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

describe('SceneRoot', () => {
  let mountNode: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    canvasSpy.mockClear();
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

  it('wires the architecture scene through SceneRoot and Canvas when enabled', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      useArchitectureEditorStore.getState().startDraftWall([0, 0], 'v1');
      useArchitectureEditorStore.getState().updateDraftWall([4, 0], 'v2');
      root.render(
        <SceneRoot showArchitectureScene>
          <group data-testid="scene-child" />
        </SceneRoot>
      );
    });

    expect(canvasSpy).toHaveBeenCalledTimes(1);
    expect(mountNode.querySelector('[data-testid="scene-canvas"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="mock-grid"]')).not.toBeNull();
    expect(mountNode.querySelector('[name="architecture-scene"]')).not.toBeNull();
    expect(mountNode.querySelector('[name="wall:w1"]')).not.toBeNull();
    expect(mountNode.querySelector('[name="zone:z1"]')).not.toBeNull();
    expect(mountNode.querySelector('[name="draft-wall-preview"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="scene-child"]')).not.toBeNull();
  });

  it('renders wall draft hints as regular DOM overlay content instead of custom R3F-only tags', () => {
    act(() => {
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([0, 0], 'v1');
      useArchitectureEditorStore.getState().updateDraftWall([4, 0], 'v2');
      useArchitectureEditorStore.getState().setWallToolModifiers({ shiftKey: true });
      useArchitectureEditorStore.getState().setWallClosurePreview({
        vertexId: 'v-close',
        point: [4, 0],
      });
      useArchitectureEditorStore.getState().setWallNumericEntryEnabled(true);
      root.render(
        <SceneRoot showArchitectureScene>
          <group data-testid="scene-child" />
        </SceneRoot>
      );
    });

    const hud = mountNode.querySelector('[data-testid="wall-draft-hud"]');

    expect(hud).not.toBeNull();
    expect(hud?.textContent).toContain('按墙中线绘制');
    expect(hud?.textContent).toContain('正交锁定');
    expect(hud?.textContent).toContain('释放以闭合');
    expect(hud?.textContent).toContain('按 Tab 输入长度');
    expect(mountNode.querySelector('wall-draft-hint')).toBeNull();
  });

  it('keeps the architecture scene disconnected when the feature flag is off', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(
        <SceneRoot>
          <group data-testid="scene-child" />
        </SceneRoot>
      );
    });

    expect(canvasSpy).toHaveBeenCalledTimes(1);
    expect(mountNode.querySelector('[data-testid="scene-canvas"]')).not.toBeNull();
    expect(mountNode.querySelector('[name="architecture-scene"]')).toBeNull();
    expect(mountNode.querySelector('[data-testid="scene-child"]')).not.toBeNull();
  });
});
