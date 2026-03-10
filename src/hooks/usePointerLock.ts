import { useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore.js';

export function usePointerLock(canvasRef: React.RefObject<HTMLElement | null>) {
  const setPointerLocked = useStore((s) => s.setPointerLocked);

  const requestLock = useCallback(() => {
    canvasRef.current?.requestPointerLock();
  }, [canvasRef]);

  const exitLock = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  useEffect(() => {
    const onChange = () => {
      setPointerLocked(!!document.pointerLockElement);
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [setPointerLocked]);

  return { requestLock, exitLock };
}
