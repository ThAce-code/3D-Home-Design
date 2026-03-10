import * as THREE from 'three';

interface BBoxData {
  size: [number, number, number];
  min: [number, number, number];
}

export function computeBBox(object: THREE.Object3D): BBoxData {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  return {
    size: [size.x, size.y, size.z],
    min: [box.min.x, box.min.y, box.min.z],
  };
}

export function autoScale(bbox: BBoxData, targetMaxDim = 1.5): number {
  const maxDim = Math.max(...bbox.size);
  if (maxDim > 5 || maxDim < 0.1) {
    return targetMaxDim / maxDim;
  }
  return 1;
}
