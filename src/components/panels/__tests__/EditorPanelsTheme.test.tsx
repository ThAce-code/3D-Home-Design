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
    expect(mountNode.textContent).not.toMatch(/V1|disconnected|face extraction/i);
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
    expect(mountNode.textContent).toContain('4.00 m');
    expect(mountNode.textContent).toContain('承重墙');
    expect(mountNode.textContent).not.toContain('structural');
  });

  it('updates wall thickness through the wall property panel', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(<WallPropertyPanel wallId="w1" />);
    });

    const thicknessInput = mountNode.querySelector('input') as HTMLInputElement | null;
    expect(thicknessInput).not.toBeNull();

    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(thicknessInput, '0.42');
      thicknessInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(useArchitectureDocumentStore.getState().document.walls.w1?.thickness).toBe(0.42);
  });

  it('deletes a wall through the wall property panel', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(<WallPropertyPanel wallId="w1" />);
    });

    const deleteButton = Array.from(mountNode.querySelectorAll('button')).find((node) => node.textContent?.includes('删除墙体'));
    expect(deleteButton).not.toBeNull();

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(useArchitectureDocumentStore.getState().document.walls.w1).toBeUndefined();
  });

  it('renders the zone property panel with editor surface tokens', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
    root.render(<ZonePropertyPanel zoneId="z1" />);
    });

    const panel = mountNode.querySelector('[data-testid="zone-property-panel"]') as HTMLDivElement | null;
    const heading = Array.from(mountNode.querySelectorAll('h3')).find((node) => node.textContent === '房间');
    const nameInput = mountNode.querySelector('input[aria-label="房间名称"]') as HTMLInputElement | null;

    expect(panel).not.toBeNull();
    expect(panel?.style.background).toBe(editorThemeVars.surfaceStrong);
    expect(panel?.style.borderColor).toBe(editorThemeVars.border);
    expect(heading?.style.color).toBe(editorThemeVars.text);
    expect(nameInput?.placeholder).toBe('未命名房间');
    expect(mountNode.textContent).toContain('12.00 m²');
    expect(mountNode.textContent).not.toMatch(/boundary|z1|unknown/i);
  });

  it('updates zone name and kind through the zone property panel', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(<ZonePropertyPanel zoneId="z1" />);
    });

    const nameInput = mountNode.querySelector('input[aria-label="房间名称"]') as HTMLInputElement | null;
    const kindSelect = mountNode.querySelector('select[aria-label="房间类型"]') as HTMLSelectElement | null;

    expect(nameInput).not.toBeNull();
    expect(kindSelect).not.toBeNull();

    act(() => {
      const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      inputSetter?.call(nameInput, '客厅');
      nameInput!.dispatchEvent(new Event('change', { bubbles: true }));

      const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      selectSetter?.call(kindSelect, 'living_room');
      kindSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const zone = useArchitectureDocumentStore.getState().document.zones.z1;
    expect(zone?.name).toBe('客厅');
    expect(zone?.kind).toBe('living_room');
  });

  it('deletes a zone boundary through the zone property panel', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWallAndZone());
      root.render(<ZonePropertyPanel zoneId="z1" />);
    });

    const deleteButton = Array.from(mountNode.querySelectorAll('button')).find((node) => node.textContent?.includes('删除房间'));
    expect(deleteButton).not.toBeNull();

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(useArchitectureDocumentStore.getState().document.zones.z1).toBeUndefined();
  });
});
