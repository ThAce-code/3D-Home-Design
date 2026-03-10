import { useRef, useMemo } from 'react';
import { useGLTF, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore.js';
import type { FurnitureItem } from '../../types/furniture.js';

interface Props {
  item: FurnitureItem;
}

export default function FurnitureModel({ item }: Props) {
  const assets = useStore((s) => s.assets);
  const asset = assets.find((a) => a.id === item.assetId);

  if (!asset?.modelUrl) return null;

  return <FurnitureModelInner item={item} url={asset.modelUrl} />;
}

function FurnitureModelInner({ item, url }: { item: FurnitureItem; url: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const selectItem = useStore((s) => s.selectItem);
  const updateItem = useStore((s) => s.updateItem);
  const transformTool = useStore((s) => s.transformTool);

  const { scene: gltfScene } = useGLTF(url);
  const cloned = useMemo(() => gltfScene.clone(true), [gltfScene]);

  const isSelected = selectedItemId === item.id;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (e.button === 0) {
      selectItem(item.id);
    }
    // right-click deselect handled globally in useGlobalHotkeys
  };

  const handleTransformChange = () => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const quat = groupRef.current.quaternion;
    const scl = groupRef.current.scale;
    updateItem(item.id, {
      position: [pos.x, pos.y, pos.z],
      quaternion: [quat.x, quat.y, quat.z, quat.w],
      scale: [scl.x, scl.y, scl.z],
    });
  };

  return (
    <>
      <group
        ref={groupRef}
        position={item.position}
        quaternion={new THREE.Quaternion(...item.quaternion)}
        scale={item.scale}
        onPointerDown={handlePointerDown}
      >
        <primitive object={cloned} />
      </group>
      {isSelected && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformTool}
          onMouseUp={handleTransformChange}
        />
      )}
    </>
  );
}
