import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const _center = new THREE.Vector2(0, 0);
const _raycaster = new THREE.Raycaster();
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _intersection = new THREE.Vector3();

export function useFloorRaycast() {
  const { camera } = useThree();
  const point = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    _raycaster.setFromCamera(_center, camera);
    const hit = _raycaster.ray.intersectPlane(_floorPlane, _intersection);
    point.current = hit ? _intersection.clone() : null;
  });

  return point;
}
