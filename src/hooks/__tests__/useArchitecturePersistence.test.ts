import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createEmptyArchitectureDocument } from '../../architecture/domain/document';
import {
  loadArchitectureDocument,
  saveArchitectureDocument,
  useArchitecturePersistence,
} from '../useArchitecturePersistence';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore';
import { reduceArchitectureCommand } from '../../architecture/editing/reducers';

const stores = new Map<string, Map<IDBValidKey, unknown>>();
let pendingRead: Promise<unknown> | undefined;

vi.mock('idb', () => ({
  openDB: async (
    _name: string,
    _version: number,
    options?: {
      upgrade?: (db: {
        objectStoreNames: { contains: (name: string) => boolean };
        createObjectStore: (name: string) => void;
      }) => void;
    }
  ) => {
    const db = {
      objectStoreNames: {
        contains: (name: string) => stores.has(name),
      },
      createObjectStore: (name: string) => {
        if (!stores.has(name)) {
          stores.set(name, new Map());
        }
      },
      put: async (storeName: string, value: unknown, key: IDBValidKey) => {
        const store = stores.get(storeName);

        if (!store) {
          throw new Error(`Missing object store: ${storeName}`);
        }

        store.set(key, structuredClone(value));
      },
      get: async (storeName: string, key: IDBValidKey) => {
        const store = stores.get(storeName);
        const value = pendingRead ? await pendingRead : store?.get(key);

        return value === undefined ? undefined : structuredClone(value);
      },
    };

    options?.upgrade?.(db);

    return db;
  },
}));

describe('useArchitecturePersistence', () => {
  let root: Root | undefined;
  let mount: HTMLDivElement | undefined;
  function Harness() {
    useArchitecturePersistence();
    return null;
  }
  function renderPersistence() {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    root.render(createElement(Harness));
  }
  beforeEach(() => {
    stores.clear();
    pendingRead = undefined;
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
  });
  afterEach(() => {
    act(() => root?.unmount());
    mount?.remove();
    root = undefined;
    mount = undefined;
  });

  it('saves and restores the architecture document', async () => {
    const document = createEmptyArchitectureDocument();

    await saveArchitectureDocument(document);
    const restored = await loadArchitectureDocument();

    expect(restored?.levelOrder).toEqual(document.levelOrder);
  });

  it('loads saved geometry as the baseline rather than an undoable edit', async () => {
    const document = reduceArchitectureCommand(createEmptyArchitectureDocument(), { type: 'DRAW_WALL', start: [0, 0], end: [4, 0] });
    await saveArchitectureDocument(document);
    await act(async () => renderPersistence());
    expect(useArchitectureDocumentStore.getState().document).toEqual(document);
    expect(useArchitectureDocumentStore.getState().undo()).toBe(false);
  });

  it('does not overwrite user edits when an older saved document finishes loading late', async () => {
    let finishRead!: (value: unknown) => void;
    pendingRead = new Promise((resolve) => { finishRead = resolve; });
    await act(async () => renderPersistence());
    const store = useArchitectureDocumentStore.getState();
    const edited = reduceArchitectureCommand(store.document, { type: 'DRAW_WALL', start: [6, 0], end: [10, 0] });
    store.replaceDocument(edited);
    await act(async () => { finishRead(createEmptyArchitectureDocument()); });
    expect(useArchitectureDocumentStore.getState().document).toEqual(edited);
    expect(useArchitectureDocumentStore.getState().pastDocuments).toHaveLength(1);
  });
});
