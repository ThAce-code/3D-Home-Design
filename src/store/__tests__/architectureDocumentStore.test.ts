import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../architectureDocumentStore';

describe('architectureDocumentStore', () => {
  beforeEach(() => {
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
  });

  it('clones incoming documents when replaceDocument is called', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];

    useArchitectureDocumentStore.getState().replaceDocument(document);
    document.levels[levelId].name = 'Mutated externally';

    expect(useArchitectureDocumentStore.getState().document.levels[levelId].name).toBe('Level 1');
  });
});
