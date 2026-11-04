import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGlobalHotkeys } from '../useGlobalHotkeys';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore';
import { useStore } from '../../store/useStore';
import { reduceArchitectureCommand } from '../../architecture/editing/reducers';

function Harness({ architecture = true }: { architecture?: boolean }) {
  useGlobalHotkeys(architecture);
  return null;
}

describe('architecture history hotkeys', () => {
  let mount: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
    useStore.temporal.getState().clear();
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    act(() => root.render(<Harness />));
    const store = useArchitectureDocumentStore.getState();
    store.replaceDocument(reduceArchitectureCommand(store.document, { type: 'DRAW_WALL', start: [0, 0], end: [4, 0] }));
  });
  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('routes Ctrl/Cmd history to architecture instead of furniture', () => {
    useStore.getState().addItem('asset', [0, 0, 0], [1, 1, 1]);
    const undo = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true });
    act(() => window.dispatchEvent(undo));
    expect(undo.defaultPrevented).toBe(true);
    expect(useArchitectureDocumentStore.getState().document.wallOrder).toHaveLength(0);
    expect(useStore.getState().items).toHaveLength(1);
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z', metaKey: true, shiftKey: true })));
    expect(useArchitectureDocumentStore.getState().document.wallOrder).toHaveLength(1);
  });

  it.each(['input', 'textarea', 'select', 'contenteditable'])('preserves native undo in %s', (kind) => {
    const element = document.createElement(kind === 'contenteditable' ? 'div' : kind);
    if (kind === 'contenteditable') element.setAttribute('contenteditable', 'true');
    mount.appendChild(element);
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true });
    act(() => element.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false);
    expect(useArchitectureDocumentStore.getState().document.wallOrder).toHaveLength(1);
  });

  it('keeps the legacy furniture shortcut when architecture mode is disabled', () => {
    act(() => root.render(<Harness architecture={false} />));
    useStore.getState().addItem('asset', [0, 0, 0], [1, 1, 1]);
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })));
    expect(useStore.getState().items).toHaveLength(0);
    expect(useArchitectureDocumentStore.getState().document.wallOrder).toHaveLength(1);
  });
});
