import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../document';

describe('createEmptyArchitectureDocument', () => {
  it('creates a single empty level with defaults', () => {
    const doc = createEmptyArchitectureDocument();

    expect(doc.levelOrder).toHaveLength(1);
    expect(doc.levels[doc.levelOrder[0]].wallIds).toEqual([]);
  });
});
