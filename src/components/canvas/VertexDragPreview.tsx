import { useMemo } from 'react';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

export default function VertexDragPreview() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const vertexDrag = useArchitectureEditorStore((state) => state.vertexDrag);
  const affectedWalls = useMemo(() => {
    if (!vertexDrag) {
      return [];
    }

    return document.wallOrder.flatMap((wallId) => {
      const wall = document.walls[wallId];
      if (!wall || (wall.startVertexId !== vertexDrag.vertexId && wall.endVertexId !== vertexDrag.vertexId)) {
        return [];
      }

      const startVertex = document.vertices[wall.startVertexId];
      const endVertex = document.vertices[wall.endVertexId];
      if (!startVertex || !endVertex) {
        return [];
      }

      const start = wall.startVertexId === vertexDrag.vertexId
        ? vertexDrag.currentPosition
        : [startVertex.x, startVertex.y] as [number, number];
      const end = wall.endVertexId === vertexDrag.vertexId
        ? vertexDrag.currentPosition
        : [endVertex.x, endVertex.y] as [number, number];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const length = Math.hypot(dx, dy);

      return [{
        wallId,
        start,
        end,
        length,
        angle: Math.atan2(dy, dx),
        thickness: wall.thickness,
        height: wall.height,
      }];
    });
  }, [document, vertexDrag]);

  if (!vertexDrag) {
    return null;
  }

  return (
    <group name="vertex-drag-preview">
      {affectedWalls.map((wall) => (
        <mesh
          key={wall.wallId}
          name={`vertex-drag-wall:${wall.wallId}`}
          position={[
            (wall.start[0] + wall.end[0]) / 2,
            wall.height / 2,
            (wall.start[1] + wall.end[1]) / 2,
          ]}
          rotation={[0, -wall.angle, 0]}
        >
          <boxGeometry args={[wall.length, wall.height, wall.thickness]} />
          <meshStandardMaterial color={editorTheme.draft} transparent opacity={0.32} />
        </mesh>
      ))}
      <mesh name="vertex-drag-target" position={[vertexDrag.currentPosition[0], 0.08, vertexDrag.currentPosition[1]]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={vertexDrag.snappedToVertexId ? editorTheme.snap : editorTheme.handleActive} />
      </mesh>
    </group>
  );
}
