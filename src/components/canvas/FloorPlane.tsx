import { useStore } from '../../store/useStore.js';

interface Props {
  onFloorClick?: (point: [number, number, number]) => void;
}

export default function FloorPlane({ onFloorClick }: Props) {
  const selectItem = useStore((s) => s.selectItem);

  return (
    <mesh
      name="floor-plane"
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.02, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        const p = e.point;
        onFloorClick?.([p.x, p.y, p.z]);
      }}
      onPointerDown={(e) => {
        if (e.button === 2) {
          e.stopPropagation();
          selectItem(null);
        }
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#1a1a1a" transparent opacity={0} />
    </mesh>
  );
}
