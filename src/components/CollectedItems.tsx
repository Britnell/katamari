import { RefObject } from "react";
import { CollectibleObject } from "../Game";
import { LetterShape } from "./Letter";
import { ModelShape } from "./ModelObject";
import { BoxShape } from "../Box";

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
            initialRotation,
          } = object;

          return (
            <group
              key={`collected-${id}`}
              position={[position.x, position.y, position.z]}
              quaternion={rotation}
            >
              <LetterShape
                char={char || ""}
                fontSize={fontSize}
                color={color || "white"}
                depth={geometry[2] / fontSize}
                rotation={initialRotation}
              />
            </group>
          );
        }

        if (type === "model") {
          const { modelPath, scale, initialRotation, center } = object;
          return (
            <group
              key={`collected-${id}`}
              position={center}
              quaternion={rotation}
            >
              <ModelShape
                modelPath={modelPath ?? ""}
                rotation={initialRotation || undefined}
                scale={scale}
              />
            </group>
          );
        }

        if (type === "box") {
          const { width, height, depth, color, initialRotation } = object;
          return (
            <group
              key={`collected-${id}`}
              position={[position.x, position.y, position.z]}
              quaternion={rotation}
            >
              <BoxShape
                width={width}
                height={height}
                depth={depth}
                color={color}
                rotation={initialRotation}
              />
            </group>
          );
        }

        return null;
      })}
    </>
  );
}
