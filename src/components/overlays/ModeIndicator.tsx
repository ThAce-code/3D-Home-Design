import { useStore } from '../../store/useStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

export default function ModeIndicator() {
  const isFlying = useStore((s) => s.isFlying);
  const pointerLocked = useStore((s) => s.pointerLocked);
  const altUnlocked = useStore((s) => s.altUnlocked);
  const selectedAssetId = useStore((s) => s.selectedAssetId);

  return (
    <>
      {pointerLocked && !altUnlocked && isFlying && (
        <div
          data-testid="fly-indicator"
          className="fixed top-4 left-4 z-50 px-3 py-1 rounded-full text-xs font-medium pointer-events-none"
          style={{
            background: editorTheme.accentSoft,
            color: editorTheme.text,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${editorTheme.border}`,
          }}
        >
          飞行模式 (F 切换) · Space 上升 · Shift 下降 · Ctrl 加速
        </div>
      )}
      {pointerLocked && !altUnlocked && selectedAssetId && (
        <div
          data-testid="placement-hint"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium pointer-events-none"
          style={{
            background: editorTheme.surfaceStrong,
            color: editorTheme.accentStrong,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${editorTheme.border}`,
          }}
        >
          准星对准地面点击放置 · 右键取消
        </div>
      )}
    </>
  );
}
