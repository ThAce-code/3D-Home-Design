import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DraftWallPreview from '../DraftWallPreview';
import ArchitectureScene from '../ArchitectureScene';
import {
  createEmptyArchitectureDocument,
  getPrimaryLevelId,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';

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
      root.render(<ArchitectureScene />);
    });

    const hud = mountNode.querySelector('[data-testid="wall-draft-hud"]');

    expect(hud).not.toBeNull();
    expect(hud?.textContent).toContain('按墙中线绘制');
    expect(hud?.textContent).toContain('正交锁定');
    expect(hud?.textContent).toContain('释放以闭合');
    expect(hud?.textContent).toContain('按 Tab 输入长度');
  });
});
