import type { ArchitectureDocument } from '../domain/document.js';

export interface StoreAccessor<TState> {
  getState: () => TState;
}

export interface ArchitectureDocumentControllerState {
  document: ArchitectureDocument;
  replaceDocument: (document: ArchitectureDocument) => void;
}

export function updateArchitectureDocumentStore(
  documentStore: StoreAccessor<ArchitectureDocumentControllerState>,
  update: (document: ArchitectureDocument) => ArchitectureDocument,
) {
  const documentState = documentStore.getState();
  documentState.replaceDocument(update(documentState.document));
}
