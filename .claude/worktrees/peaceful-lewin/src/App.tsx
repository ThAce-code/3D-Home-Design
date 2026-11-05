import { Suspense, useEffect } from 'react';
import SceneRoot from './components/canvas/SceneRoot.js';
import BuildGrid from './components/canvas/BuildGrid.js';
import RoomMesh from './components/canvas/RoomMesh.js';
import FloorPlane from './components/canvas/FloorPlane.js';
import FurnitureModel from './components/canvas/FurnitureModel.js';
import GhostPreview from './components/canvas/GhostPreview.js';
import FPSControls from './components/canvas/cameras/FPSControls.js';
import OverlayRoot from './components/layout/OverlayRoot.js';
import DockBar from './components/layout/DockBar.js';
import LeftPanel from './components/layout/LeftPanel.js';
import PropertyPanel from './components/panels/PropertyPanel.js';
import Crosshair from './components/overlays/Crosshair.js';
import ModeIndicator from './components/overlays/ModeIndicator.js';
import LockOverlay from './components/overlays/LockOverlay.js';
import TopActions from './components/overlays/TopActions.js';
import { useStore } from './store/useStore.js';
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys.js';
import { usePersistence } from './hooks/usePersistence.js';
import { autoScale as computeAutoScale } from './services/asset.js';

function SceneContent() {
  const rooms = useStore((s) => s.rooms);
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
      <BuildGrid />
      {rooms.map((room) => (
        <RoomMesh key={room.id} room={room} onFloorClick={handleFloorClick} />
      ))}
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

export default function App() {
  useGlobalHotkeys();
  usePersistence();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: '#111111' }}>
      {/* Full-screen 3D canvas */}
      <SceneRoot>
        <SceneContent />
      </SceneRoot>

      {/* Crosshair always on top of canvas, independent of overlay opacity */}
      <Crosshair />

      {/* Lock overlay (first-time only) */}
      <LockOverlay />

      {/* Mode indicator (flying, placement hint) */}
      <ModeIndicator />

      {/* Floating UI layer — opacity controlled by pointer lock state */}
      <OverlayRoot>
        <TopActions />
        <DockBar />
        <LeftPanel />
        <PropertyPanel />
      </OverlayRoot>
    </div>
  );
}
