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
  id: string;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
  rotation?: [number, number, number];
}

const bevelEnabled = true;
const bevelThickness = 0.03;
const bevelSize = 0.02;
const bevelSegments = 4;
const curveSegments = 12;

export function Letter({
  char,
  position,
  fontSize = 1,
  color = "white",
  depth = 1,
  id,
  rotation = [0, 0, 0], // Default to no rotation, we'll handle it in the Word component
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

  const letterDepth = fontSize * 0.15 * depth;

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
        depth: letterDepth,
      });
    }
  }, [char, fontSize, depth]);

  // useEffect(() => {
  //   if (textRef.current) {
  //     const timer = setTimeout(() => {
  //       const box = new THREE.Box3().setFromObject(textRef.current!);
  //       const size = new THREE.Vector3();
  //       box.getSize(size);
  //       setDimensions({
  //         width: size.x,
  //         height: size.y,
  //         depth: size.z,
  //       });
  //     }, 100);

  //     return () => clearTimeout(timer);
  //   }
  // }, [char, textRef.current]);

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
        type: "letter",
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
        <Center>
          <group rotation={rotation}>
            <Text3D
              ref={textRef}
              font="/fonts/Roboto_Regular.json"
              size={fontSize}
              height={letterDepth}
              curveSegments={curveSegments}
              bevelEnabled={bevelEnabled}
              bevelThickness={bevelThickness}
              bevelSize={bevelSize}
              bevelSegments={bevelSegments}
            >
              {char}
              <meshStandardMaterial color={color} />
            </Text3D>
          </group>
        </Center>
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
  directionAngle?: number;
  spacing?: number;
}

export function Word({
  text,
  position,
  fontSize = 1,
  color = "#777",
  depth = 1,
  id = "w-",
  directionAngle = 0,
  spacing = 0,
}: WordProps) {
  const [letterWidths, setLetterWidths] = useState<number[]>([]);
  const groupRef = useRef(null);
  const chars = text.split("");
  const letterSpacing = fontSize / 8 + spacing;

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = `bold ${100}px Arial`;
      const widths = chars.map((char) => {
        const metrics = ctx.measureText(char);
        return (metrics.width * fontSize) / 100;
      });
      setLetterWidths(widths);
    }
  }, [text, fontSize]);

  if (letterWidths.length === 0) {
    return null;
  }

  const letterPositions: [number, number, number][] = [];
  let currentX = 0;

  const totalWidth = letterWidths.reduce((sum, width, index) => {
    if (index < letterWidths.length - 1) {
      return sum + width + letterSpacing;
    }
    return sum + width;
  }, 0);

  currentX = -totalWidth / 2;

  for (let i = 0; i < chars.length; i++) {
    letterPositions.push([currentX + letterWidths[i] / 2, 0, 0]);
    currentX += letterWidths[i] + letterSpacing;
  }

  return (
    <group
      position={position}
      rotation={[0, directionAngle + Math.PI, 0]}
      ref={groupRef}
    >
      {chars.map((char, index) => (
        <Letter
          key={`${id}-${index}`}
          id={`${id}-${index}`}
          char={char}
          position={letterPositions[index]}
          fontSize={fontSize}
          color={color}
          depth={depth}
        />
      ))}
    </group>
  );
}
