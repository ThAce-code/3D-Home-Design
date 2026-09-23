import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DraftWallPreview from '../DraftWallPreview';
import WallDraftHud from '../WallDraftHud';
import {
  createEmptyArchitectureDocument,
  getPrimaryLevelId,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import { editorTheme } from '../../../theme/editorTheme';

describe('DraftWallPreview', () => {
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

  it('uses the level default wall thickness instead of snap tolerance', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = getPrimaryLevelId(document);
    document.levels[levelId] = {
      ...document.levels[levelId],
      defaultWallThickness: 0.2,
    };

    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(document);
      useArchitectureEditorStore.getState().setSnapTolerance(0.6);
      useArchitectureEditorStore.getState().startDraftWall([0, 0], null);
      useArchitectureEditorStore.getState().updateDraftWall([4, 0], null);
      root.render(<DraftWallPreview />);
    });

    const geometry = mountNode.querySelector('boxgeometry');

    expect(geometry?.getAttribute('args')).toBe('4,3,0.2');
  });

  it('shows explicit wall drawing hints for centerline, orthogonal lock, closure, and numeric entry', () => {
    act(() => {
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([0, 0], null);
      useArchitectureEditorStore.getState().updateDraftWall([4, 0], null);
      useArchitectureEditorStore.getState().setWallToolModifiers({ shiftKey: true });
      useArchitectureEditorStore.getState().setWallClosurePreview({
        vertexId: 'v-close',
        point: [4, 0],
      });
      useArchitectureEditorStore.getState().setWallNumericEntryEnabled(true);
      root.render(<WallDraftHud />);
    });

    const hud = mountNode.querySelector('[data-testid="wall-draft-hud"]');

    expect(hud).not.toBeNull();
    expect(hud?.textContent).toContain('按墙中线绘制');
    expect(hud?.textContent).toContain('正交锁定');
    expect(hud?.textContent).toContain('释放以闭合');
    expect(hud?.textContent).toContain('按 Tab 输入长度');
  });

  it('shows a HUD hint when the draft point is snapped onto a wall body', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
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

    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(document);
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([1, 1], null);
      useArchitectureEditorStore.getState().updateDraftWall([2, 0], null);
      root.render(<WallDraftHud />);
    });

    const hud = mountNode.querySelector('[data-testid="wall-draft-hud"]');

    expect(hud?.textContent).toContain('吸附到墙线');
  });

  it('renders a square footprint on the ground before the first wall click', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = getPrimaryLevelId(document);
    document.levels[levelId] = {
      ...document.levels[levelId],
      defaultWallThickness: 0.2,
    };

    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(document);
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().setCursorPoint([2, 3]);
      root.render(<DraftWallPreview />);
    });

    const footprint = mountNode.querySelector('[name="draft-wall-footprint"]');
    const geometry = footprint?.querySelector('planegeometry');

    expect(footprint).not.toBeNull();
    expect(geometry?.getAttribute('args')).toBe('0.2,0.2');
  });

  it('shows a wall snap marker when the draft point is snapped onto an existing wall body', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
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

    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(document);
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([1, 1], null);
      useArchitectureEditorStore.getState().updateDraftWall([2, 0], null);
      root.render(<DraftWallPreview />);
    });

    expect(mountNode.querySelector('[name="draft-wall-snap-point"]')).not.toBeNull();
  });

  it('uses editor draft, snap, and closure colors instead of legacy hardcoded preview colors', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
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

    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(document);
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().setCursorPoint([2, 0]);
      root.render(<DraftWallPreview />);
    });

    const footprintMaterial = mountNode.querySelector('[name="draft-wall-footprint"] meshbasicmaterial');
    const initialSnapMaterial = mountNode.querySelector('[name="draft-wall-snap-point"] meshbasicmaterial');

    expect(footprintMaterial?.getAttribute('color')).toBe(editorTheme.draft);
    expect(initialSnapMaterial?.getAttribute('color')).toBe(editorTheme.snap);

    act(() => {
      useArchitectureEditorStore.getState().startDraftWall([1, 1], null);
      useArchitectureEditorStore.getState().updateDraftWall([2, 0], null);
      useArchitectureEditorStore.getState().setWallClosurePreview({
        vertexId: 'v-close',
        point: [2, 0],
      });
      root.render(<DraftWallPreview />);
    });

    const previewMaterial = mountNode.querySelector('[name="draft-wall-preview"] meshstandardmaterial');
    const centerlineMaterial = mountNode.querySelector('[name="draft-wall-centerline"] linebasicmaterial');
    const closureMaterial = mountNode.querySelector('[name="draft-wall-closure-point"] meshstandardmaterial');
    const snapMaterial = mountNode.querySelector('[name="draft-wall-snap-point"] meshbasicmaterial');

    expect(previewMaterial?.getAttribute('color')).toBe(editorTheme.draft);
    expect(centerlineMaterial?.getAttribute('color')).toBe(editorTheme.axisGuide);
    expect(closureMaterial?.getAttribute('color')).toBe(editorTheme.closure);
    expect(snapMaterial?.getAttribute('color')).toBe(editorTheme.snap);
  });
});
