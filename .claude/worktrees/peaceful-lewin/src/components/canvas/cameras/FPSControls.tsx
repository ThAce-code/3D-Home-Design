import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useStore } from '../../../store/useStore.js';
import * as THREE from 'three';

const SPEED = 5;
const SPRINT_MULT = 2;
const FLY_SPEED = 8;

const _keys = new Set<string>();

export default function FPSControls() {
  const controlsRef = useRef<any>(null);
  const altRef = useRef(false);
  const { camera, gl } = useThree();
  const pointerLocked = useStore((s) => s.pointerLocked);
  const isFlying = useStore((s) => s.isFlying);

  // Alt key: temporary unlock
  const handleAltDown = useCallback(() => {
    if (!document.pointerLockElement) return;
    altRef.current = true;
    useStore.getState().setAltUnlocked(true);
    document.exitPointerLock();
  }, []);

  const handleAltUp = useCallback(() => {
    if (!altRef.current) return;
    altRef.current = false;
    useStore.getState().setAltUnlocked(false);
    gl.domElement.requestPointerLock();
  }, [gl]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      _keys.add(e.code);
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault();
        handleAltDown();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      _keys.delete(e.code);
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault();
        handleAltUp();
      }
    };
    const onBlur = () => {
      altRef.current = false;
      _keys.clear();
      useStore.getState().setAltUnlocked(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleAltDown, handleAltUp]);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const onLock = () => {
      const state = useStore.getState();
      state.setPointerLocked(true);
      if (!state.hasEnteredOnce) state.setHasEnteredOnce();
    };
    const onUnlock = () => {
      const state = useStore.getState();
      state.setPointerLocked(false);
      if (!altRef.current) state.setAltUnlocked(false);
      _keys.clear();
    };
    ctrl.addEventListener('lock', onLock);
    ctrl.addEventListener('unlock', onUnlock);
    return () => {
      ctrl.removeEventListener('lock', onLock);
      ctrl.removeEventListener('unlock', onUnlock);
    };
  }, []);

  useFrame((_, delta) => {
    if (!pointerLocked) return;

    const shift = _keys.has('ShiftLeft') || _keys.has('ShiftRight');
    const ctrl = _keys.has('ControlLeft') || _keys.has('ControlRight');
    const sprint = isFlying ? ctrl : shift;
    const speed = (isFlying ? FLY_SPEED : SPEED) * (sprint ? SPRINT_MULT : 1) * delta;

    const dir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    if (_keys.has('KeyW')) dir.add(forward);
    if (_keys.has('KeyS')) dir.sub(forward);
    if (_keys.has('KeyD')) dir.add(right);
    if (_keys.has('KeyA')) dir.sub(right);
    if (isFlying && _keys.has('Space')) dir.y += 1;
    if (isFlying && shift) dir.y -= 1;

    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(speed);
      camera.position.add(dir);
    }

    if (!isFlying && camera.position.y !== 1.7) {
      camera.position.y = 1.7;
    }
  });

  return <PointerLockControls ref={controlsRef} camera={camera} domElement={gl.domElement} />;
}
