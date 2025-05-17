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
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[position[0], position[1] - dim[1] / 2, position[2]]}
      rotation={rotation}
      colliders="cuboid"
      userData={{
        type: "box",
        id: `box-${position.join("-")}-${id ?? "."}`,
        dim: dim,
        isCollectable: true,
        setCollected: setIsCollected,
        color,
        initialRotation: rotation,
      }}
      sensor={isCollected}
    >
      {!isCollected && (
        <BoxShape
          dim={dim}
          color={color}
          rotation={rotation}
          quaternion={quaternion}
        />
      )}
    </RigidBody>
  );
}

interface BoxShapeProps {
  dim: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
  quaternion?: THREE.Quaternion;
}

export function BoxShape({
  dim,
  color = "red",
  rotation = [0, 0, 0],
  quaternion,
}: BoxShapeProps) {
  return (
    <group rotation={rotation} quaternion={quaternion}>
      <mesh castShadow>
        <boxGeometry args={dim} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  );
}

interface TilesProps {
  dim: [number, number, number];
  matrix: [number, number];
  gap?: number;
  position?: [number, number, number];
  color?: string;
  checkered?: boolean;
}

const Tiles: React.FC<TilesProps> = ({
  dim,
  matrix,
  gap = 0,
  position = [0, 0, 0],
  color = "#124",
  checkered = false,
}) => {
  const [cols, rows] = matrix;
  const [w, h, d] = dim;
  const tiles = [];
  for (let x = 0; x < cols; x++) {
    for (let z = 0; z < rows; z++) {
      if (!checkered || (x + z) % 2 === 0) {
        tiles.push(
          <Box
            key={`box-${position.join(",")}-${x},${z}`}
            position={[(w + gap) * x, 0, (d + gap) * z]}
            dim={dim}
            color={color}
          />
        );
      }
    }
  }
  return <group position={position}>{tiles}</group>;
};

export default Tiles;
