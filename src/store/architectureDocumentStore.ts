import { create } from 'zustand';
import {
  cloneArchitectureDocument,
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../architecture/domain/document.js';

export const ARCHITECTURE_HISTORY_LIMIT = 100;

function documentsEqual(left: ArchitectureDocument, right: ArchitectureDocument): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export interface ArchitectureDocumentState {
  document: ArchitectureDocument;
  pastDocuments: ArchitectureDocument[];
  futureDocuments: ArchitectureDocument[];
  historyGroup: {
    id: string;
    initialDocument: ArchitectureDocument;
    initialPast: ArchitectureDocument[];
    initialFuture: ArchitectureDocument[];
    hasChanges: boolean;
  } | null;
  resetDocument: () => void;
  loadDocument: (document: ArchitectureDocument) => void;
  replaceDocument: (document: ArchitectureDocument) => void;
  beginHistoryGroup: (id: string) => void;
  endHistoryGroup: () => void;
  undo: () => boolean;
  redo: () => boolean;
}

export const useArchitectureDocumentStore = create<ArchitectureDocumentState>()((set, get) => ({
  document: createEmptyArchitectureDocument(),
  pastDocuments: [],
  futureDocuments: [],
  historyGroup: null,
  resetDocument: () => get().loadDocument(createEmptyArchitectureDocument()),
  loadDocument: (document) => set({
    document: cloneArchitectureDocument(document),
    pastDocuments: [],
    futureDocuments: [],
    historyGroup: null,
  }),
  replaceDocument: (document) => set((state) => {
    if (documentsEqual(state.document, document)) return state;
    const continuingGroup = state.historyGroup?.hasChanges;
    return {
      document: cloneArchitectureDocument(document),
      pastDocuments: continuingGroup
        ? state.pastDocuments
        : [...state.pastDocuments, state.document].slice(-ARCHITECTURE_HISTORY_LIMIT),
      futureDocuments: [],
      historyGroup: state.historyGroup ? { ...state.historyGroup, hasChanges: true } : null,
    };
  }),
  beginHistoryGroup: (id) => {
    get().endHistoryGroup();
    const state = get();
    set({ historyGroup: {
      id, initialDocument: state.document, initialPast: state.pastDocuments,
      initialFuture: state.futureDocuments, hasChanges: false,
    } });
  },
  endHistoryGroup: () => set((state) => {
    if (!state.historyGroup) return state;
    const unchanged = documentsEqual(state.historyGroup.initialDocument, state.document);
    return {
      pastDocuments: unchanged ? state.historyGroup.initialPast : state.pastDocuments,
      futureDocuments: unchanged ? state.historyGroup.initialFuture : state.futureDocuments,
      historyGroup: null,
    };
  }),
  undo: () => {
    get().endHistoryGroup();
    const state = get();
    const previous = state.pastDocuments.at(-1);
    if (!previous) return false;
    set({
      document: previous,
      pastDocuments: state.pastDocuments.slice(0, -1),
      futureDocuments: [state.document, ...state.futureDocuments],
    });
    return true;
  },
  redo: () => {
    get().endHistoryGroup();
    const state = get();
    const next = state.futureDocuments[0];
    if (!next) return false;
    set({
      document: next,
      pastDocuments: [...state.pastDocuments, state.document].slice(-ARCHITECTURE_HISTORY_LIMIT),
      futureDocuments: state.futureDocuments.slice(1),
    });
    return true;
  },
}));
