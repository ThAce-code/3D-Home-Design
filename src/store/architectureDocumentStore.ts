import { create } from 'zustand';
import {
  cloneArchitectureDocument,
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../architecture/domain/document.js';

export interface ArchitectureDocumentState {
  document: ArchitectureDocument;
  resetDocument: () => void;
  replaceDocument: (document: ArchitectureDocument) => void;
}

export const useArchitectureDocumentStore = create<ArchitectureDocumentState>()((set) => ({
  document: createEmptyArchitectureDocument(),
  resetDocument: () => set({
    document: createEmptyArchitectureDocument(),
  }),
  replaceDocument: (document) => set({
    document: cloneArchitectureDocument(document),
  }),
}));
