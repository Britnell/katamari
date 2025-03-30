import { Physics, RigidBody } from "@react-three/rapier";
import { Canvas } from "@react-three/fiber";
import {
  KeyboardControls,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import { Word } from "./components/Letter";
import KatamariBall from "./Ball";
import { ModelObject } from "./components/ModelObject";

export default function Game() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          gl={{
            antialias: true,
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.shadowMap.autoUpdate = true;
          }}
        >
          <PerspectiveCamera makeDefault position={[0, 2, -4]} fov={55} />
          <OrbitControls />
          <ambientLight intensity={0.6} color="#f0f8ff" />
          <directionalLight
            position={[10, 15, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
            shadow-camera-near={0.1}
            shadow-camera-far={100}
            shadow-bias={-0.00001}
            shadow-normalBias={0.01}
            shadow-radius={3}
          />
          <hemisphereLight
            intensity={0.4}
            color="#87ceeb"
            groundColor="#8a5a44"
          />
          <Physics interpolate={true} timeStep={1 / 60}>
            <KatamariBall />
            <Ground />
            {/* <CollectibleObjects /> */}
            <Words />
            <ModelObject
              modelPath="/3d/gameboy/scene.gltf"
              position={[6, -1, 8]}
              scale={0.6}
              rotation={[0, pi * -0.3, 0]}
              id="gameboy"
            />
            <ModelObject
              modelPath="/3d/diskette/scene.gltf"
              position={[4, 0, 5]}
              scale={0.8}
              rotation={[pi * -0.5, pi * 0, 0]}
              id="diskette"
            />
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
        wordAngle={0}
      />
      <Word
        text="Im Tommy"
        position={[0, 0, 7]}
        fontSize={1.3}
        id="intro2"
        wordAngle={0}
      />
      <Word
        text="html"
        position={[4, 0, 1]}
        fontSize={0.8}
        id="intro11"
        wordAngle={Math.PI * 1}
      />
      <Word
        text="CSS"
        position={[4, 0, -1.5]}
        fontSize={0.8}
        id="intro12"
        wordAngle={Math.PI * 1}
      />

      {/* ---------------- */}
      <Word
        text="javascript"
        position={[-3.3, 0, 0]}
        fontSize={1.0}
        depth={0.9}
        id="intro14"
        wordAngle={Math.PI * -0.5}
      />
      {/* <Word
        text="vanilla"
        position={[0, 0, -4]}
        fontSize={1.2}
        id="intro15"
        wordAngle={Math.PI * -1}
      /> */}

      <Word
        text="node"
        position={[0, 0, -4]}
        fontSize={1.6}
        depth={1}
        id="intro19"
        wordAngle={Math.PI * -1}
      />

      <Word
        text="typescript"
        position={[2, 0, -15]}
        fontSize={1.6}
        depth={0.8}
        id="intro16"
        wordAngle={Math.PI * -1}
      />

      <Word
        text="React"
        position={[4, 0, -8]}
        fontSize={1.2}
        depth={0.9}
        id="intro17"
        wordAngle={Math.PI * -1.2}
      />

      <Word
        text="UI UX"
        position={[9, 0, -10]}
        fontSize={2.9}
        id="intro22"
        wordAngle={Math.PI * 0.5}
      />

      <Word
        text="Vue"
        id="intro18"
        position={[-1, 0, -7]}
        fontSize={1.6}
        depth={1}
        wordAngle={Math.PI * -1.0}
      />

      <Word
        text="SQL"
        position={[-13, 0, -6]}
        fontSize={3.0}
        depth={1.2}
        id="intro21"
        wordAngle={Math.PI * -0.5}
      />

      {/* ---------------- */}

      <Word
        text="Web Developer"
        position={[0, 0, 20]}
        fontSize={2.3}
        depth={1.1}
        id="intro5"
        wordAngle={0}
      />
      <Word
        text="Creative"
        position={[8, 0, 2]}
        fontSize={2.0}
        id="intro7"
        wordAngle={Math.PI * 0.5}
      />
      <Word
        text="Technologist"
        position={[16, 0, 12]}
        fontSize={3.2}
        id="intro8"
        wordAngle={Math.PI * 0.5}
      />
      <Word
        text="frontend"
        position={[-6, 0, 6]}
        fontSize={1.3}
        depth={0.9}
        id="intro9"
        wordAngle={Math.PI * -0.5}
      />
      <Word
        text="fullstack"
        position={[-7, 0, -3]}
        fontSize={2.0}
        id="intro10"
        depth={0.9}
        wordAngle={Math.PI * -0.5}
      />

      <Word
        text="next"
        position={[-4, 0, -11]}
        fontSize={1.3}
        depth={1.0}
        id="intro20"
        wordAngle={Math.PI * -1.0}
      />

      <Word
        text="ally"
        position={[-8, 0, -13]}
        fontSize={1.3}
        id="intro23"
        wordAngle={Math.PI * -0.75}
      />

      {/* ---------------- */}
    </>
  );
}

function Ground() {
  return (
    <RigidBody type="fixed" name="ground" friction={0.9} restitution={0.0}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#a3d9ff"
          roughness={0.8}
          metalness={0.1}
          envMapIntensity={0.5}
        />
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
const keyboardMap = [
  { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
  { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
];

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
  initialRotation?: [number, number, number];
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
  modelPath?: string;
  scale?: number;
  rotation?: [number, number, number];
};

export const pi = Math.PI;

export type CollectibleObject = {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  geometry: [number, number, number];
  type: string;
  // Letter-specific properties
  char?: string;
  fontSize?: number;
  color?: string;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
  // Model-specific properties
  modelPath?: string;
  scale?: number;
};
