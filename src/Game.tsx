import {
  Physics,
  RigidBody,
  useRapier,
  RapierRigidBody,
  CollisionEnterHandler,
  BallCollider,
} from "@react-three/rapier";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  KeyboardControls,
  KeyboardControlsEntry,
  OrbitControls,
  PerspectiveCamera,
  useKeyboardControls,
} from "@react-three/drei";

export default function Game() {
  const map = useKeyboardMap();

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <KeyboardControls map={map}>
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={75} />
          <OrbitControls />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={1024}
          />

          <Physics interpolate={true} timeStep={1 / 60}>
            <KatamariBall />
            <Ground />
            <CollectibleObjects />
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

function KatamariBall() {
  const ballRef = useRef<RapierRigidBody>(null);
  const [ballSize] = useState(0.5);
  const [virtualRadius, setVirtualRadius] = useState(0.5);
  const [totalMass, setTotalMass] = useState(3);
  const [rotation, setRotation] = useState(0);
  const direction = useRef(new THREE.Vector3(0, 0, 1));

  const BASE_MOVE_FORCE = 1.5;
  const TURN_SPEED = 1.5;
  const BASE_MAX_VELOCITY = 3;
  const CAMERA_HEIGHT = 2;
  const CAMERA_DISTANCE = 5;
  const CAMERA_SMOOTHING = 0.05;
  const MAX_ANGULAR_VELOCITY = 2;

  const [_sub, getState] = useKeyboardControls();
  const { camera } = useThree();
  const { rapier } = useRapier();
  const texture = useRef(createBallTexture());
  const attachedObjectsRef = useRef(new Map());

  useEffect(() => {
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((state, delta) => {
    if (!ballRef.current) return;

    const keys = getState();
    const ballBody = ballRef.current;
    const ballPosition = ballBody.translation();

    const velocity = ballBody.linvel();
    const speed = Math.sqrt(
      velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
    );

    if (keys.left || keys.right) {
      const turnCoefficient = 1.0 / (1.0 + speed * 0.2);
      const effectiveTurnSpeed = TURN_SPEED * turnCoefficient * delta;
      if (keys.left) setRotation((prev) => prev + effectiveTurnSpeed);
      if (keys.right) setRotation((prev) => prev - effectiveTurnSpeed);

      direction.current.set(Math.sin(rotation), 0, Math.cos(rotation));
    }

    const currentMaxVelocity =
      BASE_MAX_VELOCITY * (1 + 0.2 * Math.sqrt(virtualRadius - 0.5));
    const speedFactor = Math.max(0, 1 - (speed / currentMaxVelocity) * 0.8);
    const currentMoveForce =
      BASE_MOVE_FORCE * (1 + 0.3 * Math.sqrt(virtualRadius - 0.5));
    const TORQUE_FACTOR = 0.8;

    if (keys.forward) {
      const upVector = new THREE.Vector3(0, 1, 0);
      const moveDirection = direction.current.clone();
      const rotationAxis = new THREE.Vector3()
        .crossVectors(upVector, moveDirection)
        .normalize();

      ballBody.applyTorqueImpulse(
        {
          x:
            rotationAxis.x *
            TORQUE_FACTOR *
            delta *
            currentMoveForce *
            speedFactor,
          y:
            rotationAxis.y *
            TORQUE_FACTOR *
            delta *
            currentMoveForce *
            speedFactor,
          z:
            rotationAxis.z *
            TORQUE_FACTOR *
            delta *
            currentMoveForce *
            speedFactor,
        },
        true
      );
    }

    if (speed > currentMaxVelocity) {
      const normalizedVel = new THREE.Vector3(
        velocity.x,
        velocity.y,
        velocity.z
      ).normalize();
      ballBody.setLinvel(
        {
          x: normalizedVel.x * currentMaxVelocity,
          y: velocity.y,
          z: normalizedVel.z * currentMaxVelocity,
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

  useFrame(() => {
    if (!ballRef.current) return;

    const ballPos = ballRef.current.translation();
    const ballRot = ballRef.current.rotation();

    const ballQuaternion = new THREE.Quaternion(
      ballRot.x,
      ballRot.y,
      ballRot.z,
      ballRot.w
    );

    attachedObjectsRef.current.forEach((obj) => {
      const rotatedPoint = obj.attachPoint
        .clone()
        .applyQuaternion(ballQuaternion);

      const objSize = obj.size / 2;
      const newPos = {
        x: ballPos.x + rotatedPoint.x,
        y: ballPos.y + rotatedPoint.y + objSize,
        z: ballPos.z + rotatedPoint.z,
      };

      obj.body.setTranslation(newPos, true);

      const combinedRotation = ballQuaternion
        .clone()
        .multiply(obj.relativeRotation);

      obj.body.setRotation(
        {
          x: combinedRotation.x,
          y: combinedRotation.y,
          z: combinedRotation.z,
          w: combinedRotation.w,
        },
        true
      );
    });
  });

  const calculateAttachmentPoint = useCallback(
    (objectBody) => {
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

  const collectObject = useCallback(
    (otherBody, userData) => {
      const id = userData.id;
      if (attachedObjectsRef.current.has(id)) return;
      const newVolume =
        (4 / 3) * Math.PI * virtualRadius ** 3 + userData.volume;
      const newRadius = Math.cbrt(newVolume / ((4 / 3) * Math.PI));
      setVirtualRadius(newRadius);
      setTotalMass((prev) => prev + userData.volume);

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

      attachedObjectsRef.current.set(id, {
        id,
        body: otherBody,
        attachPoint,
        size: userData.size,
        volume: userData.volume,
        relativeRotation: relativeRotation,
      });

      otherBody.setEnabled(false);

      if (userData.setCollected) {
        userData.setCollected(true);
      }
    },
    [virtualRadius, calculateAttachmentPoint, setVirtualRadius, setTotalMass]
  );

  const onCollision: CollisionEnterHandler = useCallback(
    ({ other }) => {
      const userData = other.rigidBody?.userData;
      if (userData?.isCollectable) {
        const objectVolume = userData.volume;
        console.log({ s: userData.size }, userData);
        const isColl = isCollectable(
          userData.size,
          objectVolume,
          virtualRadius
        );
        if (isColl) {
          collectObject(other.rigidBody, userData);
        }
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

  return (
    <>
      <RigidBody
        ref={ballRef}
        colliders={false}
        restitution={0.1}
        friction={1.5}
        linearDamping={0.8}
        angularDamping={0.5}
        position={[0, ballSize, 0]}
        mass={totalMass}
        onCollisionEnter={onCollision}
        canSleep={false}
      >
        <mesh castShadow>
          <sphereGeometry args={[ballSize, 32, 32]} />
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
      </RigidBody>
    </>
  );
}

function Ground() {
  return (
    <RigidBody type="fixed" name="ground" friction={0.9} restitution={0.0}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="lightblue" />
      </mesh>
    </RigidBody>
  );
}

function CollectibleObject({ position, width, height, depth, id }) {
  const rigidBodyRef = useRef(null);
  const [isCollected, setIsCollected] = useState(false);
  const objectVolume = useMemo(
    () => width * height * depth,
    [width, height, depth]
  );
  const maxDimension = useMemo(
    () => Math.max(width, height, depth),
    [width, height, depth]
  );

  const adjustedPosition = useMemo(() => {
    const yPos = -0.5 + height / 2;
    return [position[0], yPos, position[2]];
  }, [position, height]);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={adjustedPosition}
      colliders="cuboid"
      userData={{
        id,
        size: maxDimension,
        volume: objectVolume,
        isCollectable: true,
        setCollected: setIsCollected,
      }}
      sensor={isCollected}
    >
      <mesh castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </RigidBody>
  );
}

function CollectibleObjects({}) {
  const count = 500;
  const area = 60;
  const maxSize = 0.8;

  const objects = Array.from({ length: count }).map((_, i) => {
    const position = [
      (Math.random() - 0.5) * area,
      0,
      (Math.random() - 0.5) * area,
    ];

    const width = 0.1 + Math.random() * maxSize;
    const height = 0.1 + Math.random() * maxSize;
    const depth = 0.1 + Math.random() * maxSize;
    const maxDimension = Math.max(width, height, depth);
    const volume = width * height * depth;

    return {
      id: `object-${i}`,
      position,
      width,
      height,
      depth,
      size: maxDimension,
      volume,
    };
  });

  return (
    <>
      {objects.map((obj) => (
        <CollectibleObject
          key={obj.id}
          id={obj.id}
          position={obj.position}
          width={obj.width}
          height={obj.height}
          depth={obj.depth}
        />
      ))}
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

enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}
const useKeyboardMap = () =>
  useMemo<KeyboardControlsEntry<Controls>[]>(
    () => [
      { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
      { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
      { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
      { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
    ],
    []
  );
