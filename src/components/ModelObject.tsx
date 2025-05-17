import { useState, useRef, useEffect } from "react";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useGLTF, Clone, Center } from "@react-three/drei";
import * as THREE from "three";

useGLTF.preload("/3d/gameboy/scene.gltf");
useGLTF.preload("/3d/diskette/scene.gltf");

interface ModelObjectProps {
  modelPath: string;
  position: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  id: string;
}

export function ModelObject({
  modelPath,
  position,
  scale = 1,
  rotation = [0, 0, 0],
  id,
}: ModelObjectProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);
  const [dimensions, setDimensions] = useState<[number, number, number]>([
    0, 0, 0,
  ]);

  const { scene } = useGLTF(modelPath);

  useEffect(() => {
    if (scene) {
      const clonedScene = scene.clone();
      const box = new THREE.Box3().setFromObject(clonedScene);
      const size = new THREE.Vector3();
      box.getSize(size);

      setDimensions([
        size.x * (Array.isArray(scale) ? Number(scale[0]) : Number(scale)),
        size.y * (Array.isArray(scale) ? Number(scale[1]) : Number(scale)),
        size.z * (Array.isArray(scale) ? Number(scale[2]) : Number(scale)),
      ]);
    }
  }, [scene, scale]);

  if (dimensions[0] === 0) {
    return null;
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[position[0], position[1] + dimensions[1] / 2, position[2]]}
      rotation={rotation}
      colliders="cuboid"
      userData={{
        id,
        dim: dimensions,
        volume: dimensions[0] * dimensions[1] * dimensions[2],
        size: Math.max(...dimensions),
        isCollectable: true,
        setCollected: setIsCollected,
        initialRotation: rotation,
        type: "model",
        modelPath,
        scale,
      }}
      sensor={isCollected}
    >
      <Center>
        {!isCollected && <ModelShape modelPath={modelPath} scale={scale} />}
      </Center>
    </RigidBody>
  );
}

interface ModelShapeProps {
  modelPath: string;
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  position?: [number, number, number];
  quaternion?: THREE.Quaternion;
}

export function ModelShape({
  modelPath,
  scale = 1,
  rotation = [0, 0, 0],
  position,
  quaternion,
}: ModelShapeProps) {
  const { scene } = useGLTF(modelPath);

  return (
    <group
      position={position}
      quaternion={quaternion}
      rotation={quaternion ? undefined : rotation}
    >
      <Center scale={scale}>
        <Clone object={scene} castShadow>
          <meshStandardMaterial attach="material" />
        </Clone>
      </Center>
    </group>
  );
}
