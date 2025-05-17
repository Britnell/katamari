import { useRef, useState, useEffect } from "react";
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
  letterAngle?: number;
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
  letterAngle = 0,
}: WordProps) {
  const font = useFont(fontUrl);
  const chars = text.split("");
  const letterSpacing = fontSize * 0.125 * spacing;
  const _wordAngle = wordAngle + 1 * pi;

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
    const pos = new THREE.Vector3(position[0], position[1], position[2]);
    const directionVector = new THREE.Vector3(
      Math.cos(_wordAngle),
      0,
      Math.sin(_wordAngle)
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
          rotation={[0, -_wordAngle + letterAngle, 0]}
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

type Font = {
  ascender: number;
  descender: number;
  resolution: number;
  glyphs: Record<string, { x_max: number; x_min: number }>;
};

export function Letter({
  char,
  position,
  fontSize = 1,
  color = "white",
  depth = 1,
  id,
  rotation = [0, 0, 0],
}: LetterProps) {
  const letterDepth = fontSize * depth * 0.1; // depth is a relative factor, generally depth = 0.1 of fontsize
  const font = useFont(fontUrl);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);
  const [dimensions, setDimensions] = useState<[number, number, number]>([
    0, 0, 0,
  ]);

  useEffect(() => {
    const data = font.data as any as Font;
    const glyph = data.glyphs[char];
    if (!glyph) return;
    const width = (glyph.x_max / data.resolution) * fontSize;
    const height = (data.ascender / data.resolution) * fontSize;

    setDimensions([width, height, letterDepth]);
  }, [font, char, fontSize, letterDepth]);

  if (dimensions[0] === 0) {
    return null;
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      rotation={rotation}
      colliders="cuboid"
      userData={{
        id,
        dim: dimensions,
        volume: dimensions[0] * dimensions[1] * dimensions[2] * 0.5, // adjust letters aren't squares
        size: Math.max(...dimensions),
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
}

export function LetterShape({
  char,
  fontSize = 1,
  color = "white",
  depth = 0.15,
  rotation = [0, 0, 0],
  position,
  quaternion,
}: DrawLetterProps) {
  const textRef = useRef<THREE.Mesh>(null);

  return (
    <group
      position={position}
      quaternion={quaternion}
      rotation={quaternion ? undefined : rotation}
    >
      <Center>
        <Text3D
          ref={textRef}
          font={fontUrl}
          size={fontSize}
          height={depth}
          bevelEnabled={true}
          bevelThickness={0.03}
          bevelSize={0.02}
          bevelSegments={1}
          curveSegments={12}
          castShadow
        >
          {char}
          <meshStandardMaterial color={color} />
        </Text3D>
      </Center>
    </group>
  );
}
