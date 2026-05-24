import { useMemo } from 'react';
import * as THREE from 'three';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { buildWallMeshDescriptors } from '../../architecture/geometry/wallMeshes.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { createArchitectureMeshStoreController } from '../../architecture/editing/meshController.js';

const meshController = createArchitectureMeshStoreController({
  editorStore: useArchitectureEditorStore,
  documentStore: useArchitectureDocumentStore,
});

export default function WallMeshes() {
  const document = useArchitectureDocumentStore((state) => state.document);
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
              meshController.handleWallPointerDown(wall.wallId, event);
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
