import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { reduceArchitectureCommand } from '../reducers';

describe('reduceArchitectureCommand', () => {
  it('dispatches DRAW_WALL through the repair pipeline', () => {
    const document = createEmptyArchitectureDocument();

    const next = reduceArchitectureCommand(document, {
      type: 'DRAW_WALL',
      start: [0, 0],
      end: [4, 0],
    });

    expect(next.wallOrder).toHaveLength(1);
  });
});
