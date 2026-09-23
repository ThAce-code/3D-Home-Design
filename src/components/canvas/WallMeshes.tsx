import { useMemo } from 'react';
import * as THREE from 'three';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { buildWallMeshDescriptors } from '../../architecture/geometry/wallMeshes.js';
import { findZoneIdContainingPoint } from '../../architecture/geometry/zoneSelection.js';
import { isPointNearWallFootprint } from '../../architecture/geometry/wallSelection.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { reduceArchitectureCommand } from '../../architecture/editing/reducers.js';

export default function WallMeshes() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const replaceDocument = useArchitectureDocumentStore((state) => state.replaceDocument);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const setSelection = useArchitectureEditorStore((state) => state.setSelection);
  const walls = buildWallMeshDescriptors(document);
  const wallShapes = useMemo(() => walls.map((wall) => {
    const shape = new THREE.Shape();
    const [firstPoint, ...restPoints] = wall.footprintPoints;

    if (firstPoint) {
      shape.moveTo(firstPoint[0], -firstPoint[1]);
      for (const point of restPoints) {
        shape.lineTo(point[0], -point[1]);
      }
      shape.closePath();
    }

    return {
      ...wall,
      shape,
      extrudeSettings: {
        depth: wall.height,
        bevelEnabled: false,
      },
    };
  }), [walls]);

  return (
    <group name="wall-meshes">
      {wallShapes.map((wall) => (
        <group
          key={wall.wallId}
          position={[wall.origin[0], 0, wall.origin[1]]}
          rotation={[0, -wall.angle, 0]}
        >
          <mesh
            name={`wall:${wall.wallId}`}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerDown={(event) => {
              if (activeTool === 'delete') {
                event.stopPropagation();
                replaceDocument(reduceArchitectureCommand(document, {
                  type: 'DELETE_WALL',
                  wallId: wall.wallId,
                }));
                setSelection({
                  vertexIds: [],
                  wallIds: [],
                  zoneIds: [],
                });
                return;
              }

              if (activeTool !== 'select') {
                return;
              }

              const intersections = ('intersections' in event && Array.isArray(event.intersections))
                ? event.intersections
                : ('nativeEvent' in event
                  && event.nativeEvent
                  && 'intersections' in event.nativeEvent
                  && Array.isArray(event.nativeEvent.intersections)
                  ? event.nativeEvent.intersections
                  : []);
              const groundIntersection = intersections.find((intersection) => {
                  const name = intersection.object?.name ?? '';

                  return name === 'architecture-interaction-plane' || name === 'floor-plane';
                });
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
            <extrudeGeometry args={[wall.shape, wall.extrudeSettings]} />
            <meshStandardMaterial color="#d9ddd6" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
