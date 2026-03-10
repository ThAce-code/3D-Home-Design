import { useRef, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from '../../store/useStore.js';
import * as THREE from 'three';

const GRID_SIZE = 200;
const CELL = 0.01;

function snapToGrid(v: number): number {
  return Math.round(v * 100) / 100;
}

export default function BuildGrid() {
  const activeTab = useStore((s) => s.activeTab);
  const pointerLocked = useStore((s) => s.pointerLocked);
  const addRoom = useStore((s) => s.addRoom);
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const [currentEnd, setCurrentEnd] = useState<[number, number] | null>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const { camera, raycaster } = useThree();

  // In FPS mode, raycast from screen center to get floor hit
  const getFloorHit = useCallback((): [number, number] | null => {
    if (!planeRef.current) return null;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObject(planeRef.current);
    if (hits.length === 0) return null;
    const p = hits[0].point;
    return [snapToGrid(p.x), snapToGrid(p.z)];
  }, [camera, raycaster]);

  // Update crosshair target every frame during drag
  useFrame(() => {
    if (!dragStart || !pointerLocked) return;
    const hit = getFloorHit();
    if (hit) setCurrentEnd(hit);
  });

  if (activeTab !== 'rooms') return null;

  const handleClick = (e: any) => {
    if (!pointerLocked) return;
    e.stopPropagation();

    if (!dragStart) {
      // First click: start drag
      const hit = getFloorHit();
      if (hit) {
        setDragStart(hit);
        setCurrentEnd(hit);
      }
    } else {
      // Second click: finish room
      const hit = getFloorHit();
      const end = hit || currentEnd;
      if (end) {
        const w = Math.abs(end[0] - dragStart[0]);
        const d = Math.abs(end[1] - dragStart[1]);
        if (w >= 1 && d >= 1) {
          const cx = (dragStart[0] + end[0]) / 2;
          const cz = (dragStart[1] + end[1]) / 2;
          addRoom({ width: w, depth: d, height: 3, x: cx, z: cz });
        }
      }
      setDragStart(null);
      setCurrentEnd(null);
    }
  };

  // Right-click cancels drag
  const handleRightClick = (e: any) => {
    if (dragStart) {
      e.stopPropagation();
      setDragStart(null);
      setCurrentEnd(null);
    }
  };

  let preview = null;
  if (dragStart && currentEnd) {
    const w = Math.abs(currentEnd[0] - dragStart[0]);
    const d = Math.abs(currentEnd[1] - dragStart[1]);
    const cx = (dragStart[0] + currentEnd[0]) / 2;
    const cz = (dragStart[1] + currentEnd[1]) / 2;
    if (w > 0 || d > 0) {
      preview = (
        <mesh position={[cx, 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[Math.max(w, 0.1), Math.max(d, 0.1)]} />
          <meshBasicMaterial color="#28A375" transparent opacity={0.3} />
        </mesh>
      );
    }
  }

  return (
    <>
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {preview}
    </>
  );
}
