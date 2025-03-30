import { RefObject } from "react";
import { CollectibleObject } from "../Game";
import { LetterShape } from "./Letter";
import { ModelShape } from "./ModelObject";

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
          const { char, fontSize = 1, color = "white" } = object;

          return (
            <LetterShape
              key={`collected-${id}`}
              char={char || ""}
              fontSize={fontSize}
              color={color || "white"}
              depth={geometry[2] / fontSize}
              position={[position.x, position.y, position.z]}
              quaternion={rotation}
            />
          );
        }

        if (type === "model") {
          const { modelPath, scale } = object;

          return (
            <ModelShape
              key={`collected-${id}`}
              modelPath={modelPath ?? ""}
              scale={scale}
              position={[position.x, position.y, position.z]}
              quaternion={rotation}
            />
          );
        }

        return (
          <group
            key={`collected-${id}`}
            position={[position.x, position.y, position.z]}
          >
            <mesh position={[0, 0, 0]} quaternion={rotation} castShadow>
              <boxGeometry args={geometry} />
              <meshStandardMaterial color="orange" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
