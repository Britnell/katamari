import { useRef, useState, useEffect, useMemo } from "react";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { Text3D, Center } from "@react-three/drei";

interface LetterProps {
  char: string;
  position: [number, number, number];
  fontSize?: number;
  color?: string;
  depth?: number;
  id: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
}

export function Letter({
  char,
  position,
  fontSize = 1,
  color = "white",
  depth = 0.2,
  id,
  bevelEnabled = true,
  bevelThickness = 0.03,
  bevelSize = 0.02,
  bevelSegments = 4,
  curveSegments = 12,
}: LetterProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);
  const textRef = useRef<THREE.Mesh>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    depth: number;
  }>({
    width: 0,
    height: 0,
    depth: 0,
  });

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = `bold ${100}px Arial`;
      const metrics = ctx.measureText(char);
      const height = 100;
      setDimensions({
        width: (metrics.width * fontSize) / 100,
        height: (height * fontSize) / 100,
        depth: depth,
      });
    }
  }, [char, fontSize, depth]);

  useEffect(() => {
    if (textRef.current) {
      const timer = setTimeout(() => {
        const box = new THREE.Box3().setFromObject(textRef.current!);
        const size = new THREE.Vector3();
        box.getSize(size);

        setDimensions({
          width: size.x,
          height: size.y,
          depth: size.z,
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [char, textRef.current]);

  const objectVolume = useMemo(
    () => dimensions.width * dimensions.height * dimensions.depth,
    [dimensions]
  );

  const maxDimension = useMemo(
    () => Math.max(dimensions.width, dimensions.height, dimensions.depth),
    [dimensions]
  );

  const adjustedPosition = useMemo(() => {
    const yPos = position[1] + dimensions.height / 2;
    return [position[0], yPos, position[2]] as [number, number, number];
  }, [position, dimensions.height]);

  if (dimensions.width === 0) {
    return null;
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={adjustedPosition}
      colliders="cuboid"
      userData={{
        id,
        size: maxDimension,
        width: dimensions.width,
        height: dimensions.height,
        depth: dimensions.depth,
        volume: objectVolume,
        isCollectable: true,
        setCollected: setIsCollected,
      }}
      sensor={isCollected}
    >
      {!isCollected && (
        <Center>
          <Text3D
            ref={textRef}
            font="/fonts/Roboto_Regular.json"
            size={fontSize}
            height={depth}
            curveSegments={curveSegments}
            bevelEnabled={bevelEnabled}
            bevelThickness={bevelThickness}
            bevelSize={bevelSize}
            bevelSegments={bevelSegments}
          >
            {char}
            <meshStandardMaterial color={color} />
          </Text3D>
        </Center>
      )}
    </RigidBody>
  );
}
