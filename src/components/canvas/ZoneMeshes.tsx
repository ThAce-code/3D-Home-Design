import { useMemo } from 'react';
import * as THREE from 'three';
import { buildZoneMeshDescriptors } from '../../architecture/geometry/zoneMeshes.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { createArchitectureMeshStoreController } from '../../architecture/editing/meshController.js';

const meshController = createArchitectureMeshStoreController({
  editorStore: useArchitectureEditorStore,
  documentStore: useArchitectureDocumentStore,
});

export default function ZoneMeshes() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const zoneMeshes = buildZoneMeshDescriptors(document);
  const shapes = useMemo(() => zoneMeshes.map((polygon) => {
    const shape = new THREE.Shape();
    const [firstPoint, ...restPoints] = polygon.shapePoints;

    if (firstPoint) {
      shape.moveTo(firstPoint[0], firstPoint[1]);
      for (const point of restPoints) {
        shape.lineTo(point[0], point[1]);
      }
      shape.closePath();
    }

    return {
      zoneId: polygon.zoneId,
      position: polygon.position,
      rotation: polygon.rotation,
      shape,
    };
  }), [zoneMeshes]);

  return (
    <group name="zone-meshes">
      {shapes.map((shape) => (
        <mesh
          key={shape.zoneId}
          name={`zone:${shape.zoneId}`}
          rotation={shape.rotation}
          position={shape.position}
          onPointerDown={(event) => {
            meshController.handleZonePointerDown(shape.zoneId, event);
          }}
        >
          <shapeGeometry args={[shape.shape]} />
          <meshStandardMaterial
            color="#6e8f71"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
