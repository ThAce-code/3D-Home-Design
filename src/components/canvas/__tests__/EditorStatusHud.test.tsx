import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useStore } from '../../../store/useStore';
import EditorStatusHud from '../EditorStatusHud';

describe('EditorStatusHud', () => {
  let mountNode: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useStore.setState(useStore.getInitialState());
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
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useStore.setState(useStore.getInitialState());
  });

  it('shows select guidance when nothing is selected', () => {
    act(() => {
      root.render(<EditorStatusHud />);
    });

    expect(mountNode.querySelector('[data-testid="editor-status-hud"]')?.textContent).toContain('点击墙体或区域选中');
  });

  it('shows wall edit guidance when a wall is selected', () => {
    act(() => {
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      });
      root.render(<EditorStatusHud />);
    });

    expect(mountNode.querySelector('[data-testid="editor-status-hud"]')?.textContent).toContain('拖动端点修改墙体');
  });

  it('shows drag guidance while dragging a vertex', () => {
    act(() => {
      useArchitectureEditorStore.getState().startVertexDrag('v1', [0, 0]);
      root.render(<EditorStatusHud />);
    });

    expect(mountNode.querySelector('[data-testid="editor-status-hud"]')?.textContent).toContain('拖动中');
  });

  it('shows a numeric length input while wall numeric entry is enabled', () => {
    act(() => {
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([0, 0], null);
      useArchitectureEditorStore.getState().updateDraftWall([4, 0], null);
      useArchitectureEditorStore.getState().setWallNumericEntryEnabled(true);
      root.render(<EditorStatusHud />);
    });

    const input = mountNode.querySelector('[data-testid="wall-length-input"]') as HTMLInputElement | null;

    expect(input).not.toBeNull();
    expect(input?.value).toBe('4.00');
  });

  it('commits a wall at the typed length when submitting numeric entry', () => {
    act(() => {
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([0, 0], null);
      useArchitectureEditorStore.getState().updateDraftWall([3, 4], null);
      useArchitectureEditorStore.getState().setWallNumericEntryEnabled(true);
      root.render(<EditorStatusHud />);
    });

    const input = mountNode.querySelector('[data-testid="wall-length-input"]') as HTMLInputElement | null;
    if (!input) {
      throw new Error('missing wall length input');
    }

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(input, '10');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const document = useArchitectureDocumentStore.getState().document;
    const wall = document.walls[document.wallOrder[0] ?? ''];
    const endVertex = wall ? document.vertices[wall.endVertexId] : null;

    expect(endVertex).toMatchObject({ x: 6, y: 8 });
    expect(useArchitectureEditorStore.getState().draftWall).toBeNull();
    expect(useArchitectureEditorStore.getState().toolState.wall.constraints.numericEntryEnabled).toBe(false);
  });

  it('captures direct number keys after tab and commits on enter without focusing the input', () => {
    act(() => {
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([0, 0], null);
      useArchitectureEditorStore.getState().updateDraftWall([3, 4], null);
      useArchitectureEditorStore.getState().setWallNumericEntryEnabled(true);
      root.render(<EditorStatusHud />);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });

    const document = useArchitectureDocumentStore.getState().document;
    const wall = document.walls[document.wallOrder[0] ?? ''];
    const endVertex = wall ? document.vertices[wall.endVertexId] : null;

    expect(endVertex).toMatchObject({ x: 6, y: 8 });
    expect(useArchitectureEditorStore.getState().draftWall).toBeNull();
  });
});
