import * as THREE from 'three';
import { getPrimaryLevelId } from '../../architecture/domain/document.js';
import { findNearestWallBodySnapCandidate } from '../../architecture/geometry/wallDraftSnap.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

export default function DraftWallPreview() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);
  const cursorPoint = useArchitectureEditorStore((state) => state.cursorPoint);
  const wallTool = useArchitectureEditorStore((state) => state.toolState.wall);

  const levelId = getPrimaryLevelId(document);
  const thickness = document.levels[levelId]?.defaultWallThickness ?? 0.2;

  const renderFootprint = (point: [number, number]) => (
    <mesh
      name="draft-wall-footprint"
      position={[point[0], 0.002, point[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[thickness, thickness]} />
      <meshBasicMaterial
        color={editorTheme.draft}
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  );

  if (!draftWall && activeTool !== 'wall') {
    return null;
  }

  if (!draftWall) {
    const snapCandidate = cursorPoint
      ? findNearestWallBodySnapCandidate(document, cursorPoint, 1e-6)
      : null;

    return cursorPoint ? (
      <group>
        {renderFootprint(cursorPoint)}
        {snapCandidate ? (
          <mesh
            name="draft-wall-snap-point"
            position={[snapCandidate.point[0], 0.03, snapCandidate.point[1]]}
          >
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={editorTheme.snap} />
          </mesh>
        ) : null}
      </group>
    ) : null;
  }

  const dx = draftWall.currentPoint[0] - draftWall.startPoint[0];
  const dy = draftWall.currentPoint[1] - draftWall.startPoint[1];
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return renderFootprint(draftWall.startPoint);
  }

  const closurePoint = wallTool.constraints.closureCandidatePoint;
  const wallSnapCandidate = findNearestWallBodySnapCandidate(document, draftWall.currentPoint, 1e-6);

  return (
    <group>
      <mesh
        name="draft-wall-preview"
        position={[
          (draftWall.startPoint[0] + draftWall.currentPoint[0]) / 2,
          1.5,
          (draftWall.startPoint[1] + draftWall.currentPoint[1]) / 2,
        ]}
        rotation={[0, -Math.atan2(dy, dx), 0]}
      >
        <boxGeometry args={[length, 3, thickness]} />
        <meshStandardMaterial color={editorTheme.draft} transparent opacity={0.45} />
      </mesh>
      <line name="draft-wall-centerline">
        <bufferGeometry />
        <lineBasicMaterial color={editorTheme.axisGuide} />
      </line>
      {closurePoint ? (
        <mesh
          name="draft-wall-closure-point"
          position={[closurePoint[0], 0.02, closurePoint[1]]}
        >
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={editorTheme.closure} />
        </mesh>
      ) : null}
      {wallSnapCandidate ? (
        <mesh
          name="draft-wall-snap-point"
          position={[wallSnapCandidate.point[0], 0.03, wallSnapCandidate.point[1]]}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={editorTheme.snap} />
        </mesh>
      ) : null}
    </group>
  );
}
