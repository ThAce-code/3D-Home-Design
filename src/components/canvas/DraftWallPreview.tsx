import { getPrimaryLevelId } from '../../architecture/domain/document.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';

export default function DraftWallPreview() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);

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

  return (
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
  );
}
