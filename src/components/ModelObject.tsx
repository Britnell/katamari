import { useState, useRef, useEffect, useMemo } from "react";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useGLTF, Clone } from "@react-three/drei";
import * as THREE from "three";

useGLTF.preload("/3d/gameboy/scene.gltf");
useGLTF.preload("/3d/diskette/scene.gltf");

interface ModelObjectProps {
  modelPath: string;
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  id: string;
  color?: string;
}

export function ModelObject({
  modelPath,
  position,
  scale = 1,
  rotation = [0, 0, 0],
  id,
  color,
}: ModelObjectProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);
  const modelRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    depth: number;
    center: THREE.Vector3;
  }>({
    width: 0,
    height: 0,
    depth: 0,
    center: new THREE.Vector3(),
  });

  const { scene } = useGLTF(modelPath);

  useEffect(() => {
    if (scene) {
      const clonedScene = scene.clone();
      const box = new THREE.Box3().setFromObject(clonedScene);
      const size = new THREE.Vector3();
      box.getSize(size);

      const center = new THREE.Vector3();
      box.getCenter(center);

      setDimensions({
        width: size.x * scale,
        height: size.y * scale,
        depth: size.z * scale,
        center: center.multiplyScalar(scale),
      });
    }
  }, [scene, scale]);

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
        type: "model",
        modelPath,
        scale,
        rotation,
      }}
      sensor={isCollected}
    >
      {!isCollected && (
        <group ref={modelRef}>
          <ModelShape modelPath={modelPath} scale={scale} rotation={rotation} />
        </group>
      )}
    </RigidBody>
  );
}

interface ModelShapeProps {
  modelPath: string;
  scale?: number;
  rotation?: [number, number, number];
  position?: [number, number, number];
  quaternion?: THREE.Quaternion;
  castShadow?: boolean;
  receiveShadow?: boolean;
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
    <group position={position} quaternion={quaternion}>
      <group rotation={rotation} scale={[scale, scale, scale]}>
        <Clone object={scene} castShadow={true}>
          <meshStandardMaterial attach="material" />
        </Clone>
      </group>
    </group>
  );
}
