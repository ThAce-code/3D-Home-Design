import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { buildOpeningMeshDescriptors } from '../../architecture/geometry/openingMeshes.js';
import { reduceArchitectureCommand } from '../../architecture/editing/reducers.js';
import { createEmptyHover, createEmptySelection } from '../../architecture/editing/tools.js';
import { editorTheme } from '../../theme/editorTheme.js';

export default function OpeningMeshes() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const replaceDocument = useArchitectureDocumentStore((state) => state.replaceDocument);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const selection = useArchitectureEditorStore((state) => state.selection);
  const hover = useArchitectureEditorStore((state) => state.hover);
  const setSelection = useArchitectureEditorStore((state) => state.setSelection);
  const setHover = useArchitectureEditorStore((state) => state.setHover);
  const clearHover = useArchitectureEditorStore((state) => state.clearHover);
  const openings = buildOpeningMeshDescriptors(document);

  return (
    <group name="opening-meshes">
      {openings.map((opening) => {
        const isSelected = (selection.openingIds ?? []).includes(opening.openingId);
        const isHovered = hover.openingId === opening.openingId;
        const color = opening.kind === 'door'
          ? (isSelected ? editorTheme.selected : isHovered ? editorTheme.hovered : '#8b5a2b')
          : (isSelected ? editorTheme.selected : isHovered ? editorTheme.hovered : '#7eb6d9');

        return (
          <mesh
            key={opening.openingId}
            name={`opening:${opening.openingId}`}
            position={opening.position}
            rotation={[0, opening.rotationY, 0]}
            onPointerDown={(event) => {
              if (activeTool !== 'select' && activeTool !== 'delete') {
                return;
              }
              event.stopPropagation?.();
              if (activeTool === 'delete') {
                replaceDocument(reduceArchitectureCommand(document, {
                  type: 'DELETE_OPENING',
                  openingId: opening.openingId,
                }));
                setSelection(createEmptySelection());
                return;
              }
              setSelection({
                ...createEmptySelection(),
                openingIds: [opening.openingId],
              });
            }}
            onPointerEnter={() => {
              if (activeTool === 'select' || activeTool === 'delete') {
                setHover({ ...createEmptyHover(), openingId: opening.openingId });
              }
            }}
            onPointerLeave={() => {
              clearHover();
            }}
          >
            <boxGeometry args={[opening.width, opening.height, opening.depth]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={isSelected ? 0.85 : 0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
}
