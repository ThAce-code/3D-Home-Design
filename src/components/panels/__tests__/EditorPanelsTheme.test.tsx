import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuildingToolPanel from '../BuildingToolPanel';
import AssetPanel from '../AssetPanel';
import PropertyPanel from '../PropertyPanel';
import WallPropertyPanel from '../WallPropertyPanel';
import ZonePropertyPanel from '../ZonePropertyPanel';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import { useStore } from '../../../store/useStore';
import { editorThemeVars } from '../../../theme/editorTheme';

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

describe('editor panel theming', () => {
  let mountNode: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());

    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mountNode.remove();
    useStore.setState(useStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
  });

  it('renders the building tool panel with editor token colors instead of the legacy dark palette', () => {
    act(() => {
      useArchitectureEditorStore.getState().setActiveTool('wall');
      root.render(<BuildingToolPanel />);
    });

    const heading = Array.from(mountNode.querySelectorAll('h3')).find((node) => node.textContent === '建筑工具');
    const activeButton = Array.from(mountNode.querySelectorAll('button')).find((node) => node.textContent?.includes('墙体'));

    expect(heading).not.toBeNull();
    expect(heading?.style.color).toBe(editorThemeVars.text);
    expect(activeButton).not.toBeNull();
    expect(activeButton?.style.background).toBe(editorThemeVars.accentSoft);
    expect(activeButton?.style.color).toBe(editorThemeVars.accentStrong);
  });

  it('renders the asset panel with editor token colors for active category pills', () => {
    const loadCategories = vi.fn();
    const loadAssets = vi.fn();

    act(() => {
      useStore.setState({
        loadCategories,
        loadAssets,
        categories: [
          { id: 1, name: '沙发', slug: 'sofas' },
        ],
      });
      root.render(<AssetPanel />);
    });

    const allButton = Array.from(mountNode.querySelectorAll('button')).find((node) => node.textContent?.includes('全部'));

    expect(allButton).not.toBeNull();
    expect(allButton?.style.background).toBe(editorThemeVars.accentSoft);
    expect(allButton?.style.color).toBe(editorThemeVars.accentStrong);
  });

  it('renders the legacy furniture property panel with editor surface tokens', () => {
    act(() => {
      useStore.setState({
        selectedItemId: 'item-1',
        items: [
          {
            id: 'item-1',
            assetId: 'asset-1',
            position: [1, 0, 2],
            quaternion: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
        ],
        assets: [
          {
            id: 'asset-1',
            name: 'Single Sofa',
            categorySlug: 'sofas',
            modelUrl: '/models/sofa.glb',
            thumbUrl: null,
            fileSize: 1200,
            bboxMin: [0, 0, 0],
            bboxSize: [1, 1, 1],
            autoScale: 1,
          },
        ],
      });
      root.render(<PropertyPanel />);
    });

    const panel = mountNode.firstElementChild as HTMLDivElement | null;
    const heading = Array.from(mountNode.querySelectorAll('h3')).find((node) => node.textContent === 'Single Sofa');

    expect(panel).not.toBeNull();
    expect(panel?.style.background).toBe(editorThemeVars.surfaceStrong);
    expect(panel?.style.borderColor).toBe(editorThemeVars.border);
    expect(heading?.style.color).toBe(editorThemeVars.text);
  });

  it('renders the wall property panel with editor surface and field tokens', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(<WallPropertyPanel wallId="w1" />);
    });

    const panel = mountNode.querySelector('[data-testid="wall-property-panel"]') as HTMLDivElement | null;
    const input = mountNode.querySelector('input') as HTMLInputElement | null;

    expect(panel).not.toBeNull();
    expect(panel?.style.background).toBe(editorThemeVars.surfaceStrong);
    expect(panel?.style.borderColor).toBe(editorThemeVars.border);
    expect(input?.style.background).toBe(editorThemeVars.field);
    expect(input?.style.border).toBe(`1px solid ${editorThemeVars.fieldBorder}`);
  });

  it('renders the zone property panel with editor surface tokens', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(<ZonePropertyPanel zoneId="z1" />);
    });

    const panel = mountNode.querySelector('[data-testid="zone-property-panel"]') as HTMLDivElement | null;
    const heading = Array.from(mountNode.querySelectorAll('h3')).find((node) => node.textContent === 'Zone');

    expect(panel).not.toBeNull();
    expect(panel?.style.background).toBe(editorThemeVars.surfaceStrong);
    expect(panel?.style.borderColor).toBe(editorThemeVars.border);
    expect(heading?.style.color).toBe(editorThemeVars.text);
  });
});
