import { useStore } from '../../store/useStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

export default function LockOverlay() {
  const pointerLocked = useStore((s) => s.pointerLocked);
  const hasEnteredOnce = useStore((s) => s.hasEnteredOnce);

  if (pointerLocked || hasEnteredOnce) return null;

  return (
    <div
      data-testid="lock-overlay"
      className="fixed inset-0 flex items-center justify-center z-50 cursor-pointer"
      style={{ background: editorTheme.overlayScrim, backdropFilter: 'blur(6px)' }}
    >
      <div
        className="rounded-[24px] border px-8 py-7 text-center"
        style={{
          background: editorTheme.surfaceStrong,
          borderColor: editorTheme.border,
          boxShadow: '0 32px 96px -48px rgba(82, 56, 33, 0.42)',
        }}
      >
        <p className="mb-2 text-xl font-medium" style={{ color: editorTheme.text }}>点击进入场景</p>
        <p className="text-sm" style={{ color: editorTheme.textMuted }}>WASD 移动 · 鼠标环顾 · Alt 操作面板</p>
      </div>
    </div>
  );
}
