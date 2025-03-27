import { Physics, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  KeyboardControls,
  KeyboardControlsEntry,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Word } from "./components/Letter";
import KatamariBall from "./Ball";
// import { CollectibleObjects } from "./Squares";

export default function Game() {
  const map = useKeyboardMap();

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <KeyboardControls map={map}>
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 2, -4]} fov={55} />
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
            <Words />
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

function Words() {
  return (
    <>
      <Word
        text="hey"
        position={[0, 0, 3]}
        fontSize={0.7}
        id="intro1"
        directionAngle={0}
      />
      <Word
        text="Im Tommy"
        position={[0, 0, 7]}
        fontSize={1.2}
        id="intro2"
        directionAngle={0}
      />
      <Word
        text="html"
        position={[4, 0, 1]}
        fontSize={0.8}
        id="intro11"
        directionAngle={Math.PI * 1}
      />
      <Word
        text="CSS"
        position={[4, 0, -1.5]}
        fontSize={0.8}
        id="intro12"
        directionAngle={Math.PI * 1}
      />

      {/* ---------------- */}
      <Word
        text="javascript"
        position={[-3.3, 0, 0]}
        fontSize={1.1}
        depth={0.9}
        id="intro14"
        directionAngle={Math.PI * -0.5}
      />
      <Word
        text="vanilla"
        position={[0, 0, -4]}
        fontSize={1.2}
        id="intro15"
        directionAngle={Math.PI * -1}
      />
      <Word
        text="typescript"
        position={[2, 0, -15]}
        fontSize={1.9}
        depth={0.8}
        id="intro16"
        directionAngle={Math.PI * -1}
      />

      <Word
        text="React"
        position={[4, 0, -8]}
        fontSize={1.3}
        id="intro17"
        directionAngle={Math.PI * -1.2}
      />

      <Word
        text="UI UX"
        position={[9, 0, -10]}
        fontSize={1.9}
        id="intro22"
        directionAngle={Math.PI * 0.5}
      />

      <Word
        text="Vue"
        id="intro18"
        position={[-4, 0, -8]}
        fontSize={1.3}
        depth={1.3}
        directionAngle={Math.PI * -1.0}
      />

      <Word
        text="SQL"
        position={[-13, 0, -6]}
        fontSize={3.0}
        depth={1.2}
        id="intro21"
        directionAngle={Math.PI * -0.5}
      />

      {/* ---------------- */}

      <Word
        text="Web Developer"
        position={[0, 0, 20]}
        fontSize={2.3}
        depth={1.1}
        id="intro5"
        directionAngle={0}
      />
      <Word
        text="Creative"
        position={[8, 0, 2]}
        fontSize={2.0}
        id="intro7"
        directionAngle={Math.PI * 0.5}
      />
      <Word
        text="Technologist"
        position={[16, 0, 12]}
        fontSize={3.2}
        id="intro8"
        directionAngle={Math.PI * 0.5}
      />
      <Word
        text="frontend"
        position={[-6, 0, 6]}
        fontSize={1.3}
        id="intro9"
        directionAngle={Math.PI * -0.5}
      />
      <Word
        text="fullstack"
        position={[-7, 0, -3]}
        fontSize={2.0}
        id="intro10"
        directionAngle={Math.PI * -0.5}
      />

      <Word
        text="node"
        position={[-11, 0, 5]}
        fontSize={1.9}
        depth={1.2}
        id="intro19"
        directionAngle={Math.PI * 0}
      />

      <Word
        text="next"
        position={[-9, 0, -12]}
        fontSize={2.8}
        depth={1.0}
        id="intro19"
        directionAngle={Math.PI * -1.0}
      />

      {/* ---------------- */}

      {/*
      <Word
        text="sass"
        position={[7, 0, -7]}
        fontSize={1.2}
        id="intro13"
        directionAngle={(Math.PI * 3) / 4}
      />
      */}
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
  id: string;
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
