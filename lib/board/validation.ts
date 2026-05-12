import type { BoardOperation } from "@/lib/ai/schema";
import { validateOperations } from "@/lib/ai/schema";

const coordinateLimit = 100_000;
const dimensionLimit = 4_000;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clampCoordinate(value: number) {
  return clamp(value, -coordinateLimit, coordinateLimit);
}

function clampDimension(value: number, fallback = 1) {
  return clamp(Number.isFinite(value) ? value : fallback, 1, dimensionLimit);
}

export function sanitizeBoardOperations(rawOperations: unknown): BoardOperation[] {
  if (!Array.isArray(rawOperations)) {
    throw new Error("AI response did not include an operation array.");
  }

  return validateOperations(rawOperations).map((operation) => {
    switch (operation.type) {
      case "createStickyNote":
        return {
          ...operation,
          x: clampCoordinate(operation.x),
          y: clampCoordinate(operation.y),
          width: operation.width ? clampDimension(operation.width, 180) : undefined,
          height: operation.height ? clampDimension(operation.height, 150) : undefined,
        };
      case "createShape":
      case "createFrame":
        return {
          ...operation,
          x: clampCoordinate(operation.x),
          y: clampCoordinate(operation.y),
          width: clampDimension(operation.width),
          height: clampDimension(operation.height),
        };
      case "createText":
        return {
          ...operation,
          x: clampCoordinate(operation.x),
          y: clampCoordinate(operation.y),
          fontSize: operation.fontSize ? clampDimension(operation.fontSize, 24) : undefined,
        };
      case "createConnector":
        return {
          ...operation,
          start: operation.start
            ? { x: clampCoordinate(operation.start.x), y: clampCoordinate(operation.start.y) }
            : undefined,
          end: operation.end
            ? { x: clampCoordinate(operation.end.x), y: clampCoordinate(operation.end.y) }
            : undefined,
        };
      case "moveObject":
        return {
          ...operation,
          x: clampCoordinate(operation.x),
          y: clampCoordinate(operation.y),
        };
      case "resizeObject":
        return {
          ...operation,
          width: clampDimension(operation.width),
          height: clampDimension(operation.height),
        };
      case "updateText":
      case "changeColor":
      case "deleteObject":
        return operation;
    }
  });
}

export const validateClientOperations = sanitizeBoardOperations;
