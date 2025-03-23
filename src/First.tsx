import {
  Physics,
  RigidBody,
  useRapier,
  CuboidCollider,
  InstancedRigidBodyProps,
  RigidBodyAutoCollider,
  RapierRigidBody,
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
            <CollectibleObjects count={100} />
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

function KatamariBall() {
  const ballRef = useRef<RapierRigidBody>(null);
  const [ballSize, setBallSize] = useState(0.5);
  const [totalMass, setTotalMass] = useState(1);
  const [rotation, setRotation] = useState(0);
  const direction = useRef(new THREE.Vector3(0, 0, 1));

  const MOVE_FORCE = 10;
  const TURN_SPEED = 2.5;
  const MAX_VELOCITY = 10;
  const CAMERA_HEIGHT = 2;
  const CAMERA_DISTANCE = 5;
  const CAMERA_SMOOTHING = 0.05;

  const [_sub, getState] = useKeyboardControls();
  const { camera } = useThree();
  const texture = useRef(createBallTexture());

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
    const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);

    const turnCoefficient = 1.0 / (1.0 + speed * 0.2);
    const effectiveTurnSpeed = TURN_SPEED * turnCoefficient * delta;
    if (keys.left) {
      setRotation((prev) => prev + effectiveTurnSpeed);
    }
    if (keys.right) {
      setRotation((prev) => prev - effectiveTurnSpeed);
    }

    direction.current.set(Math.sin(rotation), 0, Math.cos(rotation));

    if (keys.forward) {
      const moveForce = direction.current
        .clone()
        .multiplyScalar(MOVE_FORCE * delta);
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
      ballPosition.y + CAMERA_HEIGHT + ballSize,
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

  return (
    <>
      <RigidBody
        ref={ballRef}
        colliders="ball"
        restitution={0.2}
        friction={0.8}
        linearDamping={0.4}
        angularDamping={0.3}
        position={[0, ballSize, 0]}
        mass={totalMass}
      >
        <mesh castShadow>
          <sphereGeometry args={[ballSize, 32, 32]} />
          <meshStandardMaterial map={texture.current} />
        </mesh>
      </RigidBody>
    </>
  );
}

function Ground() {
  return (
    <RigidBody type="fixed" name="ground">
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

function CollectibleObjects({ count = 100 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const position = [
          (Math.random() - 0.5) * 80,
          0.5 + Math.random() * 2,
          (Math.random() - 0.5) * 80,
        ];

        const size = 0.1 + Math.random() * 0.9;

        return (
          <RigidBody key={i} position={position} colliders="cuboid">
            <mesh castShadow>
              <boxGeometry args={[size, size, size]} />
              <meshStandardMaterial color="orange" />
            </mesh>
          </RigidBody>
        );
      })}
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
