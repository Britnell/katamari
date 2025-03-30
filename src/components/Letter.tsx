import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Text3D, Center, useFont } from "@react-three/drei";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { pi } from "../Game";

const fontUrl = "/fonts/Roboto Slab_Regular.json";

interface WordProps {
  text: string;
  position: [number, number, number];
  fontSize?: number;
  color?: string;
  depth?: number;
  id?: string;
  wordAngle?: number;
  spacing?: number;
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
}: WordProps) {
  const font = useFont(fontUrl);
  const chars = text.split("");
  const letterSpacing = fontSize * 0.125 * spacing;
  wordAngle += pi;

  const widths = chars.map((char) => {
    const data = font.data as any as Font;
    const glyph = data.glyphs[char];
    const width = ((glyph.x_max - glyph.x_min) / data.resolution) * fontSize;
    return width;
  });
  const cumWidth = widths.reduce(
    (acc: number[], w) => [...acc, (acc[acc.length - 1] ?? 0) + w],
    [0]
  );
  const totalWidth = widths.reduce((acc, w) => acc + w, 0);

  function calcPos(index: number) {
    const pos = new THREE.Vector3(
      position[0],
      position[1] - fontSize * 0.8,
      position[2]
    );
    const directionVector = new THREE.Vector3(
      Math.cos(wordAngle),
      0,
      Math.sin(wordAngle)
    );

    pos.add(
      directionVector.multiplyScalar(
        cumWidth[index] +
          widths[index] / 2 +
          (index - 1) * letterSpacing -
          totalWidth / 2
      )
    );
    return [pos.x, pos.y, pos.z] as [number, number, number];
  }

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
        />
      ))}
    </>
  );
}

interface LetterProps {
  char: string;
  position: [number, number, number];
  fontSize?: number;
  color?: string;
  depth?: number;
  id: string;
  rotation?: [number, number, number];
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
  const letterDepth = fontSize * 0.13 * depth;
  const font = useFont(fontUrl);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    depth: number;
  }>({
    width: fontSize,
    height: fontSize,
    depth: letterDepth,
  });

  type Font = {
    ascender: number;
    descender: number;
    resolution: number;
    glyphs: Record<string, { x_max: number; x_min: number }>;
  };

  useEffect(() => {
    const data = font.data as any as Font;
    const glyph = data.glyphs[char];
    if (!glyph) return;
    const width = ((glyph.x_max - glyph.x_min) / data.resolution) * fontSize;
    const height =
      ((data.ascender - data.descender) / data.resolution) * fontSize;

    setDimensions({
      width,
      height,
      depth: letterDepth,
    });
  }, [font, char, fontSize, letterDepth]);

  const objectVolume = dimensions.width * dimensions.height * dimensions.depth;
  const maxDimension = Math.max(
    dimensions.width,
    dimensions.height,
    dimensions.depth
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
            font={fontUrl}
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
