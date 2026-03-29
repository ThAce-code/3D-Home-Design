import { useMemo } from 'react';
import * as THREE from 'three';
import { buildZoneMeshDescriptors } from '../../architecture/geometry/zoneMeshes.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';

export default function ZoneMeshes() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const setSelection = useArchitectureEditorStore((state) => state.setSelection);
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
    <group data-testid="zone-meshes">
      {shapes.map((shape) => (
        <mesh
          key={shape.zoneId}
          name={`zone:${shape.zoneId}`}
          data-testid={`architecture-zone-${shape.zoneId}`}
          rotation={shape.rotation}
          position={shape.position}
          onPointerDown={(event) => {
            if (activeTool !== 'select') {
              return;
            }

            event.stopPropagation();
            setSelection({
              vertexIds: [],
              wallIds: [],
              zoneIds: [shape.zoneId],
            });
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
