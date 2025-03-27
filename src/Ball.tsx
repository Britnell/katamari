import {
  RigidBody,
  useRapier,
  RapierRigidBody,
  CollisionEnterHandler,
  BallCollider,
} from "@react-three/rapier";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useKeyboardControls, Text3D, Center } from "@react-three/drei";
import { UserData } from "./Game";

const initialRadius = 0.5;

export default function KatamariBall() {
  const [totalMass, setTotalMass] = useState(3);
  const [rotation, setRotation] = useState(0);
  const [virtualRadius, setVirtualRadius] = useState(initialRadius);
  const ballRef = useRef<RapierRigidBody>(null);
  const direction = useRef(new THREE.Vector3(0, 0, 1));

  const CAMERA_HEIGHT = 2;
  const CAMERA_DISTANCE = 5;
  const CAMERA_SMOOTHING = 0.05;

  const [_sub, getState] = useKeyboardControls();
  const { camera } = useThree();
  const { rapier, world } = useRapier();
  const texture = useRef(createBallTexture());

  const collectedObjects = useRef<
    Map<
      number,
      {
        position: THREE.Vector3;
        rotation: THREE.Quaternion;
        geometry: [number, number, number];
        type: string;
        char?: string;
        fontSize?: number;
        color?: string;
        bevelEnabled?: boolean;
        bevelThickness?: number;
        bevelSize?: number;
        bevelSegments?: number;
        curveSegments?: number;
      }
    >
  >(new Map());

  useEffect(() => {
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((_state, delta) => {
    if (!ballRef.current) return;

    const keys = getState();
    const ballBody = ballRef.current;
    const ballPosition = ballBody.translation();

    const velocity = ballBody.linvel();
    const speed = Math.sqrt(
      velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
    );

    if (keys.left || keys.right) {
      const TURN_SPEED = 1.5;
      const turnCoefficient = 1.0 / (1.0 + speed * 0.2);
      const effectiveTurnSpeed = TURN_SPEED * turnCoefficient * delta;
      if (keys.left) setRotation((prev) => prev + effectiveTurnSpeed);
      if (keys.right) setRotation((prev) => prev - effectiveTurnSpeed);
      direction.current.set(Math.sin(rotation), 0, Math.cos(rotation));
    }

    if (keys.forward) {
      const TORQUE_FACTOR = 0.6;
      const BASE_MOVE_FORCE = 0.4;
      const speedProportional = Math.max(0, 1 - speed * 0.15);
      const sizeProportional = BASE_MOVE_FORCE * totalMass;
      const factor =
        TORQUE_FACTOR * delta * sizeProportional * speedProportional;
      const upVector = new THREE.Vector3(0, 1, 0);
      const moveDirection = direction.current.clone();
      const rotationAxis = new THREE.Vector3()
        .crossVectors(upVector, moveDirection)
        .normalize();
      ballBody.applyTorqueImpulse(
        {
          x: rotationAxis.x * factor,
          y: rotationAxis.y * factor,
          z: rotationAxis.z * factor,
        },
        true
      );
    }

    const lookDirection = direction.current.clone();
    const targetCameraPos = new THREE.Vector3(
      ballPosition.x - lookDirection.x * CAMERA_DISTANCE,
      ballPosition.y + CAMERA_HEIGHT + virtualRadius,
      ballPosition.z - lookDirection.z * CAMERA_DISTANCE
    );
    camera.position.lerp(targetCameraPos, CAMERA_SMOOTHING);

    const targetLookAt = new THREE.Vector3(
      ballPosition.x + lookDirection.x,
      ballPosition.y,
      ballPosition.z + lookDirection.z
    );

    camera.lookAt(targetLookAt);
  });

  const calculateAttachmentPoint = useCallback(
    (objectBody: RapierRigidBody) => {
      if (!ballRef.current) return new THREE.Vector3(0, 0, 0);

      const ballPos = ballRef.current.translation();
      const ballRot = ballRef.current.rotation();
      const objPos = objectBody.translation();

      const ballQuaternion = new THREE.Quaternion(
        ballRot.x,
        ballRot.y,
        ballRot.z,
        ballRot.w
      );

      const worldDirection = new THREE.Vector3(
        objPos.x - ballPos.x,
        objPos.y - ballPos.y,
        objPos.z - ballPos.z
      ).normalize();

      const inverseRotation = ballQuaternion.clone().invert();
      const localDirection = worldDirection
        .clone()
        .applyQuaternion(inverseRotation);

      const localAttachPoint = localDirection.multiplyScalar(virtualRadius);

      return localAttachPoint;
    },
    [virtualRadius, ballRef]
  );

  const addCompoundCollider = useCallback(
    (
      _otherRigidBody: RapierRigidBody,
      attachPoint: THREE.Vector3,
      relativeRotation: THREE.Quaternion,
      objectSize: [number, number, number]
    ) => {
      if (!ballRef.current || !world) return;

      try {
        const ballRigidBodyHandle = ballRef.current.handle;

        const colliderDesc = rapier.ColliderDesc.cuboid(
          objectSize[0] / 2,
          objectSize[1] / 2,
          objectSize[2] / 2
        );

        colliderDesc.setTranslation(
          attachPoint.x,
          attachPoint.y,
          attachPoint.z
        );
        colliderDesc.setRotation({
          x: relativeRotation.x,
          y: relativeRotation.y,
          z: relativeRotation.z,
          w: relativeRotation.w,
        });

        colliderDesc.setFriction(1.5);
        colliderDesc.setRestitution(0.1);

        const rigidBodyHandle = ballRigidBodyHandle as unknown as any;
        world.createCollider(colliderDesc, rigidBodyHandle);
      } catch (error) {
        console.error("Error creating compound collider:", error);
      }
    },
    [ballRef, rapier, world]
  );

  const collectObject = useCallback(
    (otherBody: RapierRigidBody, userData: UserData) => {
      if (!ballRef.current) return;

      const id = userData.id;
      if (collectedObjects.current.has(id)) return;

      const newVolume =
        (4 / 3) * Math.PI * virtualRadius ** 3 + userData.volume;
      const newRadius = Math.cbrt(newVolume / ((4 / 3) * Math.PI));
      setVirtualRadius(newRadius);
      const newMass = 3 * (newRadius / initialRadius) ** 3;
      setTotalMass(newMass);

      const attachPoint = calculateAttachmentPoint(otherBody);

      const ballRot = ballRef.current.rotation();
      const objRot = otherBody.rotation();

      const ballQuaternion = new THREE.Quaternion(
        ballRot.x,
        ballRot.y,
        ballRot.z,
        ballRot.w
      );

      const objectQuaternion = new THREE.Quaternion(
        objRot.x,
        objRot.y,
        objRot.z,
        objRot.w
      );

      const inverseRotation = ballQuaternion.clone().invert();
      const relativeRotation = objectQuaternion
        .clone()
        .multiply(inverseRotation);

      const objectDimensions: [number, number, number] = [
        userData.width,
        userData.height,
        userData.depth,
      ];

      addCompoundCollider(
        otherBody,
        attachPoint,
        relativeRotation,
        objectDimensions
      );

      collectedObjects.current.set(id, {
        position: attachPoint,
        rotation: relativeRotation,
        geometry: objectDimensions,
        type: userData.type || "box",
        ...(userData.type === "letter" && {
          char: userData.char,
          fontSize: userData.fontSize,
          color: userData.color,
          bevelEnabled: userData.bevelEnabled,
          bevelThickness: userData.bevelThickness,
          bevelSize: userData.bevelSize,
          bevelSegments: userData.bevelSegments,
          curveSegments: userData.curveSegments,
        }),
      });

      otherBody.setEnabled(false);

      if (userData.setCollected) {
        userData.setCollected(true);
      }
    },
    [
      virtualRadius,
      calculateAttachmentPoint,
      setVirtualRadius,
      setTotalMass,
      addCompoundCollider,
    ]
  );

  const onCollision: CollisionEnterHandler = useCallback(
    ({ other }) => {
      const userData = other.rigidBody?.userData as UserData;
      if (userData?.isCollectable) {
        const objectVolume = userData.volume;
        const isColl = isCollectable(
          userData.size,
          objectVolume,
          virtualRadius
        );
        if (isColl && other.rigidBody) collectObject(other.rigidBody, userData);
      }
    },
    [collectObject, virtualRadius]
  );

  const isCollectable = useCallback(
    (objectSize: number, objectVolume: number, ballRadius: number): boolean => {
      const ballVolume = (4 / 3) * Math.PI * Math.pow(ballRadius, 3);
      const dimensionCheck = objectSize < 2 * ballRadius * 0.9;
      const volumeCheck = objectVolume < ballVolume / 8;
      return dimensionCheck && volumeCheck;
    },
    []
  );

  const renderCollectedObjects = useCallback(() => {
    if (!ballRef.current) return null;

    return Array.from(collectedObjects.current.entries()).map(
      ([id, object]) => {
        const { position, rotation, geometry, type } = object;

        if (type === "letter") {
          const {
            char,
            fontSize = 1,
            color = "white",
            bevelEnabled = true,
            bevelThickness = 0.03,
            bevelSize = 0.02,
            bevelSegments = 4,
            curveSegments = 12,
          } = object;

          return (
            <group
              key={`collected-${id}`}
              position={[position.x, position.y, position.z]}
              quaternion={rotation}
            >
              <Center scale={[0.8, 0.8, 0.8]}>
                <Text3D
                  font="/fonts/Roboto_Regular.json"
                  size={fontSize}
                  height={geometry[2]}
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
            </group>
          );
        }

        return (
          <group
            key={`collected-${id}`}
            position={[position.x, position.y, position.z]}
          >
            <mesh position={[0, 0, 0]} quaternion={rotation} scale={[1, 1, 1]}>
              <boxGeometry args={geometry} />
              <meshStandardMaterial color="orange" />
            </mesh>
          </group>
        );
      }
    );
  }, []);

  return (
    <>
      <RigidBody
        ref={ballRef}
        colliders={false}
        restitution={0.1}
        friction={1.5}
        linearDamping={0.8}
        angularDamping={0.5}
        position={[0, initialRadius, 0]}
        mass={totalMass}
        onCollisionEnter={onCollision}
        canSleep={false}
      >
        <mesh castShadow>
          <sphereGeometry args={[initialRadius, 32, 32]} />
          <meshStandardMaterial map={texture.current} />
        </mesh>

        <BallCollider args={[virtualRadius]} sensor={false} friction={1.5} />

        <mesh visible={false}>
          <sphereGeometry args={[virtualRadius, 8, 8]} />
          <meshBasicMaterial
            color="red"
            wireframe={true}
            transparent
            opacity={0.2}
          />
        </mesh>

        {renderCollectedObjects()}
      </RigidBody>
    </>
  );
}

function createBallTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "green";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 10; i++) {
    context.fillStyle = "white";
    context.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      10,
      10
    );
  }
  return new THREE.CanvasTexture(canvas);
}
