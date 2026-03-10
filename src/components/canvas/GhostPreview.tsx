import { useRef, useMemo, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore.js';
import { autoScale, computeBBox } from '../../services/asset.js';

const MAX_DISTANCE = 8;
const _center = new THREE.Vector2(0, 0);
const _raycaster = new THREE.Raycaster();
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();

function GhostModel({
  url,
  meta,
}: {
  url: string;
  meta?: { autoScale: number; bboxMin: [number, number, number] };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { scene: gltfScene } = useGLTF(url);
  const cloned = useMemo(() => gltfScene.clone(true), [gltfScene]);

  const { scale, yOffset } = useMemo(() => {
    if (meta) {
      const s = meta.autoScale;
      const yOff = -meta.bboxMin[1] * s;
      return { scale: s, yOffset: yOff };
    }
    const bbox = computeBBox(cloned);
    const s = autoScale(bbox);
    const yOff = -bbox.min[1] * s;
    return { scale: s, yOffset: yOff };
  }, [cloned, meta]);

  useEffect(() => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = (mesh.material as THREE.Material).clone();
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.transparent = true;
          mat.opacity = 0.4;
          mat.depthWrite = false;
        }
        mesh.material = mat;
      }
    });
  }, [cloned]);

  useFrame(() => {
    if (!groupRef.current) return;
    const locked = useStore.getState().pointerLocked;
    if (!locked) {
      groupRef.current.visible = false;
      return;
    }

    _raycaster.setFromCamera(_center, camera);
    const intersects = _raycaster.ray.intersectPlane(_floorPlane, _hit);

    if (intersects) {
      const dist = camera.position.distanceTo(_hit);
      if (dist > MAX_DISTANCE) {
        groupRef.current.visible = false;
        return;
      }
      groupRef.current.position.set(_hit.x, yOffset, _hit.z);
      groupRef.current.visible = true;
    } else {
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false} scale={[scale, scale, scale]}>
      <primitive object={cloned} />
    </group>
  );
}

export default function GhostPreview() {
  const selectedAssetId = useStore((s) => s.selectedAssetId);
  const assets = useStore((s) => s.assets);
  const pointerLocked = useStore((s) => s.pointerLocked);

  if (!pointerLocked || !selectedAssetId) return null;
  const asset = assets.find((a) => a.id === selectedAssetId);
  if (!asset) return null;

  const metaScale = autoScale({ size: asset.bboxSize, min: asset.bboxMin });

  return (
    <Suspense fallback={null}>
      <GhostModel url={asset.modelUrl} meta={{ autoScale: metaScale, bboxMin: asset.bboxMin }} />
    </Suspense>
  );
}
