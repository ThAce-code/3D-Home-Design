import { useEffect } from 'react';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { createArchitectureSceneStoreController } from '../../architecture/editing/sceneController.js';
import WallMeshes from './WallMeshes.js';
import ZoneMeshes from './ZoneMeshes.js';
import DraftWallPreview from './DraftWallPreview.js';

const sceneController = createArchitectureSceneStoreController({
  editorStore: useArchitectureEditorStore,
  documentStore: useArchitectureDocumentStore,
});

export default function ArchitectureScene() {
  useEffect(() => {
    window.addEventListener('keydown', sceneController.handleKeyDown);
    window.addEventListener('keyup', sceneController.handleKeyUp);

    return () => {
      window.removeEventListener('keydown', sceneController.handleKeyDown);
      window.removeEventListener('keyup', sceneController.handleKeyUp);
    };
  }, []);

  return (
    <group name="architecture-scene">
      <mesh
        name="architecture-interaction-plane"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onPointerDown={sceneController.handlePointerDown}
        onPointerMove={sceneController.handlePointerMove}
        onContextMenu={sceneController.handleContextMenu}
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
