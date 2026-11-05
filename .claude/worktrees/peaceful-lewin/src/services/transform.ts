import * as THREE from 'three';

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];

export function applySnap(value: number, snapSize: number): number {
  if (snapSize === 0) return value;
  return Math.round(value / snapSize) * snapSize;
}

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

export function eulerToQuaternion(euler: Vec3): Quat {
  _euler.set(euler[0], euler[1], euler[2]);
  _quat.setFromEuler(_euler);
  return [_quat.x, _quat.y, _quat.z, _quat.w];
}
