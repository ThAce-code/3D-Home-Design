import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyArchitectureDocument } from '../../architecture/domain/document';
import {
  loadArchitectureDocument,
  saveArchitectureDocument,
} from '../useArchitecturePersistence';

const stores = new Map<string, Map<IDBValidKey, unknown>>();

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
        const value = store?.get(key);

        return value === undefined ? undefined : structuredClone(value);
      },
    };

    options?.upgrade?.(db);

    return db;
  },
}));

describe('useArchitecturePersistence', () => {
  beforeEach(() => {
    stores.clear();
  });

  it('saves and restores the architecture document', async () => {
    const document = createEmptyArchitectureDocument();

    await saveArchitectureDocument(document);
    const restored = await loadArchitectureDocument();

    expect(restored?.levelOrder).toEqual(document.levelOrder);
  });
});
