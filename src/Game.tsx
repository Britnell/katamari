import { Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useState, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  KeyboardControls,
  KeyboardControlsEntry,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Letter } from "./components/Letter";
import KatamariBall from "./Ball";

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
            <CollectibleObjects />
            <LetterObjects />
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
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

function CollectibleObject({
  position,
  width,
  height,
  depth,
  id,
  type,
  char,
  fontSize,
  color,
  bevelEnabled,
  bevelThickness,
  bevelSize,
  bevelSegments,
  curveSegments,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  id: number;
  type?: string;
  char?: string;
  fontSize?: number;
  color?: string;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
}) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);
  const objectVolume = useMemo(
    () => width * height * depth,
    [width, height, depth]
  );
  const maxDimension = useMemo(
    () => Math.max(width, height, depth),
    [width, height, depth]
  );

  const adjustedPosition = useMemo(() => {
    const yPos = -0.5 + height / 2;
    return [position[0], yPos, position[2]] as [number, number, number];
  }, [position, height]);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={adjustedPosition}
      colliders="cuboid"
      userData={{
        id,
        size: maxDimension,
        width,
        height,
        depth,
        volume: objectVolume,
        isCollectable: true,
        setCollected: setIsCollected,
        type,
        char,
        fontSize,
        color,
        bevelEnabled,
        bevelThickness,
        bevelSize,
        bevelSegments,
        curveSegments,
      }}
      sensor={isCollected}
    >
      {!isCollected && (
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      )}
    </RigidBody>
  );
}

function CollectibleObjects() {
  const count = 500;
  const area = 60;
  const maxSize = 0.8;

  const objects = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const position: [number, number, number] = [
        (Math.random() - 0.5) * area,
        0,
        (Math.random() - 0.5) * area,
      ];

      const width = Math.random() * maxSize + 0.2;
      const height = Math.random() * maxSize + 0.2;
      const depth = Math.random() * maxSize + 0.2;

      return { position, width, height, depth, id: i };
    });
  }, [count, area, maxSize]);

  return (
    <>
      {objects.map((props) => (
        <CollectibleObject key={props.id} {...props} />
      ))}
    </>
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

function LetterObjects() {
  const letters = "Katamari";
  const spacing = 1.2;

  return (
    <>
      {letters.split("").map((char, index) => (
        <Letter
          key={`letter-${index}`}
          char={char}
          position={[(index - letters.length / 2) * spacing, 0.5, -10]}
          fontSize={0.7}
          color="#FF5733"
          depth={0.1}
          id={1000 + index}
          bevelEnabled={true}
          bevelThickness={0.05}
          bevelSize={0.04}
          bevelSegments={4}
          curveSegments={12}
        />
      ))}
    </>
  );
}
