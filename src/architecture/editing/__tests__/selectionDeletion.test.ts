import { describe, expect, it, vi } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { rebuildZones } from '../../topology/zones';
import { createArchitectureHotkeyStoreController } from '../hotkeyController';
import { reduceArchitectureCommand } from '../reducers';
import type { ArchitectureSelection } from '../tools';

function createRooms() {
  const document = createEmptyArchitectureDocument();
  const levelId = document.levelOrder[0];
  const points = [[0, 0], [2, 0], [4, 0], [4, 2], [2, 2], [0, 2], [6, 0], [7, 0]];
  document.vertices = Object.fromEntries(points.map(([x, y], i) => [`v${i + 1}`, { id: `v${i + 1}`, x, y }]));
  const edges = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [2, 5], [7, 8]];
  document.wallOrder = edges.map((_, i) => `w${i + 1}`);
  document.walls = Object.fromEntries(edges.map(([a, b], i) => [`w${i + 1}`, {
    id: `w${i + 1}`, levelId, startVertexId: `v${a}`, endVertexId: `v${b}`,
    thickness: 0.2, height: 3, kind: 'structural' as const,
  }]));
  return rebuildZones(document);
}

function deleteSelection(selection: ArchitectureSelection, document = createRooms()) {
  const replaceDocument = vi.fn();
  const clearSelection = vi.fn();
  const controller = createArchitectureHotkeyStoreController({
    documentStore: { getState: () => ({ document, replaceDocument }) },
    editorStore: { getState: () => ({
      selection, draftWall: null, clearSelection, cancelDraftWall: vi.fn(), setWallClosurePreview: vi.fn(),
    }) },
  });
  const handled = controller.deleteSelection();
  return { document, replaceDocument, clearSelection, handled };
}

describe('selected architecture deletion', () => {
  it('deletes every selected wall in one document commit', () => {
    const result = deleteSelection({ wallIds: ['w1', 'w3'], vertexIds: [], zoneIds: [] });
    expect(result.handled).toBe(true);
    expect(result.replaceDocument).toHaveBeenCalledTimes(1);
    expect(result.replaceDocument.mock.calls[0][0].wallOrder).toEqual(['w2', 'w4', 'w5', 'w6', 'w7', 'w8']);
    expect(result.clearSelection).toHaveBeenCalledTimes(1);
  });

  it('uses the same zone deletion semantics as the property panel', () => {
    const document = createRooms();
    const zoneId = document.zoneOrder[0];
    const result = deleteSelection({ wallIds: [], vertexIds: [], zoneIds: [zoneId] }, document);
    expect(result.handled).toBe(true);
    expect(result.replaceDocument).toHaveBeenCalledTimes(1);
    const expected = reduceArchitectureCommand(result.document, { type: 'DELETE_ZONE', zoneId });
    expect(result.replaceDocument.mock.calls[0][0].wallOrder).toEqual(expected.wallOrder);
    expect(result.replaceDocument.mock.calls[0][0].walls).toEqual(expected.walls);
  });

  it('resolves adjacent selected zones before rebuilding their shared boundary', () => {
    const document = createRooms();
    expect(document.zoneOrder).toHaveLength(2);
    const result = deleteSelection({ wallIds: ['w1', 'w1'], vertexIds: ['v2'], zoneIds: document.zoneOrder }, document);
    expect(result.replaceDocument).toHaveBeenCalledTimes(1);
    const next = result.replaceDocument.mock.calls[0][0];
    expect(next.wallOrder).toEqual(['w8']);
    expect(next.zoneOrder).toEqual([]);
    expect(next.vertices.v2).toBeUndefined();
    expect(result.document.wallOrder).toHaveLength(8);
  });

  it('deletes all selected vertices and their incident walls', () => {
    const result = deleteSelection({ wallIds: [], vertexIds: ['v1', 'v3'], zoneIds: [] });
    expect(result.replaceDocument).toHaveBeenCalledTimes(1);
    expect(result.replaceDocument.mock.calls[0][0].wallOrder).toEqual(['w4', 'w5', 'w7', 'w8']);
  });

  it('does not commit an empty selection', () => {
    const result = deleteSelection({ wallIds: [], vertexIds: [], zoneIds: [] });
    expect(result.handled).toBe(false);
    expect(result.replaceDocument).not.toHaveBeenCalled();
  });
});
