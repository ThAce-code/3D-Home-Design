import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useArchitectureDocumentStore,
  type ArchitectureDocumentState,
} from '../../store/architectureDocumentStore.js';
import {
  useArchitectureEditorStore,
  type ArchitectureEditorState,
} from '../../store/architectureEditorStore.js';
import { useStore, type AppState } from '../../store/useStore.js';

interface DebugHit {
  distance: number;
  objectName: string;
  objectType: string;
  materialSide: number | null;
  materialTransparent: boolean | null;
  materialOpacity: number | null;
  point: [number, number, number];
}

interface DebugObjectSummary {
  name: string;
  type: string;
  visible: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  materialSide: number | null;
  materialTransparent: boolean | null;
  materialOpacity: number | null;
  localBounds: {
    min: [number, number, number];
    max: [number, number, number];
  } | null;
  worldBounds: {
    min: [number, number, number];
    max: [number, number, number];
  } | null;
}

interface ArchitectureDebugBridge {
  getDocument: () => ArchitectureDocumentState;
  replaceDocument: ArchitectureDocumentState['replaceDocument'];
  resetDocument: ArchitectureDocumentState['resetDocument'];
  getEditorState: () => ArchitectureEditorState;
  setActiveTool: ArchitectureEditorState['setActiveTool'];
  setSelection: ArchitectureEditorState['setSelection'];
  getUiState: () => AppState;
  markHasEnteredOnce: () => void;
  setPointerLocked: (value: boolean) => void;
  setAltUnlocked: (value: boolean) => void;
  getCamera: () => {
    position: [number, number, number];
    direction: [number, number, number];
  };
  getObjectSummary: (name: string) => DebugObjectSummary | null;
  listObjectsByPrefix: (prefix: string) => DebugObjectSummary[];
  setCameraPose: (position: [number, number, number], target: [number, number, number]) => void;
  projectWorldPoint: (point: [number, number, number]) => { clientX: number; clientY: number };
  raycastAtClient: (clientX: number, clientY: number) => DebugHit[];
}

declare global {
  interface Window {
    __architectureDebug?: ArchitectureDebugBridge;
  }
}

function describeIntersection(intersection: THREE.Intersection<THREE.Object3D>): DebugHit {
  const object = intersection.object as THREE.Object3D & {
    material?: THREE.Material | THREE.Material[];
  };
  const material = Array.isArray(object.material) ? object.material[0] : object.material;

  return {
    distance: intersection.distance,
    objectName: object.name || object.type,
    objectType: object.type,
    materialSide: material?.side ?? null,
    materialTransparent: material?.transparent ?? null,
    materialOpacity: material?.opacity ?? null,
    point: [intersection.point.x, intersection.point.y, intersection.point.z],
  };
}

function toDebugBounds(box: THREE.Box3): DebugObjectSummary['worldBounds'] {
  return {
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  };
}

function describeObject(object: THREE.Object3D): DebugObjectSummary {
  const mesh = object as THREE.Object3D & {
    material?: THREE.Material | THREE.Material[];
    geometry?: THREE.BufferGeometry;
  };
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const localGeometry = mesh.geometry?.clone() ?? null;
  const worldBox = new THREE.Box3().setFromObject(object);

  if (localGeometry && !localGeometry.boundingBox) {
    localGeometry.computeBoundingBox();
  }

  return {
    name: object.name || object.type,
    type: object.type,
    visible: object.visible,
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    materialSide: material?.side ?? null,
    materialTransparent: material?.transparent ?? null,
    materialOpacity: material?.opacity ?? null,
    localBounds: localGeometry?.boundingBox ? toDebugBounds(localGeometry.boundingBox) : null,
    worldBounds: Number.isFinite(worldBox.min.x) ? toDebugBounds(worldBox) : null,
  };
}

export default function SceneDebugBridge() {
  const { camera, gl, scene, invalidate } = useThree();

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return undefined;
    }

    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3();
    const normalizedPointer = new THREE.Vector2();
    const projectedPoint = new THREE.Vector3();

    const getCamera = () => {
      camera.getWorldDirection(direction);

      return {
        position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
        direction: [direction.x, direction.y, direction.z] as [number, number, number],
      };
    };

    const setCameraPose = (position: [number, number, number], target: [number, number, number]) => {
      camera.position.set(...position);
      camera.lookAt(...target);
      camera.updateMatrixWorld(true);
      invalidate();
    };

    const projectWorldPoint = (point: [number, number, number]) => {
      const rect = gl.domElement.getBoundingClientRect();
      projectedPoint.set(...point).project(camera);

      return {
        clientX: rect.left + ((projectedPoint.x + 1) / 2) * rect.width,
        clientY: rect.top + ((1 - projectedPoint.y) / 2) * rect.height,
      };
    };

    const raycastAtClient = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      normalizedPointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -(((clientY - rect.top) / rect.height) * 2 - 1)
      );
      raycaster.setFromCamera(normalizedPointer, camera);

      return raycaster.intersectObjects(scene.children, true).map(describeIntersection);
    };

    const getObjectSummary = (name: string) => {
      const object = scene.getObjectByName(name);
      return object ? describeObject(object) : null;
    };

    const listObjectsByPrefix = (prefix: string) => {
      const matches: DebugObjectSummary[] = [];

      scene.traverse((object) => {
        if (!object.name.startsWith(prefix)) {
          return;
        }

        matches.push(describeObject(object));
      });

      return matches;
    };

    window.__architectureDebug = {
      getDocument: useArchitectureDocumentStore.getState,
      replaceDocument: useArchitectureDocumentStore.getState().replaceDocument,
      resetDocument: useArchitectureDocumentStore.getState().resetDocument,
      getEditorState: useArchitectureEditorStore.getState,
      setActiveTool: useArchitectureEditorStore.getState().setActiveTool,
      setSelection: useArchitectureEditorStore.getState().setSelection,
      getUiState: useStore.getState,
      markHasEnteredOnce: () => useStore.getState().setHasEnteredOnce(),
      setPointerLocked: (value) => useStore.getState().setPointerLocked(value),
      setAltUnlocked: (value) => useStore.getState().setAltUnlocked(value),
      getCamera,
      getObjectSummary,
      listObjectsByPrefix,
      setCameraPose,
      projectWorldPoint,
      raycastAtClient,
    };

    return () => {
      delete window.__architectureDebug;
    };
  }, [camera, gl, invalidate, scene]);

  return null;
}
