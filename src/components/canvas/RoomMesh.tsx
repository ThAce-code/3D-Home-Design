import { useMemo } from 'react';
import * as THREE from 'three';
import type { Room } from '../../types/room.js';
import { useStore } from '../../store/useStore.js';
import { subtractSegments, type WallOverlap } from '../../services/adjacency.js';

interface Props {
  room: Room;
  onFloorClick?: (point: [number, number, number]) => void;
}

type WallSegment = {
  key: string;
  pos: [number, number, number];
  size: [number, number, number];
};

export default function RoomMesh({ room, onFloorClick }: Props) {
  const { x, z, width, depth, height, transparentWalls } = room;
  const wallThickness = 0.1;
  const adjacency = useStore((s) => s.adjacencyMap[room.id]);

  const segments = useMemo(() => {
    const hw = width / 2;
    const hd = depth / 2;
    const result: WallSegment[] = [];

    // Helper: get visible segments for a wall direction
    const getVisible = (
      dir: 'north' | 'south' | 'east' | 'west',
      fullMin: number,
      fullMax: number,
    ): WallOverlap[] => {
      const overlaps = adjacency?.[dir] ?? [];
      return subtractSegments(fullMin, fullMax, overlaps);
    };

    // North wall (z = -hd): spans along X, local X range [-hw, hw]
    for (const seg of getVisible('north', -hw, hw)) {
      const segW = seg.max - seg.min;
      const segCenter = (seg.min + seg.max) / 2;
      result.push({
        key: 'north',
        pos: [segCenter, height / 2, -hd],
        size: [segW, height, wallThickness],
      });
    }

    // South wall (z = +hd): spans along X, local X range [-hw, hw]
    for (const seg of getVisible('south', -hw, hw)) {
      const segW = seg.max - seg.min;
      const segCenter = (seg.min + seg.max) / 2;
      result.push({
        key: 'south',
        pos: [segCenter, height / 2, hd],
        size: [segW, height, wallThickness],
      });
    }

    // East wall (x = +hw): spans along Z, local Z range [-hd, hd]
    for (const seg of getVisible('east', -hd, hd)) {
      const segD = seg.max - seg.min;
      const segCenter = (seg.min + seg.max) / 2;
      result.push({
        key: 'east',
        pos: [hw, height / 2, segCenter],
        size: [wallThickness, height, segD],
      });
    }

    // West wall (x = -hw): spans along Z, local Z range [-hd, hd]
    for (const seg of getVisible('west', -hd, hd)) {
      const segD = seg.max - seg.min;
      const segCenter = (seg.min + seg.max) / 2;
      result.push({
        key: 'west',
        pos: [-hw, height / 2, segCenter],
        size: [wallThickness, height, segD],
      });
    }

    // Ceiling (always full)
    result.push({
      key: 'ceiling',
      pos: [0, height, 0],
      size: [width, wallThickness, depth],
    });

    return result;
  }, [width, depth, height, adjacency]);

  const handleWallClick = (key: string, e: any) => {
    if (!e.altKey && !e.ctrlKey && !e.metaKey) return;
    e.stopPropagation();
    useStore.getState().updateRoom(room.id, {
      transparentWalls: { ...transparentWalls, [key]: !transparentWalls[key] },
    });
  };

  return (
    <group position={[x, 0, z]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        receiveShadow
        onPointerDown={(e) => {
          e.stopPropagation();
          const p = e.point;
          onFloorClick?.([p.x, p.y, p.z]);
        }}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {segments.map((seg, i) => {
        const isTransparent = !!transparentWalls[seg.key];
        return (
          <mesh
            key={`${seg.key}-${i}`}
            position={seg.pos}
            onPointerDown={(e) => handleWallClick(seg.key, e)}
          >
            <boxGeometry args={seg.size} />
            <meshStandardMaterial
              color="#ffffff"
              transparent
              opacity={isTransparent ? 0.08 : 0.95}
              side={THREE.DoubleSide}
              depthWrite={!isTransparent}
            />
          </mesh>
        );
      })}
    </group>
  );
}
