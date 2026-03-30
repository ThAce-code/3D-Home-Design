import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../domain/document';
import { applyDrawWall } from '../../topology/repair';
import { rebuildZones } from '../../topology/zones';
import { buildZoneMeshDescriptors } from '../zoneMeshes';

function createRectangleDocument(): ArchitectureDocument {
  const document = createEmptyArchitectureDocument();
  const levelId = document.levelOrder[0];
  const level = document.levels[levelId];

  document.vertices = {
    v1: { id: 'v1', x: 0, y: 0 },
    v2: { id: 'v2', x: 4, y: 0 },
    v3: { id: 'v3', x: 4, y: 3 },
    v4: { id: 'v4', x: 0, y: 3 },
  };
  document.walls = {
    w1: {
      id: 'w1',
      levelId,
      startVertexId: 'v1',
      endVertexId: 'v2',
      thickness: level.defaultWallThickness,
      height: level.defaultWallHeight,
      kind: 'structural',
    },
    w2: {
      id: 'w2',
      levelId,
      startVertexId: 'v2',
      endVertexId: 'v3',
      thickness: level.defaultWallThickness,
      height: level.defaultWallHeight,
      kind: 'structural',
    },
    w3: {
      id: 'w3',
      levelId,
      startVertexId: 'v3',
      endVertexId: 'v4',
      thickness: level.defaultWallThickness,
      height: level.defaultWallHeight,
      kind: 'structural',
    },
    w4: {
      id: 'w4',
      levelId,
      startVertexId: 'v4',
      endVertexId: 'v1',
      thickness: level.defaultWallThickness,
      height: level.defaultWallHeight,
      kind: 'structural',
    },
  };
  document.wallOrder = ['w1', 'w2', 'w3', 'w4'];
  document.levels[levelId] = {
    ...level,
    vertexIds: ['v1', 'v2', 'v3', 'v4'],
    wallIds: ['w1', 'w2', 'w3', 'w4'],
    zoneIds: [],
  };

  return rebuildZones(document);
}

function createMeshFromDescriptor(descriptor: ReturnType<typeof buildZoneMeshDescriptors>[number]) {
  const shape = new THREE.Shape();
  const [firstPoint, ...restPoints] = descriptor.shapePoints;

  if (!firstPoint) {
    throw new Error('missing shape points');
  }

  shape.moveTo(firstPoint[0], firstPoint[1]);
  for (const point of restPoints) {
    shape.lineTo(point[0], point[1]);
  }
  shape.closePath();

  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  );
  mesh.rotation.set(...descriptor.rotation);
  mesh.position.set(...descriptor.position);
  mesh.updateMatrixWorld(true);

  return mesh;
}

describe('buildZoneMeshDescriptors', () => {
  it('keeps the zone raycastable inside the same positive-z floor region as the source loop', () => {
    const document = createRectangleDocument();
    const descriptor = buildZoneMeshDescriptors(document)[0];

    if (!descriptor) {
      throw new Error('missing zone mesh descriptor');
    }

    const mesh = createMeshFromDescriptor(descriptor);
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(2, 10, 1.5),
      new THREE.Vector3(0, -1, 0)
    );
    const hits = raycaster.intersectObject(mesh, false);

    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.point.z).toBeCloseTo(1.5, 5);
  });

  it('keeps the surrounding zone raycastable when an inner rectangle is bridged to the outer boundary', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [10, 0]);
    document = applyDrawWall(document, [10, 0], [10, 10]);
    document = applyDrawWall(document, [10, 10], [0, 10]);
    document = applyDrawWall(document, [0, 10], [0, 0]);
    document = applyDrawWall(document, [3, 3], [7, 3]);
    document = applyDrawWall(document, [7, 3], [7, 7]);
    document = applyDrawWall(document, [7, 7], [3, 7]);
    document = applyDrawWall(document, [3, 7], [3, 3]);
    document = applyDrawWall(document, [5, 10], [5, 7]);

    const descriptors = buildZoneMeshDescriptors(document);
    const meshes = descriptors.map((descriptor) => createMeshFromDescriptor(descriptor));
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(1, 10, 1),
      new THREE.Vector3(0, -1, 0)
    );
    const hits = raycaster.intersectObjects(meshes, false);

    expect(descriptors).toHaveLength(2);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.point.x).toBeCloseTo(1, 5);
    expect(hits[0]?.point.z).toBeCloseTo(1, 5);
  });
});
