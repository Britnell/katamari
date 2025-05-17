import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

export function Box({
  position,
  id,
  dim,
  color = "red",
  rotation = [0, 0, 0],
  quaternion,
}: {
  position: [number, number, number];
  dim: [number, number, number];
  id: string;
  color?: string;
  rotation?: [number, number, number];
  quaternion?: THREE.Quaternion;
}) {
  const [width, height, depth] = dim;
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
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      rotation={rotation}
      colliders="cuboid"
      userData={{
        type: "box",
        id,
        size: maxDimension,
        width,
        height,
        depth,
        volume: objectVolume,
        isCollectable: true,
        setCollected: setIsCollected,
        color,
        initialRotation: rotation,
      }}
      sensor={isCollected}
    >
      <group rotation={rotation} quaternion={quaternion}>
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
        </mesh>
      </group>
    </RigidBody>
  );
}
