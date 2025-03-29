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
import { useKeyboardControls } from "@react-three/drei";
import { CollectibleObject, UserData } from "./Game";
import { LetterShape } from "./components/Letter";

const initialRadius = 0.5;
const BASE_CAMERA_HEIGHT = 1.6;
const BASE_CAMERA_DISTANCE = 4;
const CAMERA_SMOOTHING = 0.05;

interface KatamariBallProps {
  collectedObjects: RefObject<Map<string, CollectibleObject>>;
}

export default function KatamariBall({ collectedObjects }: KatamariBallProps) {
  const [totalMass, setTotalMass] = useState(3);
  const [virtualRadius, setVirtualRadius] = useState(initialRadius);
  const ballRef = useRef<RapierRigidBody>(null);
  const rotationAngle = useRef(0);
  const direction = useRef(new THREE.Vector3(0, 0, 1));

  const [_sub, getState] = useKeyboardControls();
  const { camera } = useThree();
  const { rapier, world } = useRapier();
  const texture = useRef(createBallTexture());

  const calculateVolume = (radius: number) => {
    return (4 / 3) * Math.PI * Math.pow(radius, 3);
  };

  const formatRadius = (radius: number) => {
    return (radius * 2).toFixed(1) + "m";
  };

  const formatVolume = (volume: number) => {
    return volume.toFixed(1) + "m³";
  };

  useEffect(() => {
    const displayElement = document.createElement("div");
    displayElement.id = "ball-size-display";
    displayElement.style.position = "absolute";
    displayElement.style.top = "20px";
    displayElement.style.left = "20px";
    displayElement.style.padding = "10px";
    displayElement.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    displayElement.style.color = "white";
    displayElement.style.fontFamily = "Arial, sans-serif";
    displayElement.style.fontSize = "16px";
    displayElement.style.borderRadius = "5px";
    displayElement.style.zIndex = "1000";
    document.body.appendChild(displayElement);

    return () => {
      document.body.removeChild(displayElement);
    };
  }, []);

  useEffect(() => {
    const displayElement = document.getElementById("ball-size-display");
    if (displayElement) {
      const volume = calculateVolume(virtualRadius);
      displayElement.innerHTML = `Ball Size: ${formatRadius(
        virtualRadius
      )} / ${formatVolume(volume)}`;
    }
  }, [virtualRadius]);

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
      if (keys.left) rotationAngle.current += effectiveTurnSpeed;
      if (keys.right) rotationAngle.current -= effectiveTurnSpeed;
      direction.current.set(
        Math.sin(rotationAngle.current),
        0,
        Math.cos(rotationAngle.current)
      );
    }

    if (keys.forward) {
      const TORQUE_FACTOR = 0.6;
      const BASE_MOVE_FORCE = 0.5;
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
      ballPosition.x -
        lookDirection.x * BASE_CAMERA_DISTANCE * (0.5 + virtualRadius),
      ballPosition.y + BASE_CAMERA_HEIGHT * (0.5 + virtualRadius),
      ballPosition.z -
        lookDirection.z * BASE_CAMERA_DISTANCE * (0.5 + virtualRadius)
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

      if (collectedObjects.current.has(userData.id)) return;

      const newVolume = calculateVolume(virtualRadius) + userData.volume * 0.5;
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

      collectedObjects.current.set(userData.id, {
        position: attachPoint,
        rotation: relativeRotation,
        geometry: objectDimensions,
        type: userData.type || "box",
        ...(userData.type === "letter" && {
          char: userData.char,
          fontSize: userData.fontSize,
          color: userData.color,
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
        const objectVolume = userData.volume * 8;
        const ballVolume = calculateVolume(virtualRadius);
        const isColl = objectVolume < ballVolume;
        console.log({ objectVolume });
        if (isColl && other.rigidBody) collectObject(other.rigidBody, userData);
      }
    },
    [collectObject, virtualRadius]
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
            <LetterShape
              key={`collected-${id}`}
              char={char || ""}
              fontSize={fontSize}
              color={color || "white"}
              depth={geometry[2] / fontSize}
              bevelEnabled={bevelEnabled}
              bevelThickness={bevelThickness}
              bevelSize={bevelSize}
              bevelSegments={bevelSegments}
              curveSegments={curveSegments}
              position={[position.x, position.y, position.z]}
              quaternion={rotation}
              scale={[0.8, 0.8, 0.8]} // Makes collected objects 20% smaller to fit better on the ball
            />
          );
        }

        return (
          <group
            key={`collected-${id}`}
            position={[position.x, position.y, position.z]}
          >
            <mesh
              position={[0, 0, 0]}
              quaternion={rotation}
              scale={[1, 1, 1]}
              castShadow
            >
              <boxGeometry args={geometry} />
              <meshStandardMaterial color="orange" />
            </mesh>
          </group>
        );
      }
    ) as React.ReactNode[];
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
        <group>
          <mesh castShadow>
            <sphereGeometry args={[initialRadius, 32, 32]} />
            <meshStandardMaterial
              map={texture.current}
              transparent={false}
              opacity={1}
              side={THREE.FrontSide}
            />
          </mesh>
        </group>

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
  context.fillStyle = "#4caf50";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 20; i++) {
    context.fillStyle = i % 2 === 0 ? "#a5d6a7" : "#2e7d32";
    const size = Math.random() * 40 + 10;
    context.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      size,
      size
    );
  }
  return new THREE.CanvasTexture(canvas);
}
