import { describe, expect, it, vi } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { updateArchitectureDocumentStore } from '../controllerStores';

describe('controller store adapters', () => {
  it('reads the latest document state and replace handler when applying a document update', () => {
    const firstDocument = createEmptyArchitectureDocument();
    const latestDocument = createEmptyArchitectureDocument();
    const firstLevelId = firstDocument.levelOrder[0];
    const latestLevelId = latestDocument.levelOrder[0];
    const firstReplaceDocument = vi.fn();
    const latestReplaceDocument = vi.fn();
    let documentState = {
      document: firstDocument,
      replaceDocument: firstReplaceDocument,
    };

    updateArchitectureDocumentStore(
      {
        getState: () => documentState,
      },
      (document) => ({
        ...document,
        levels: {
          ...document.levels,
          [document.levelOrder[0]]: {
            ...document.levels[document.levelOrder[0]],
            name: 'Before swap',
          },
        },
      }),
    );

    documentState = {
      document: latestDocument,
      replaceDocument: latestReplaceDocument,
    };

    updateArchitectureDocumentStore(
      {
        getState: () => documentState,
      },
      (document) => ({
        ...document,
        levels: {
          ...document.levels,
          [document.levelOrder[0]]: {
            ...document.levels[document.levelOrder[0]],
            name: 'After swap',
          },
        },
      }),
    );

    expect(firstReplaceDocument).toHaveBeenCalledTimes(1);
    expect(firstReplaceDocument.mock.calls[0]?.[0].levels[firstLevelId]?.name).toBe('Before swap');
    expect(latestReplaceDocument).toHaveBeenCalledTimes(1);
    expect(latestReplaceDocument.mock.calls[0]?.[0].levels[latestLevelId]?.name).toBe('After swap');
  });
});
