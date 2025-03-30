import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Text3D, Center } from "@react-three/drei";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { pi } from "../Game";

interface LetterProps {
  char: string;
  position: [number, number, number];
  fontSize?: number;
  color?: string;
  depth?: number;
  id: string;
  rotation?: [number, number, number];
  collectedObjects?: any;
}

export function Letter({
  char,
  position,
  fontSize = 1,
  color = "white",
  depth = 1,
  id,
  rotation = [0, 0, 0],
}: LetterProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    depth: number;
  }>({
    width: 0,
    height: 0,
    depth: 0,
  });

  const letterDepth = fontSize * 0.15 * depth;

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = `bold ${100}px monospace`;
      const metrics = ctx.measureText(char);
      const height = 100;
      setDimensions({
        width: (metrics.width * fontSize) / 100,
        height: (height * fontSize) / 100,
        depth: letterDepth,
      });
    }
  }, [char, fontSize, depth]);

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
      rotation={rotation}
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
        initialRotation: rotation,
        type: "letter",
        char,
        fontSize,
        color,
      }}
      sensor={isCollected}
    >
      {!isCollected && (
        <LetterShape
          char={char}
          fontSize={fontSize}
          color={color}
          depth={letterDepth}
        />
      )}
    </RigidBody>
  );
}

interface WordProps {
  text: string;
  position: [number, number, number];
  fontSize?: number;
  color?: string;
  depth?: number;
  id?: string;
  wordAngle?: number;
  spacing?: number;
  collectedObjects?: any;
}

export function Word({
  text,
  position,
  fontSize = 1,
  color = "#777",
  depth = 1,
  id = "w-",
  wordAngle = 0,
  spacing = 1,
  collectedObjects,
}: WordProps) {
  const chars = text.split("");
  const letterSpacing = fontSize * 0.125 * spacing;
  const letterWidth = fontSize * 0.8;
  wordAngle += pi;

  const calcPos = (index: number) => {
    const pos = new THREE.Vector3(...position);
    const directionVector = new THREE.Vector3(
      Math.cos(wordAngle),
      0,
      Math.sin(wordAngle)
    );
    pos.add(
      directionVector.multiplyScalar(
        (index - chars.length / 2) * (letterWidth + letterSpacing)
      )
    );
    return [pos.x, pos.y, pos.z] as [number, number, number];
  };

  return (
    <>
      {chars.map((char, index) => (
        <Letter
          key={`${id}-${index}`}
          id={`${id}-${index}`}
          char={char}
          position={calcPos(index)}
          rotation={[0, -wordAngle, 0]}
          fontSize={fontSize}
          color={color}
          depth={depth}
          collectedObjects={collectedObjects}
        />
      ))}
    </>
  );
}

interface DrawLetterProps {
  char: string;
  fontSize?: number;
  color?: string;
  depth?: number;
  rotation?: [number, number, number];
  position?: [number, number, number];
  quaternion?: THREE.Quaternion;
  scale?: [number, number, number];
}

export function LetterShape({
  char,
  fontSize = 1,
  color = "white",
  depth = 0.15,
  rotation = [0, 0, 0],
  position,
  quaternion,
  scale = [1, 1, 1],
}: DrawLetterProps) {
  const textRef = useRef<THREE.Mesh>(null);
  const letterDepth = fontSize * depth;

  return (
    <group position={position} quaternion={quaternion}>
      <Center scale={scale}>
        <group rotation={rotation}>
          <Text3D
            ref={textRef}
            font="/fonts/Courier_Prime_Regular.json"
            size={fontSize}
            height={letterDepth}
            bevelEnabled={true}
            bevelThickness={0.03}
            bevelSize={0.02}
            bevelSegments={4}
            curveSegments={12}
            castShadow
          >
            {char}
            <meshStandardMaterial color={color} />
          </Text3D>
        </group>
      </Center>
    </group>
  );
}
