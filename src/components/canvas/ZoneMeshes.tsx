import { useMemo } from 'react';
import * as THREE from 'three';
import { buildZoneMeshDescriptors } from '../../architecture/geometry/zoneMeshes.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { createArchitectureMeshStoreController } from '../../architecture/editing/meshController.js';
import { createEmptyHover } from '../../architecture/editing/tools.js';
import { editorTheme } from '../../theme/editorTheme.js';

const meshController = createArchitectureMeshStoreController({
  editorStore: useArchitectureEditorStore,
  documentStore: useArchitectureDocumentStore,
});

export default function ZoneMeshes() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const selection = useArchitectureEditorStore((state) => state.selection);
  const hover = useArchitectureEditorStore((state) => state.hover);
  const setHover = useArchitectureEditorStore((state) => state.setHover);
  const clearHover = useArchitectureEditorStore((state) => state.clearHover);
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
        (() => {
          const isSelected = selection.zoneIds.includes(shape.zoneId);
          const isHovered = hover.zoneId === shape.zoneId;
          const color = isSelected
            ? editorTheme.selected
            : isHovered
              ? editorTheme.hovered
              : '#6e8f71';
          const opacity = isSelected ? 0.5 : isHovered ? 0.45 : 0.35;

          return (
            <mesh
              key={shape.zoneId}
              name={`zone:${shape.zoneId}`}
              rotation={shape.rotation}
              position={shape.position}
              onPointerDown={(event) => {
                meshController.handleZonePointerDown(shape.zoneId, event);
              }}
              onPointerEnter={() => {
                if (activeTool === 'select') {
                  setHover({ ...createEmptyHover(), zoneId: shape.zoneId });
                }
              }}
              onPointerLeave={() => {
                clearHover();
              }}
            >
              <shapeGeometry args={[shape.shape]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })()
      ))}
    </group>
  );
}
