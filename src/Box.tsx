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
  id?: string;
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
        id: `box-${position.join("-")}-${id ?? "."}`,
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
      {!isCollected && (
        <BoxShape
          width={width}
          height={height}
          depth={depth}
          color={color}
          rotation={rotation}
          quaternion={quaternion}
        />
      )}
    </RigidBody>
  );
}

interface BoxShapeProps {
  width: number;
  height: number;
  depth: number;
  color?: string;
  rotation?: [number, number, number];
  quaternion?: THREE.Quaternion;
}

export function BoxShape({
  width,
  height,
  depth,
  color = "red",
  rotation = [0, 0, 0],
  quaternion,
}: BoxShapeProps) {
  return (
    <group rotation={rotation} quaternion={quaternion}>
      <mesh castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  );
}

interface CheckeredProps {
  thickness: number;
  position?: [number, number, number];
  gridSize: number;
  matrix: [number, number];
  color?: string;
}

const Checkered: React.FC<CheckeredProps> = ({
  thickness,
  position = [0, 0, 0],
  gridSize,
  matrix,
  color = "#124",
}) => {
  const [cols, rows] = matrix;
  const tiles = [];
  for (let x = 0; x < cols; x++) {
    for (let z = 0; z < rows; z++) {
      if ((x + z) % 2 === 0) {
        tiles.push(
          <Box
            key={`${x},${z}`}
            position={[x * gridSize, 0, z * gridSize]}
            dim={[gridSize, thickness, gridSize]}
            color={color}
          />
        );
      }
    }
  }
  return <group position={position}>{tiles}</group>;
};

export default Checkered;
