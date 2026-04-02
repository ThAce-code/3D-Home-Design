import { useEffect } from 'react';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import {
  applyArchitectureInteractionCommands,
  getArchitectureSceneContextMenuEffects,
  getArchitectureSceneKeyDownEffects,
  getArchitectureScenePoint,
  getArchitectureSceneKeyUpEffects,
  getArchitectureScenePointerDownEffects,
  getArchitectureScenePointerMoveEffects,
} from '../../architecture/editing/interaction.js';
import WallMeshes from './WallMeshes.js';
import ZoneMeshes from './ZoneMeshes.js';
import DraftWallPreview from './DraftWallPreview.js';

export default function ArchitectureScene() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const replaceDocument = useArchitectureDocumentStore((state) => state.replaceDocument);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);
  const setCursorPoint = useArchitectureEditorStore((state) => state.setCursorPoint);
  const wallTool = useArchitectureEditorStore((state) => state.toolState.wall);
  const viewport = useArchitectureEditorStore((state) => state.viewport);
  const startDraftWall = useArchitectureEditorStore((state) => state.startDraftWall);
  const updateDraftWall = useArchitectureEditorStore((state) => state.updateDraftWall);
  const commitDraftWall = useArchitectureEditorStore((state) => state.commitDraftWall);
  const cancelDraftWall = useArchitectureEditorStore((state) => state.cancelDraftWall);
  const setSelection = useArchitectureEditorStore((state) => state.setSelection);
  const setWallClosurePreview = useArchitectureEditorStore((state) => state.setWallClosurePreview);
  const setWallToolModifiers = useArchitectureEditorStore((state) => state.setWallToolModifiers);
  const setWallNumericEntryEnabled = useArchitectureEditorStore((state) => state.setWallNumericEntryEnabled);
  const interactionHandlers = {
    setSelection,
    setWallClosurePreview,
    startDraftWall,
    replaceDocument,
    commitDraftWall,
    setCursorPoint,
    updateDraftWall,
    setWallToolModifiers,
    setWallNumericEntryEnabled,
    cancelDraftWall,
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const effects = getArchitectureSceneKeyDownEffects({
        activeTool,
        key: event.key,
      });

      if (effects.shouldPreventDefault) {
        event.preventDefault();
      }

      applyArchitectureInteractionCommands(effects.commands, interactionHandlers);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const effects = getArchitectureSceneKeyUpEffects({
        activeTool,
        key: event.key,
      });

      applyArchitectureInteractionCommands(effects.commands, interactionHandlers);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeTool,
    cancelDraftWall,
    setWallClosurePreview,
    setWallNumericEntryEnabled,
    setWallToolModifiers,
  ]);

  const handlePointerDown = (event: { stopPropagation?: () => void; point?: { x: number; z: number } }) => {
    const point = getArchitectureScenePoint(event);
    if (!point) {
      return;
    }

    const effects = getArchitectureScenePointerDownEffects({
      activeTool,
      document,
      draftWall,
      point,
      viewport,
      wallTool,
    });

    if (effects.shouldStopPropagation) {
      event.stopPropagation?.();
    }

    applyArchitectureInteractionCommands(effects.commands, interactionHandlers);
  };

  const handlePointerMove = (event: { point?: { x: number; z: number } }) => {
    const point = getArchitectureScenePoint(event);
    if (!point) {
      return;
    }

    const effects = getArchitectureScenePointerMoveEffects({
      activeTool,
      document,
      draftWall,
      point,
      viewport,
      wallTool,
    });

    applyArchitectureInteractionCommands(effects.commands, interactionHandlers);
  };

  return (
    <group name="architecture-scene">
      <mesh
        name="architecture-interaction-plane"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onContextMenu={(event) => {
          const effects = getArchitectureSceneContextMenuEffects();
          if (effects.shouldStopPropagation) {
            event.stopPropagation?.();
          }
          applyArchitectureInteractionCommands(effects.commands, interactionHandlers);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <ZoneMeshes />
      <WallMeshes />
      <DraftWallPreview />
    </group>
  );
}
