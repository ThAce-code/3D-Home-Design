import { openDB } from 'idb';
import { useEffect, useRef } from 'react';
import type { ArchitectureDocument } from '../architecture/domain/document.js';
import { useArchitectureDocumentStore } from '../store/architectureDocumentStore.js';

const ARCHITECTURE_DB_NAME = 'home-design-architecture-v1';
const ARCHITECTURE_DB_VERSION = 1;
const ARCHITECTURE_STORE_NAME = 'documents';
const ARCHITECTURE_DOCUMENT_KEY = 'current';
const SAVE_DEBOUNCE = 500;

async function getArchitectureDB() {
  return openDB(ARCHITECTURE_DB_NAME, ARCHITECTURE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(ARCHITECTURE_STORE_NAME)) {
        db.createObjectStore(ARCHITECTURE_STORE_NAME);
      }
    },
  });
}

export async function saveArchitectureDocument(document: ArchitectureDocument): Promise<void> {
  const db = await getArchitectureDB();
  await db.put(ARCHITECTURE_STORE_NAME, document, ARCHITECTURE_DOCUMENT_KEY);
}

export async function loadArchitectureDocument(): Promise<ArchitectureDocument | undefined> {
  const db = await getArchitectureDB();
  return db.get(ARCHITECTURE_STORE_NAME, ARCHITECTURE_DOCUMENT_KEY);
}

export function useArchitecturePersistence(enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    loadArchitectureDocument().then((document) => {
      if (!document) {
        return;
      }

      useArchitectureDocumentStore.getState().replaceDocument(document);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let previousDocument = useArchitectureDocumentStore.getState().document;
    const unsubscribe = useArchitectureDocumentStore.subscribe((state) => {
      if (state.document === previousDocument) {
        return;
      }

      previousDocument = state.document;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void saveArchitectureDocument(state.document);
      }, SAVE_DEBOUNCE);
    });

    return () => {
      unsubscribe();
      clearTimeout(timerRef.current);
    };
  }, [enabled]);
}
