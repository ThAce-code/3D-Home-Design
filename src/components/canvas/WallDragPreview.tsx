import { useMemo } from 'react';
import { getWallDragPreviewPositions } from '../../architecture/editing/wallDragInteraction.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

export default function WallDragPreview() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const wallDrag = useArchitectureEditorStore((state) => state.wallDrag);
  const preview = useMemo(() => {
    if (!wallDrag) {
      return null;
    }

    const wall = document.walls[wallDrag.wallId];
    if (!wall) {
      return null;
    }

    const { startPosition, endPosition } = getWallDragPreviewPositions({ wallDrag });
    const dx = endPosition[0] - startPosition[0];
    const dy = endPosition[1] - startPosition[1];
    const length = Math.hypot(dx, dy);

    return {
      wallId: wallDrag.wallId,
      startPosition,
      endPosition,
      midpoint: [
        (startPosition[0] + endPosition[0]) / 2,
        (startPosition[1] + endPosition[1]) / 2,
      ] as [number, number],
      originMidpoint: [
        (wallDrag.startVertexOrigin[0] + wallDrag.endVertexOrigin[0]) / 2,
        (wallDrag.startVertexOrigin[1] + wallDrag.endVertexOrigin[1]) / 2,
      ] as [number, number],
      length,
      angle: Math.atan2(dy, dx),
      thickness: wall.thickness,
      height: wall.height,
    };
  }, [document, wallDrag]);

  if (!preview) {
    return null;
  }

  return (
    <group name="wall-drag-preview">
      <mesh
        name={`wall-drag-origin:${preview.wallId}`}
        position={[preview.originMidpoint[0], preview.height / 2, preview.originMidpoint[1]]}
        rotation={[0, -preview.angle, 0]}
      >
        <boxGeometry args={[preview.length, preview.height, preview.thickness]} />
        <meshStandardMaterial color={editorTheme.selectedOutline} transparent opacity={0.12} />
      </mesh>
      <mesh
        name={`wall-drag-wall:${preview.wallId}`}
        position={[preview.midpoint[0], preview.height / 2, preview.midpoint[1]]}
        rotation={[0, -preview.angle, 0]}
      >
        <boxGeometry args={[preview.length, preview.height, preview.thickness]} />
        <meshStandardMaterial color={editorTheme.draft} transparent opacity={0.32} />
      </mesh>
    </group>
  );
}
