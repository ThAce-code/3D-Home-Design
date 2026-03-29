import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import type { ReactNode } from 'react';
import ArchitectureScene from './ArchitectureScene.js';
import SceneDebugBridge from './SceneDebugBridge.js';

interface Props {
  children: ReactNode;
  showArchitectureScene?: boolean;
}

export default function SceneRoot({ children, showArchitectureScene = false }: Props) {
  return (
    <Canvas data-testid="scene-canvas" camera={{ position: [0, 1.7, 5], fov: 60 }} shadows>
      <color attach="background" args={['#111111']} />
      <ambientLight intensity={1.2} />
      <hemisphereLight args={['#b1e1ff', '#b97a20', 0.8]} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Grid
        infiniteGrid
        fadeDistance={50}
        cellSize={0.1}
        sectionSize={1}
        sectionColor="#1a3a2e"
        cellColor="#0f1f1a"
        position={[0, -0.01, 0]}
      />
      <SceneDebugBridge />
      {showArchitectureScene ? <ArchitectureScene /> : null}
      {children}
    </Canvas>
  );
}
