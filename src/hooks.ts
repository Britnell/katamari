import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";

import { useRef, useEffect, RefObject } from "react";
import { UserData } from "./Game";
import { RapierRigidBody } from "@react-three/rapier";
import { log } from "three/tsl";

const BASE_CAMERA_HEIGHT = 1.6;
const BASE_CAMERA_DISTANCE = 4;
const CAMERA_SMOOTHING = 0.05;

export const useDisplay = (radius: number) => {
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
      const volume = getBallVolume(radius);
      displayElement.innerHTML = `Ball Size: ${formatRadius(
        radius
      )} / ${formatVolume(volume)}`;
    }
  }, [radius]);
};

export const useKeyboardSteering = (
  ballRef: RefObject<RapierRigidBody | null>,
  radius: number,
  totalMass: number,
  disable: boolean = false
) => {
  const [_, getState] = useKeyboardControls();
  const { camera } = useThree();

  const rotationAngle = useRef(0);
  const direction = useRef(new THREE.Vector3(0, 0, 1));

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
      ballPosition.x - lookDirection.x * BASE_CAMERA_DISTANCE * (0.5 + radius),
      ballPosition.y + BASE_CAMERA_HEIGHT * (0.5 + radius),
      ballPosition.z - lookDirection.z * BASE_CAMERA_DISTANCE * (0.5 + radius)
    );

    const targetLookAt = new THREE.Vector3(
      ballPosition.x + lookDirection.x,
      ballPosition.y,
      ballPosition.z + lookDirection.z
    );

    if (!disable) {
      camera.position.lerp(targetCameraPos, CAMERA_SMOOTHING);
      camera.lookAt(targetLookAt);
    }
    // useframe
  });
};

export const formatRadius = (radius: number) => {
  return (radius * 2).toFixed(1) + "m";
};

export const formatVolume = (volume: number) => {
  return volume.toFixed(1) + "m³";
};

export const isBiggerThanObj = (userData: UserData, radius: number) => {
  const ballVolume = getBallVolume(radius);
  const isBiggerVolume = userData.volume < ballVolume / 8;
  const isBiggerSize = userData.size < radius * 2;
  console.log(
    { ...userData },
    {
      ballVolume,
      isBiggerSize,
      isBiggerVolume,
    }
  );
  return isBiggerVolume && isBiggerSize;
};

export const getBallVolume = (radius: number) => {
  return (4 / 3) * Math.PI * Math.pow(radius, 3);
};
