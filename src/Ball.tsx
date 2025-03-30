import {
  RigidBody,
  useRapier,
  RapierRigidBody,
  BallCollider,
} from "@react-three/rapier";
import { useState, useRef } from "react";
import * as THREE from "three";
import { CollectibleObject, UserData } from "./Game";
import { CollectedItems } from "./components/CollectedItems";
import {
  calculateVolume,
  isBiggerThanObj,
  useDisplay,
  useKeyboardSteering,
} from "./hooks";

const initialRadius = 0.5;

export default function KatamariBall() {
  const [totalMass, setTotalMass] = useState(3);
  const [virtualRadius, setVirtualRadius] = useState(initialRadius);
  const ballRef = useRef<RapierRigidBody>(null);
  const collectedObjects = useRef(new Map<string, CollectibleObject>());

  const { rapier, world } = useRapier();
  const texture = useRef(createBallTexture());

  useDisplay(virtualRadius);
  useKeyboardSteering(ballRef, virtualRadius, totalMass);

  function addCompoundCollider(
    attachPoint: THREE.Vector3,
    relativeRotation: THREE.Quaternion,
    objectSize: [number, number, number]
  ) {
    if (!ballRef.current || !world) return;

    try {
      const colliderDesc = rapier.ColliderDesc.cuboid(
        objectSize[0] / 2,
        objectSize[1] / 2,
        objectSize[2] / 2
      );

      colliderDesc.setTranslation(attachPoint.x, attachPoint.y, attachPoint.z);
      colliderDesc.setRotation({
        x: relativeRotation.x,
        y: relativeRotation.y,
        z: relativeRotation.z,
        w: relativeRotation.w,
      });

      colliderDesc.setFriction(1.5);
      colliderDesc.setRestitution(0.1);

      const rigidBodyHandle = ballRef.current.handle as unknown as any;
      world.createCollider(colliderDesc, rigidBodyHandle);
    } catch (error) {
      console.error("Error creating compound collider:", error);
    }
  }

  function onCollision(otherBody: RapierRigidBody | undefined): void {
    if (!otherBody) return;

    const userData = otherBody.userData as UserData;
    if (!userData?.isCollectable) return;
    if (collectedObjects.current.has(userData.id)) return;
    if (!isBiggerThanObj(userData, virtualRadius)) return;
    if (!ballRef.current) return;

    const newVolume = calculateVolume(virtualRadius) + userData.volume * 0.5;
    const newRadius = Math.cbrt(newVolume / ((4 / 3) * Math.PI));
    setVirtualRadius(newRadius);
    const newMass = 3 * (newRadius / initialRadius) ** 3;
    setTotalMass(newMass);

    const attachPoint = calcAttachmentPoint(
      otherBody,
      ballRef.current,
      virtualRadius
    );

    const relativeRotation = calcRelativeRotation(ballRef.current, otherBody);

    const objectDimensions: [number, number, number] = [
      userData.width,
      userData.height,
      userData.depth,
    ];

    addCompoundCollider(attachPoint, relativeRotation, objectDimensions);

    collectedObjects.current.set(userData.id, {
      type: userData.type || "box",
      ...userData,
      position: attachPoint,
      rotation: relativeRotation,
      geometry: objectDimensions,
      initialRotation: userData.initialRotation,
    });

    otherBody.setEnabled(false);

    userData.setCollected && userData.setCollected(true);
  }

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
        onCollisionEnter={({ other }) => onCollision(other.rigidBody)}
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

        <CollectedItems collectedObjects={collectedObjects} />
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

export const calcRelativeRotation = (
  ballObj: RapierRigidBody,
  obj: RapierRigidBody
) => {
  const ballRot = ballObj.rotation();
  const objRot = obj.rotation();
  const userData = obj.userData as UserData;

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

  if (userData.initialRotation) {
    const initialEuler = new THREE.Euler(
      userData.initialRotation[0],
      userData.initialRotation[1],
      userData.initialRotation[2],
      "XYZ"
    );
    const initialQuaternion = new THREE.Quaternion().setFromEuler(initialEuler);
    const inverseInitialQuaternion = initialQuaternion.clone().invert();
    objectQuaternion.multiply(inverseInitialQuaternion);
  }
  const inverseRotation = ballQuaternion.clone().invert();
  const relativeRotation = objectQuaternion.clone().multiply(inverseRotation);
  return relativeRotation;
};

const calcAttachmentPoint = (
  objectBody: RapierRigidBody,
  ballBody: RapierRigidBody,
  radius: number
) => {
  const ballPos = ballBody.translation();
  const ballRot = ballBody.rotation();
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

  const localAttachPoint = localDirection.multiplyScalar(radius);

  return localAttachPoint;
};
