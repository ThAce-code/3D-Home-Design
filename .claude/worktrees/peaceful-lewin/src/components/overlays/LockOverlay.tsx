import { useStore } from '../../store/useStore.js';

export default function LockOverlay() {
  const pointerLocked = useStore((s) => s.pointerLocked);
  const hasEnteredOnce = useStore((s) => s.hasEnteredOnce);

  if (pointerLocked || hasEnteredOnce) return null;

  return (
    <div
      data-testid="lock-overlay"
      className="fixed inset-0 flex items-center justify-center z-50 cursor-pointer"
      style={{ background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div className="text-center">
        <p className="text-xl font-medium mb-2" style={{ color: '#F8F5F0' }}>点击进入场景</p>
        <p className="text-sm" style={{ color: '#9AB0A6' }}>WASD 移动 · 鼠标环顾 · Alt 操作面板</p>
      </div>
    </div>
  );
}
