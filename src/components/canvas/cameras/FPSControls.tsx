import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { enterSceneNavigation } from '../../../services/navigation.js';
import { useStore } from '../../../store/useStore.js';
import * as THREE from 'three';

const SPEED = 5;
const SPRINT_MULT = 2;
const FLY_SPEED = 8;

const _keys = new Set<string>();

export default function FPSControls() {
  const altRef = useRef(false);
  const { camera, gl, setEvents } = useThree();
  const controls = useMemo(() => new PointerLockControls(camera), [camera]);
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
    void enterSceneNavigation();
  }, []);

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
    controls.connect(gl.domElement);
    // Native lock state is authoritative, including a lock acquired while
    // the controls' own effect subscriptions are still being installed.
    const syncPointerLock = () => {
      const locked = document.pointerLockElement === gl.domElement;
      controls.isLocked = locked;
      const state = useStore.getState();
      state.setPointerLocked(locked);
      if (locked) {
        state.setHasEnteredOnce();
      } else {
        if (!altRef.current) state.setAltUnlocked(false);
        _keys.clear();
      }
    };
    document.addEventListener('pointerlockchange', syncPointerLock);
    syncPointerLock();
    return () => {
      document.removeEventListener('pointerlockchange', syncPointerLock);
      controls.disconnect();
    };
  }, [controls, gl]);

  useEffect(() => {
    // Editing uses the actual cursor; FPS navigation uses the crosshair.
    setEvents({
      compute(event, state) {
        const rect = gl.domElement.getBoundingClientRect();
        state.pointer.set(
          pointerLocked ? 0 : ((event.clientX - rect.left) / rect.width) * 2 - 1,
          pointerLocked ? 0 : -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        state.raycaster.setFromCamera(state.pointer, state.camera);
      },
    });
  }, [gl, pointerLocked, setEvents]);

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

  return null;
}
