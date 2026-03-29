import { getPrimaryLevelId } from '../../architecture/domain/document.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';

export default function DraftWallPreview() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);
  const wallTool = useArchitectureEditorStore((state) => state.toolState.wall);

  if (!draftWall) {
    return null;
  }

  const levelId = getPrimaryLevelId(document);
  const thickness = document.levels[levelId]?.defaultWallThickness ?? 0.2;
  const dx = draftWall.currentPoint[0] - draftWall.startPoint[0];
  const dy = draftWall.currentPoint[1] - draftWall.startPoint[1];
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return null;
  }

  const closurePoint = wallTool.constraints.closureCandidatePoint;

  return (
    <group>
      <mesh
        data-testid="draft-wall-preview"
        position={[
          (draftWall.startPoint[0] + draftWall.currentPoint[0]) / 2,
          1.5,
          (draftWall.startPoint[1] + draftWall.currentPoint[1]) / 2,
        ]}
        rotation={[0, -Math.atan2(dy, dx), 0]}
      >
        <boxGeometry args={[length, 3, thickness]} />
        <meshStandardMaterial color="#28A375" transparent opacity={0.45} />
      </mesh>
      <line data-testid="draft-wall-centerline">
        <bufferGeometry />
        <lineBasicMaterial color="#1E7A55" />
      </line>
      {closurePoint ? (
        <mesh
          data-testid="draft-wall-closure-point"
          position={[closurePoint[0], 0.02, closurePoint[1]]}
        >
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#F4B942" />
        </mesh>
      ) : null}
    </group>
  );
}
