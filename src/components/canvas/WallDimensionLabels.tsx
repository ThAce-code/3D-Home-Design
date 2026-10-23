import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { getWallDragPreviewPositions } from '../../architecture/editing/wallDragInteraction.js';
import type { Point2 } from '../../architecture/topology/math.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

interface WallLabelDescriptor {
  wallId: string;
  midpoint: Point2;
  length: number;
}

export default function WallDimensionLabels() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const selection = useArchitectureEditorStore((state) => state.selection);
  const vertexDrag = useArchitectureEditorStore((state) => state.vertexDrag);
  const wallDrag = useArchitectureEditorStore((state) => state.wallDrag);
  const labels = useMemo<WallLabelDescriptor[]>(() => {
    const wallIds = new Set(selection.wallIds);

    if (wallDrag) {
      wallIds.add(wallDrag.wallId);
    }

    if (vertexDrag) {
      for (const wallId of document.wallOrder) {
        const wall = document.walls[wallId];
        if (wall?.startVertexId === vertexDrag.vertexId || wall?.endVertexId === vertexDrag.vertexId) {
          wallIds.add(wallId);
        }
      }
    }

    return [...wallIds].flatMap((wallId) => {
      const wall = document.walls[wallId];
      if (!wall) {
        return [];
      }

      const startVertex = document.vertices[wall.startVertexId];
      const endVertex = document.vertices[wall.endVertexId];
      if (!startVertex || !endVertex) {
        return [];
      }

      const wallDragPreview = wallDrag?.wallId === wallId
        ? getWallDragPreviewPositions({ wallDrag })
        : null;
      const start: Point2 = wallDragPreview
        ? wallDragPreview.startPosition
        : vertexDrag?.vertexId === wall.startVertexId
          ? vertexDrag.currentPosition
          : [startVertex.x, startVertex.y];
      const end: Point2 = wallDragPreview
        ? wallDragPreview.endPosition
        : vertexDrag?.vertexId === wall.endVertexId
          ? vertexDrag.currentPosition
          : [endVertex.x, endVertex.y];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];

      return [{
        wallId,
        midpoint: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2] as Point2,
        length: Math.hypot(dx, dy),
      }];
    });
  }, [document, selection.wallIds, vertexDrag, wallDrag]);

  if (!labels.length) {
    return null;
  }

  return (
    <group name="wall-dimension-labels">
      {labels.map((label) => (
        <Html
          key={label.wallId}
          position={[label.midpoint[0], 0.12, label.midpoint[1]]}
          center
          transform={false}
          zIndexRange={[20, 0]}
        >
          <div
            data-testid={`wall-dimension-label:${label.wallId}`}
            style={{
              padding: '3px 6px',
              borderRadius: 4,
              border: `1px solid ${editorTheme.dimensionLine}`,
              background: editorTheme.surfaceStrong,
              color: editorTheme.dimension,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 8px 20px rgba(47, 36, 24, 0.12)',
            }}
          >
            {label.length.toFixed(2)} m
          </div>
        </Html>
      ))}
    </group>
  );
}
