import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useMemo, useRef, useState } from "react";

export function CollectibleObjects() {
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

export function CollectibleObject({
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
