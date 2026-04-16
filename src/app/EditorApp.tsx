import { Suspense, useEffect } from 'react';
import SceneRoot from '../components/canvas/SceneRoot.js';
import FloorPlane from '../components/canvas/FloorPlane.js';
import FurnitureModel from '../components/canvas/FurnitureModel.js';
import GhostPreview from '../components/canvas/GhostPreview.js';
import FPSControls from '../components/canvas/cameras/FPSControls.js';
import OverlayRoot from '../components/layout/OverlayRoot.js';
import DockBar from '../components/layout/DockBar.js';
import LeftPanel from '../components/layout/LeftPanel.js';
import PropertyPanel from '../components/panels/PropertyPanel.js';
import Crosshair from '../components/overlays/Crosshair.js';
import ModeIndicator from '../components/overlays/ModeIndicator.js';
import LockOverlay from '../components/overlays/LockOverlay.js';
import TopActions from '../components/overlays/TopActions.js';
import { useStore } from '../store/useStore.js';
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys.js';
import { usePersistence } from '../hooks/usePersistence.js';
import { useArchitecturePersistence } from '../hooks/useArchitecturePersistence.js';
import { autoScale as computeAutoScale } from '../services/asset.js';
import { editorTheme } from '../theme/editorTheme.js';

function SceneContent() {
  const items = useStore((s) => s.items);
  const selectedAssetId = useStore((s) => s.selectedAssetId);
  const assets = useStore((s) => s.assets);
  const addItem = useStore((s) => s.addItem);

  const handleFloorClick = (point: [number, number, number]) => {
    if (!selectedAssetId) return;
    const asset = assets.find((a) => a.id === selectedAssetId);
    if (!asset) return;

    let scale: [number, number, number] = [1, 1, 1];
    let baseSize: [number, number, number] | undefined;
    let adjustedY = 0;

    const s = computeAutoScale({ size: asset.bboxSize, min: asset.bboxMin });
    scale = [s, s, s];
    baseSize = asset.bboxSize;
    adjustedY = -asset.bboxMin[1] * s;

    addItem(selectedAssetId, [point[0], adjustedY, point[2]], scale, baseSize);
  };

  return (
    <>
      <FloorPlane onFloorClick={handleFloorClick} />
      <Suspense fallback={null}>
        {items.map((item) => (
          <FurnitureModel key={item.id} item={item} />
        ))}
      </Suspense>
      <GhostPreview />
      <FPSControls />
    </>
  );
}

export default function EditorApp() {
  useGlobalHotkeys();
  usePersistence();
  useArchitecturePersistence();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <div
      data-app-theme="editor"
      className="h-screen w-screen overflow-hidden"
      style={{ background: editorTheme.background }}
    >
      <SceneRoot showArchitectureScene>
        <SceneContent />
      </SceneRoot>

      <Crosshair />
      <LockOverlay />
      <ModeIndicator />

      <OverlayRoot>
        <TopActions architectureModeEnabled />
        <DockBar />
        <LeftPanel architectureModeEnabled />
        <PropertyPanel architectureModeEnabled />
      </OverlayRoot>
    </div>
  );
}
