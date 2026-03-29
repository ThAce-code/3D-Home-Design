import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import {
  advanceWallDraftInteraction,
  updateWallDraftPointer,
} from '../../architecture/editing/interaction.js';
import { findZoneIdContainingPoint } from '../../architecture/geometry/zoneSelection.js';
import WallMeshes from './WallMeshes.js';
import ZoneMeshes from './ZoneMeshes.js';
import DraftWallPreview from './DraftWallPreview.js';

export default function ArchitectureScene() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const replaceDocument = useArchitectureDocumentStore((state) => state.replaceDocument);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);
  const startDraftWall = useArchitectureEditorStore((state) => state.startDraftWall);
  const updateDraftWall = useArchitectureEditorStore((state) => state.updateDraftWall);
  const commitDraftWall = useArchitectureEditorStore((state) => state.commitDraftWall);
  const cancelDraftWall = useArchitectureEditorStore((state) => state.cancelDraftWall);
  const setSelection = useArchitectureEditorStore((state) => state.setSelection);

  const getPoint = (event: { point?: { x: number; z: number } }) => {
    if (!event.point) {
      return null;
    }

    return [event.point.x, event.point.z] as [number, number];
  };

  const handlePointerDown = (event: { stopPropagation?: () => void; point?: { x: number; z: number } }) => {
    const point = getPoint(event);
    if (!point) {
      return;
    }

    if (activeTool === 'select') {
      const zoneId = findZoneIdContainingPoint(document, point);
      if (!zoneId) {
        return;
      }

      event.stopPropagation?.();
      setSelection({
        vertexIds: [],
        wallIds: [],
        zoneIds: [zoneId],
      });
      return;
    }

    if (activeTool !== 'wall') {
      return;
    }

    event.stopPropagation?.();

    const next = advanceWallDraftInteraction({
      activeTool,
      document,
      draftWall,
      point,
    });

    if (!draftWall && next.draftWall) {
      startDraftWall(next.draftWall.startPoint, next.draftWall.snappedVertexId);
      return;
    }

    if (!next.draftWall) {
      replaceDocument(next.document);
      commitDraftWall();
    }
  };

  const handlePointerMove = (event: { point?: { x: number; z: number } }) => {
    if (activeTool !== 'wall' || !draftWall) {
      return;
    }

    const point = getPoint(event);
    if (!point) {
      return;
    }

    const nextDraftWall = updateWallDraftPointer({
      activeTool,
      draftWall,
      point,
    });

    if (nextDraftWall) {
      updateDraftWall(nextDraftWall.currentPoint, nextDraftWall.snappedVertexId);
    }
  };

  return (
    <group data-testid="architecture-scene">
      <mesh
        name="architecture-interaction-plane"
        data-testid="architecture-interaction-plane"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onContextMenu={(event) => {
          event.stopPropagation?.();
          cancelDraftWall();
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <ZoneMeshes />
      <WallMeshes />
      <DraftWallPreview />
    </group>
  );
}
