import { useStore } from '../../store/useStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

export default function Crosshair() {
  const pointerLocked = useStore((s) => s.pointerLocked);
  const altUnlocked = useStore((s) => s.altUnlocked);
  const selectedAssetId = useStore((s) => s.selectedAssetId);

  if (altUnlocked) return null;
  if (!pointerLocked && !selectedAssetId) return null;

  const color = selectedAssetId ? editorTheme.accentStrong : editorTheme.crosshair;

  return (
    <div className="fixed top-1/2 left-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
      {/* Horizontal */}
      <div className="absolute top-1/2 left-0 w-[8px] h-[2px] -translate-y-1/2" style={{ background: color }} />
      <div className="absolute top-1/2 right-0 w-[8px] h-[2px] -translate-y-1/2" style={{ background: color }} />
      {/* Vertical */}
      <div className="absolute top-0 left-1/2 w-[2px] h-[8px] -translate-x-1/2" style={{ background: color }} />
      <div className="absolute bottom-0 left-1/2 w-[2px] h-[8px] -translate-x-1/2" style={{ background: color }} />
    </div>
  );
}
