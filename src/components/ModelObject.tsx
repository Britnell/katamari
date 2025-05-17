import { useState, useRef, useEffect, useMemo } from "react";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useGLTF, Clone, Center } from "@react-three/drei";
import * as THREE from "three";

useGLTF.preload("/3d/gameboy/scene.gltf");
useGLTF.preload("/3d/diskette/scene.gltf");
// useGLTF.preload("/3d/foliage/scene.gltf");

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

  // const adjustedPosition = useMemo(() => {
  //   const yPos = position[1] + dimensions[1] / 2;
  //   return [position[0], yPos, position[2]] as [number, number, number];
  // }, [position, dimensions.height]);

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
        isCollectable: true,
        setCollected: setIsCollected,
        initialRotation: rotation,
        type: "model",
        modelPath,
        scale,
      }}
      sensor={isCollected}
    >
      {!isCollected && <ModelShape modelPath={modelPath} scale={scale} />}
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

// Define the interface for each model instance configuration
export interface ModelInstanceConfig {
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  id: string;
}

// Define the interface for the ModelGroup component
interface ModelGroupProps {
  modelPath: string;
  instances: ModelInstanceConfig[];
  extractMeshes?: boolean;
  meshFilter?: (object: THREE.Object3D) => boolean;
}

export function ModelGroup({
  modelPath,
  instances,
  extractMeshes = false,
  meshFilter = (object) =>
    object instanceof THREE.Mesh && object.parent?.name !== "RootNode",
}: ModelGroupProps) {
  const { scene } = useGLTF(modelPath);
  const [extractedMeshes, setExtractedMeshes] = useState<
    Array<{
      name: string;
      mesh: THREE.Mesh;
    }>
  >([]);

  useEffect(() => {
    if (extractMeshes && scene) {
      const meshes: Array<{
        name: string;
        mesh: THREE.Mesh;
      }> = [];

      // Find all mesh objects in the scene that match the filter
      scene.traverse((object) => {
        if (meshFilter(object) && object instanceof THREE.Mesh) {
          meshes.push({
            name: object.parent?.name || object.name,
            mesh: object,
          });
        }
      });

      setExtractedMeshes(meshes);
    }
  }, [scene, extractMeshes, meshFilter]);

  if (extractMeshes) {
    return (
      <>
        {instances.map((instance, instanceIndex) => {
          const meshIndex = instanceIndex % extractedMeshes.length;
          const mesh = extractedMeshes[meshIndex]?.mesh;

          if (!mesh) return null;

          return (
            <ExtractedModelObject
              key={instance.id}
              mesh={mesh}
              position={instance.position}
              scale={instance.scale || 1}
              rotation={instance.rotation || [0, 0, 0]}
              id={instance.id}
              name={extractedMeshes[meshIndex]?.name || `mesh_${meshIndex}`}
            />
          );
        })}
      </>
    );
  }

  // If not extracting meshes, just render the whole model at each instance position
  return (
    <>
      {instances.map((instance) => (
        <ModelObject
          key={instance.id}
          modelPath={modelPath}
          position={instance.position}
          scale={instance.scale}
          rotation={instance.rotation}
          id={instance.id}
        />
      ))}
    </>
  );
}

interface ExtractedModelObjectProps {
  mesh: THREE.Mesh;
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  id: string;
  name: string;
}

function ExtractedModelObject({
  mesh,
  position,
  scale = 1,
  rotation = [0, 0, 0],
  id,
  name,
}: ExtractedModelObjectProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isCollected, setIsCollected] = useState(false);
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

  useEffect(() => {
    if (mesh) {
      const clonedMesh = mesh.clone();
      const box = new THREE.Box3().setFromObject(clonedMesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      const center = new THREE.Vector3();
      center.set(
        (box.min.x + box.max.x) / 2,
        (box.min.y + box.max.y) / 2,
        (box.min.z + box.max.z) / 2
      );

      setDimensions({
        width: size.x * scale,
        height: size.y * scale,
        depth: size.z * scale,
        center: center,
      });
    }
  }, [mesh, scale]);

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
        isCollectable: true,
        setCollected: setIsCollected,
        initialRotation: rotation,
        type: "model",
        name,
        scale,
      }}
      sensor={isCollected}
    >
      {!isCollected && (
        <group scale={scale} rotation={rotation}>
          <Clone object={mesh} castShadow receiveShadow />
        </group>
      )}
    </RigidBody>
  );
}
