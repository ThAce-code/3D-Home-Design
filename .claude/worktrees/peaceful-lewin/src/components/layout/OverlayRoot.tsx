import type { ReactNode } from 'react';
import { useStore } from '../../store/useStore.js';

interface Props {
  children: ReactNode;
}

export default function OverlayRoot({ children }: Props) {
  const pointerLocked = useStore((s) => s.pointerLocked);
  const altUnlocked = useStore((s) => s.altUnlocked);

  const uiActive = !pointerLocked || altUnlocked;

  return (
    <div
      className="fixed inset-0 z-40 transition-opacity duration-150"
      style={{
        opacity: uiActive ? 1 : 0.3,
        pointerEvents: uiActive ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  );
}
