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
  Text3D,
  Center,
} from "@react-three/drei";
import { Letter } from "./components/Letter";

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
            <LetterObjects />
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
  );
}

type UserData = {
  isCollectable: boolean;
  volume: number;
  size: number;
  width: number;
  height: number;
  depth: number;
  id: number;
  setCollected: (x: boolean) => void;
  type?: string;
  char?: string;
  fontSize?: number;
  color?: string;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
};

function KatamariBall() {
  const initialRadius = 0.5;

  const ballRef = useRef<RapierRigidBody>(null);
  const [ballSize] = useState(initialRadius);
  const [virtualRadius, setVirtualRadius] = useState(initialRadius);
  const [totalMass, setTotalMass] = useState(3);
  const [rotation, setRotation] = useState(0);
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

        {renderCollectedObjects()}
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

function CollectibleObject({
  position,
  width,
  height,
  depth,
  id,
  type,
  char,
  fontSize,
  color,
  bevelEnabled,
  bevelThickness,
  bevelSize,
  bevelSegments,
  curveSegments,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  id: number;
  type?: string;
  char?: string;
  fontSize?: number;
  color?: string;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
}) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
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
    return [position[0], yPos, position[2]] as [number, number, number];
  }, [position, height]);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={adjustedPosition}
      colliders="cuboid"
      userData={{
        id,
        size: maxDimension,
        width,
        height,
        depth,
        volume: objectVolume,
        isCollectable: true,
        setCollected: setIsCollected,
        type,
        char,
        fontSize,
        color,
        bevelEnabled,
        bevelThickness,
        bevelSize,
        bevelSegments,
        curveSegments,
      }}
      sensor={isCollected}
    >
      {!isCollected && (
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      )}
    </RigidBody>
  );
}

function CollectibleObjects() {
  const count = 500;
  const area = 60;
  const maxSize = 0.8;

  const objects = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const position: [number, number, number] = [
        (Math.random() - 0.5) * area,
        0,
        (Math.random() - 0.5) * area,
      ];

      const width = Math.random() * maxSize + 0.2;
      const height = Math.random() * maxSize + 0.2;
      const depth = Math.random() * maxSize + 0.2;

      return { position, width, height, depth, id: i };
    });
  }, [count, area, maxSize]);

  return (
    <>
      {objects.map((props) => (
        <CollectibleObject key={props.id} {...props} />
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

function LetterObjects() {
  const letters = "Katamari";
  const spacing = 1.2;

  return (
    <>
      {letters.split("").map((char, index) => (
        <Letter
          key={`letter-${index}`}
          char={char}
          position={[(index - letters.length / 2) * spacing, 0.5, -10]}
          fontSize={0.7}
          color="#FF5733"
          depth={0.1}
          id={1000 + index}
          bevelEnabled={true}
          bevelThickness={0.05}
          bevelSize={0.04}
          bevelSegments={4}
          curveSegments={12}
        />
      ))}
    </>
  );
}
