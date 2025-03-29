import { RefObject } from "react";
import { CollectibleObject } from "../Game";
import { LetterShape } from "./Letter";

interface CollectedItemsProps {
  collectedObjects: RefObject<Map<string, CollectibleObject>>;
}

export function CollectedItems({ collectedObjects }: CollectedItemsProps) {
  if (!collectedObjects.current) return null;

  return (
    <>
      {Array.from(collectedObjects.current.entries()).map(([id, object]) => {
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
      })}
    </>
  );
}
