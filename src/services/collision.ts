type Vec3 = [number, number, number];
interface BBox { min: Vec3; max: Vec3 }
interface RoomBounds { x: number; z: number; width: number; depth: number; height: number }

export function checkAABBOverlap(a: BBox, b: BBox): boolean {
  return (
    a.min[0] < b.max[0] && a.max[0] > b.min[0] &&
    a.min[1] < b.max[1] && a.max[1] > b.min[1] &&
    a.min[2] < b.max[2] && a.max[2] > b.min[2]
  );
}

export function clampToRoom(position: Vec3, itemSize: Vec3, room: RoomBounds): Vec3 {
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  const halfIW = itemSize[0] / 2;
  const halfID = itemSize[2] / 2;
  return [
    Math.max(room.x - halfW + halfIW, Math.min(room.x + halfW - halfIW, position[0])),
    position[1],
    Math.max(room.z - halfD + halfID, Math.min(room.z + halfD - halfID, position[2])),
  ];
}
