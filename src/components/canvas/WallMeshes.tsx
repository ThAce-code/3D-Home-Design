import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { buildWallMeshDescriptors } from '../../architecture/geometry/wallMeshes.js';
import { findZoneIdContainingPoint } from '../../architecture/geometry/zoneSelection.js';
import { isPointNearWallFootprint } from '../../architecture/geometry/wallSelection.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';

export default function WallMeshes() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const setSelection = useArchitectureEditorStore((state) => state.setSelection);
  const walls = buildWallMeshDescriptors(document);

  return (
    <group data-testid="wall-meshes">
      {walls.map((wall) => (
        <mesh
          key={wall.wallId}
          name={`wall:${wall.wallId}`}
          data-testid={`architecture-wall-${wall.wallId}`}
          position={[wall.center[0], wall.height / 2, wall.center[1]]}
          rotation={[0, -wall.angle, 0]}
          onPointerDown={(event) => {
            if (activeTool !== 'select') {
              return;
            }

            const groundIntersection = 'intersections' in event && Array.isArray(event.intersections)
              ? event.intersections.find((intersection) => {
                const name = intersection.object?.name ?? '';

                return name === 'architecture-interaction-plane' || name === 'floor-plane';
              })
              : null;
            const groundPoint = groundIntersection
              ? [groundIntersection.point.x, groundIntersection.point.z] as [number, number]
              : null;
            const zoneId = groundPoint ? findZoneIdContainingPoint(document, groundPoint) : null;
            const shouldPreferZone = Boolean(
              zoneId
              && groundPoint
              && !isPointNearWallFootprint(document, wall.wallId, groundPoint)
            );

            event.stopPropagation();

            if (shouldPreferZone && zoneId) {
              setSelection({
                vertexIds: [],
                wallIds: [],
                zoneIds: [zoneId],
              });
              return;
            }

            setSelection({
              vertexIds: [],
              wallIds: [wall.wallId],
              zoneIds: [],
            });
          }}
        >
          <boxGeometry args={[wall.length, wall.height, wall.thickness]} />
          <meshStandardMaterial color="#d9ddd6" />
        </mesh>
      ))}
    </group>
  );
}
