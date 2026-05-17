import { useMemo } from 'react';
import { resolveEditHandles, type EditHandle } from '../../architecture/editing/editHandle.js';
import { reduceArchitectureCommand } from '../../architecture/editing/reducers.js';
import { createEmptyHover, createEmptySelection } from '../../architecture/editing/tools.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

function VertexHandle({ handle }: { handle: EditHandle }) {
  const hover = useArchitectureEditorStore((state) => state.hover);
  const vertexDrag = useArchitectureEditorStore((state) => state.vertexDrag);
  const setHover = useArchitectureEditorStore((state) => state.setHover);
  const clearHover = useArchitectureEditorStore((state) => state.clearHover);
  const startVertexDrag = useArchitectureEditorStore((state) => state.startVertexDrag);
  const isHovered = hover.vertexId === handle.entityId;
  const isActive = vertexDrag?.vertexId === handle.entityId;
  const color = isActive ? editorTheme.handleActive : isHovered ? editorTheme.handleHovered : editorTheme.handle;
  const scale = isHovered || isActive ? 1.3 : 1;

  return (
    <group
      name={handle.id}
      data-testid={handle.id}
      position={[handle.position[0], 0, handle.position[1]]}
      scale={[scale, scale, scale]}
      onPointerEnter={() => {
        setHover({ ...createEmptyHover(), vertexId: handle.entityId });
      }}
      onPointerLeave={() => {
        clearHover();
      }}
      onPointerDown={(event) => {
        event.stopPropagation?.();
        startVertexDrag(handle.entityId, handle.position);
      }}
    >
      <mesh name={`${handle.id}:hit`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[0.18, 24]} />
        <meshBasicMaterial color={editorTheme.handleRing} transparent opacity={0.35} />
      </mesh>
      <mesh name={`${handle.id}:disc`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <circleGeometry args={[0.12, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh name={`${handle.id}:knob`} position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function MidpointHandle({ handle }: { handle: EditHandle }) {
  const document = useArchitectureDocumentStore((state) => state.document);
  const replaceDocument = useArchitectureDocumentStore((state) => state.replaceDocument);
  const hover = useArchitectureEditorStore((state) => state.hover);
  const setHover = useArchitectureEditorStore((state) => state.setHover);
  const clearHover = useArchitectureEditorStore((state) => state.clearHover);
  const setSelection = useArchitectureEditorStore((state) => state.setSelection);
  const isHovered = hover.wallId === handle.entityId;
  const color = isHovered ? editorTheme.accentStrong : editorTheme.accent;
  const scale = isHovered ? 1.2 : 1;

  return (
    <group
      name={handle.id}
      data-testid={handle.id}
      position={[handle.position[0], 0, handle.position[1]]}
      scale={[scale, scale, scale]}
      onPointerEnter={() => {
        setHover({ ...createEmptyHover(), wallId: handle.entityId });
      }}
      onPointerLeave={() => {
        clearHover();
      }}
      onPointerDown={(event) => {
        event.stopPropagation?.();
        const nextDocument = reduceArchitectureCommand(document, {
          type: 'SPLIT_WALL',
          wallId: handle.entityId,
          splitPoint: handle.position,
        });
        const midpointVertexId = nextDocument.walls[handle.entityId]?.endVertexId;

        replaceDocument(nextDocument);
        setSelection({
          ...createEmptySelection(),
          vertexIds: midpointVertexId && nextDocument.vertices[midpointVertexId]
            ? [midpointVertexId]
            : [],
        });
      }}
    >
      <mesh name={`${handle.id}:hit`} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.006, 0]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshBasicMaterial color={editorTheme.accent} transparent opacity={0.18} />
      </mesh>
      <mesh name={`${handle.id}:diamond`} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.008, 0]}>
        <planeGeometry args={[0.14, 0.14]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

export default function EditHandles() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const selection = useArchitectureEditorStore((state) => state.selection);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const handles = useMemo(
    () => resolveEditHandles(document, selection),
    [document, selection],
  );

  if (activeTool !== 'select') {
    return null;
  }

  return (
    <group name="edit-handles">
      {handles.map((handle) => (
        handle.kind === 'wall-midpoint'
          ? <MidpointHandle key={handle.id} handle={handle} />
          : <VertexHandle key={handle.id} handle={handle} />
      ))}
    </group>
  );
}
