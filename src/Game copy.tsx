import {
  Physics,
  RigidBody,
  useRapier,
  CuboidCollider,
  InstancedRigidBodyProps,
  RigidBodyAutoCollider,
  RapierRigidBody,
  CollisionEnterHandler,
  CylinderCollider,
  BallCollider,
} from "@react-three/rapier";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  RefObject,
} from "react";
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
  const [totalMass, setTotalMass] = useState(1);
  const [rotation, setRotation] = useState(0);
  const direction = useRef(new THREE.Vector3(0, 0, 1));

  const MOVE_FORCE = 3;
  const TURN_SPEED = 2.0;
  const MAX_VELOCITY = 5;
  const CAMERA_HEIGHT = 2;
  const CAMERA_DISTANCE = 5;
  const CAMERA_SMOOTHING = 0.05;
  const TORQUE_FACTOR = 2.5;
  const MAX_ANGULAR_VELOCITY = 3;

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
    const angularVelocity = ballBody.angvel();
    const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    const angularSpeed = Math.sqrt(
      angularVelocity.x ** 2 + angularVelocity.y ** 2 + angularVelocity.z ** 2
    );

    if (angularSpeed > MAX_ANGULAR_VELOCITY) {
      const scale = MAX_ANGULAR_VELOCITY / angularSpeed;
      ballBody.setAngvel(
        {
          x: angularVelocity.x * scale,
          y: angularVelocity.y * scale,
          z: angularVelocity.z * scale,
        },
        true
      );
    }

    const turnCoefficient = 1.0 / (1.0 + speed * 0.2);
    const effectiveTurnSpeed = TURN_SPEED * turnCoefficient * delta;
    if (keys.left) {
      setRotation((prev) => prev + effectiveTurnSpeed);
    }
    if (keys.right) {
      setRotation((prev) => prev - effectiveTurnSpeed);
    }

    direction.current.set(Math.sin(rotation), 0, Math.cos(rotation));

    const speedFactor = Math.max(0, 1 - (speed / MAX_VELOCITY) * 0.8);

    if (keys.forward) {
      const upVector = new THREE.Vector3(0, 1, 0);
      const moveDirection = direction.current.clone();
      const rotationAxis = new THREE.Vector3()
        .crossVectors(upVector, moveDirection)
        .normalize();

      ballBody.applyTorqueImpulse(
        {
          x: rotationAxis.x * TORQUE_FACTOR * delta * MOVE_FORCE * speedFactor,
          y: rotationAxis.y * TORQUE_FACTOR * delta * MOVE_FORCE * speedFactor,
          z: rotationAxis.z * TORQUE_FACTOR * delta * MOVE_FORCE * speedFactor,
        },
        true
      );

      const moveForce = direction.current
        .clone()
        .multiplyScalar(MOVE_FORCE * delta * 0.3 * speedFactor);
      ballBody.applyImpulse({ x: moveForce.x, y: 0, z: moveForce.z }, true);
    }

    if (keys.back) {
      const upVector = new THREE.Vector3(0, 1, 0);
      const moveDirection = direction.current.clone().negate();
      const rotationAxis = new THREE.Vector3()
        .crossVectors(upVector, moveDirection)
        .normalize();

      ballBody.applyTorqueImpulse(
        {
          x: rotationAxis.x * TORQUE_FACTOR * delta * MOVE_FORCE * speedFactor,
          y: rotationAxis.y * TORQUE_FACTOR * delta * MOVE_FORCE * speedFactor,
          z: rotationAxis.z * TORQUE_FACTOR * delta * MOVE_FORCE * speedFactor,
        },
        true
      );

      const moveForce = direction.current
        .clone()
        .negate()
        .multiplyScalar(MOVE_FORCE * delta * 0.3 * speedFactor);
      ballBody.applyImpulse({ x: moveForce.x, y: 0, z: moveForce.z }, true);
    }

    if (speed > MAX_VELOCITY) {
      const normalizedVel = new THREE.Vector3(
        velocity.x,
        velocity.y,
        velocity.z
      ).normalize();
      ballBody.setLinvel(
        {
          x: normalizedVel.x * MAX_VELOCITY,
          y: velocity.y,
          z: normalizedVel.z * MAX_VELOCITY,
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
      obj.body.setRotation(ballRot, true);
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

      attachedObjectsRef.current.set(id, {
        id,
        body: otherBody,
        attachPoint,
        size: userData.size,
        volume: userData.volume,
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
        const objectVolume = Math.pow(userData.size, 3);
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
      console.log({ objectVolume, ballVolume, ballRadius });
      return dimensionCheck && volumeCheck;
    },
    []
  );

  return (
    <>
      <RigidBody
        ref={ballRef}
        colliders={false}
        restitution={0.2}
        friction={0.9}
        linearDamping={0.5}
        angularDamping={0.2}
        position={[0, ballSize, 0]}
        mass={totalMass}
        onCollisionEnter={onCollision}
        canSleep={false}
      >
        <mesh castShadow>
          <sphereGeometry args={[ballSize, 32, 32]} />
          <meshStandardMaterial map={texture.current} />
        </mesh>

        <BallCollider args={[virtualRadius]} sensor={false} friction={0.9} />

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

function CollectibleObject({ position, size, id }) {
  const rigidBodyRef = useRef(null);
  const [isCollected, setIsCollected] = useState(false);
  const objectVolume = useMemo(() => size * size * size, [size]);

  const adjustedPosition = useMemo(() => {
    const yPos = -0.5 + size / 2;
    return [position[0], yPos, position[2]];
  }, [position, size]);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={adjustedPosition}
      colliders="cuboid"
      userData={{
        id,
        size,
        volume: objectVolume,
        isCollectable: true,
        setCollected: setIsCollected,
      }}
      sensor={isCollected}
    >
      <mesh castShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </RigidBody>
  );
}

function CollectibleObjects({}) {
  const count = 100;
  const area = 30;

  const objects = Array.from({ length: count }).map((_, i) => {
    const position = [
      (Math.random() - 0.5) * area,
      0,
      (Math.random() - 0.5) * area,
    ];

    const size = 0.1 + Math.random() * 0.5;

    return {
      id: `object-${i}`,
      position,
      size,
      volume: size * size * size,
    };
  });

  return (
    <>
      {objects.map((obj) => (
        <CollectibleObject
          key={obj.id}
          id={obj.id}
          position={obj.position}
          size={obj.size}
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
