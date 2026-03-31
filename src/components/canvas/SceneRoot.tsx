import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import type { ReactNode } from 'react';
import ArchitectureScene from './ArchitectureScene.js';
import SceneDebugBridge from './SceneDebugBridge.js';
import { editorTheme } from '../../theme/editorTheme.js';

interface Props {
  children: ReactNode;
  showArchitectureScene?: boolean;
}

export default function SceneRoot({ children, showArchitectureScene = false }: Props) {
  return (
    <Canvas data-testid="scene-canvas" camera={{ position: [0, 1.7, 5], fov: 60 }} shadows>
      <color attach="background" args={[editorTheme.background]} />
      <ambientLight intensity={1.05} />
      <hemisphereLight args={['#fff6ea', '#ceb18b', 0.85]} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.25}
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
        sectionColor={editorTheme.gridMajor}
        cellColor={editorTheme.gridMinor}
        position={[0, -0.01, 0]}
      />
      <SceneDebugBridge />
      {showArchitectureScene ? <ArchitectureScene /> : null}
      {children}
    </Canvas>
  );
}
