import { Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useState, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  KeyboardControls,
  KeyboardControlsEntry,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Word } from "./components/Letter";
import KatamariBall from "./Ball";
import { CollectibleObjects } from "./Squares";

export default function Game() {
  const map = useKeyboardMap();

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <KeyboardControls map={map}>
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={75} />
          <OrbitControls />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={1024}
          />

          <Physics interpolate={true} timeStep={1 / 60}>
            <KatamariBall />
            <Ground />
            {/* <CollectibleObjects /> */}
            <Intro />
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

function Intro() {
  return (
    <>
      <Word
        text="Katamari"
        position={[-2, 0, 2]}
        fontSize={0.7}
        color="#FF5733"
        spacing={0.1}
        wordId={1000}
        directionAngle={0} // No rotation
      />

      <Word
        text="Game"
        position={[-1, 0, 3]}
        fontSize={0.7}
        color="#33FF57"
        spacing={0.1}
        wordId={1500}
        directionAngle={Math.PI / 6} // 30 degrees rotation around X axis
      />

      <Word
        text="3D"
        position={[2, 0, 2]}
        fontSize={0.7}
        color="#3357FF"
        spacing={0.1}
        wordId={2500}
        directionAngle={-Math.PI / 6} // -30 degrees rotation around X axis
      />

      <Word
        text="Letters"
        position={[0, 0, 4]}
        fontSize={0.7}
        color="#FF33A8"
        spacing={0.1}
        wordId={3500}
        directionAngle={Math.PI / 4} // 45 degrees rotation around X axis
      />
    </>
  );
}

export type UserData = {
  isCollectable: boolean;
  volume: number;
  size: number;
  width: number;
  height: number;
  depth: number;
  id: number;
  setCollected: (x: boolean) => void;
  type?: string;
  char?: string;
  fontSize?: number;
  color?: string;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
};

function Ground() {
  return (
    <RigidBody type="fixed" name="ground" friction={0.9} restitution={0.0}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="lightblue" />
      </mesh>
    </RigidBody>
  );
}

enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}
const useKeyboardMap = () =>
  useMemo<KeyboardControlsEntry<Controls>[]>(
    () => [
      { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
      { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
      { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
      { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
    ],
    []
  );
