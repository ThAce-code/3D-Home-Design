import { useMemo } from 'react';
import * as THREE from 'three';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { buildWallMeshDescriptors } from '../../architecture/geometry/wallMeshes.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { createArchitectureMeshStoreController } from '../../architecture/editing/meshController.js';
import { createEmptyHover } from '../../architecture/editing/tools.js';
import { editorTheme } from '../../theme/editorTheme.js';

const meshController = createArchitectureMeshStoreController({
  editorStore: useArchitectureEditorStore,
  documentStore: useArchitectureDocumentStore,
});

export default function WallMeshes() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const selection = useArchitectureEditorStore((state) => state.selection);
  const hover = useArchitectureEditorStore((state) => state.hover);
  const setHover = useArchitectureEditorStore((state) => state.setHover);
  const clearHover = useArchitectureEditorStore((state) => state.clearHover);
  const startWallDrag = useArchitectureEditorStore((state) => state.startWallDrag);
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
        (() => {
          const isSelected = selection.wallIds.includes(wall.wallId);
          const isHovered = hover.wallId === wall.wallId;
          const color = isSelected
            ? editorTheme.selected
            : isHovered
              ? editorTheme.hovered
              : '#d9ddd6';
          const opacity = isSelected ? 0.85 : isHovered ? 0.75 : 1;

          return (
            <group
              key={wall.wallId}
              position={[wall.origin[0], 0, wall.origin[1]]}
              rotation={[0, -wall.angle, 0]}
            >
              <mesh
                name={`wall:${wall.wallId}`}
                rotation={[-Math.PI / 2, 0, 0]}
                onPointerDown={(event) => {
                  if (activeTool === 'select' && isSelected) {
                    event.stopPropagation?.();
                    const point = event.point ?? event.nativeEvent?.point;
                    if (point) {
                      startWallDrag(document, wall.wallId, [point.x, point.z]);
                    }
                    return;
                  }

                  meshController.handleWallPointerDown(wall.wallId, event);
                }}
                onPointerEnter={() => {
                  if (activeTool === 'select') {
                    setHover({ ...createEmptyHover(), wallId: wall.wallId });
                  }
                }}
                onPointerLeave={() => {
                  clearHover();
                }}
              >
                <extrudeGeometry args={[wall.shape, wall.extrudeSettings]} />
                <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
              </mesh>
            </group>
          );
        })()
      ))}
    </group>
  );
}
