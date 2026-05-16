import type { BoardOperation, CompactShape } from "@/lib/ai/schema";
import { isObjectInBounds } from "@/lib/board/geometry";
import type { BoardContextInput, BoardObject, BoardPoint } from "@/lib/board/types";

const colorPalette: Record<string, string> = {
  black: "#111827",
  blue: "#60a5fa",
  gray: "#d1d5db",
  grey: "#d1d5db",
  green: "#86efac",
  orange: "#fdba74",
  pink: "#f9a8d4",
  purple: "#c4b5fd",
  red: "#fca5a5",
  white: "#ffffff",
  yellow: "#fde68a",
};

export function boardColor(input: string | undefined, fallback = "#60a5fa") {
  if (!input) return fallback;
  return colorPalette[input.toLowerCase()] ?? input;
}

export function createObjectId(prefix = "obj") {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function nextZIndex(objects: Iterable<BoardObject>) {
  let max = 0;
  for (const object of objects) max = Math.max(max, object.zIndex);
  return max + 1;
}

function baseObject(
  operation: Pick<BoardOperation, "type">,
  actorUserId: string,
  now: number,
  zIndex: number,
  geometry: { x: number; y: number; width: number; height: number; color: string },
): Omit<BoardObject, "type"> {
  return {
    id: createObjectId(operation.type),
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    rotation: 0,
    color: geometry.color,
    zIndex,
    createdAt: now,
    updatedAt: now,
    updatedBy: actorUserId,
  };
}

export function objectFromOperation(
  operation: BoardOperation,
  actorUserId: string,
  zIndex: number,
  now = Date.now(),
): BoardObject | null {
  switch (operation.type) {
    case "createStickyNote":
      return {
        ...baseObject(operation, actorUserId, now, zIndex, {
          x: operation.x,
          y: operation.y,
          width: operation.width ?? 180,
          height: operation.height ?? 150,
          color: boardColor(operation.color, "#fde68a"),
        }),
        type: "sticky",
        text: operation.text,
      };
    case "createShape":
      return {
        ...baseObject(operation, actorUserId, now, zIndex, {
          x: operation.x,
          y: operation.y,
          width: operation.width,
          height: operation.height,
          color: boardColor(operation.color, "#60a5fa"),
        }),
        type: "shape",
        shapeType: operation.shapeType,
      };
    case "createText":
      return {
        ...baseObject(operation, actorUserId, now, zIndex, {
          x: operation.x,
          y: operation.y,
          width: Math.max(180, operation.text.length * 9),
          height: Math.max(40, operation.fontSize ?? 24),
          color: "#111827",
        }),
        type: "text",
        text: operation.text,
        fontSize: operation.fontSize ?? 24,
      };
    case "createFrame":
      return {
        ...baseObject(operation, actorUserId, now, zIndex, {
          x: operation.x,
          y: operation.y,
          width: operation.width,
          height: operation.height,
          color: "#2563eb",
        }),
        type: "frame",
        title: operation.title,
      };
    case "createConnector": {
      const start = operation.start ?? ({ x: 0, y: 0 } satisfies BoardPoint);
      const end = operation.end ?? ({ x: start.x + 220, y: start.y } satisfies BoardPoint);
      return {
        ...baseObject(operation, actorUserId, now, zIndex, {
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.max(1, Math.abs(end.x - start.x)),
          height: Math.max(1, Math.abs(end.y - start.y)),
          color: "#111827",
        }),
        type: "connector",
        fromId: operation.fromId,
        toId: operation.toId,
        start,
        end,
        style: operation.style,
      };
    }
    default:
      return null;
  }
}

export function compactShapeFromObject(object: BoardObject): CompactShape {
  return {
    id: object.id,
    type: object.type,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    color: object.color,
    text:
      object.type === "sticky" || object.type === "text"
        ? object.text
        : object.type === "frame"
          ? object.title
          : undefined,
  };
}

export function buildCompactBoardContextFromObjects(objects: BoardObject[], input: BoardContextInput) {
  const selectedIdSet = new Set(input.selectedIds);
  const typeCounts = objects.reduce<Record<string, number>>((counts, object) => {
    counts[object.type] = (counts[object.type] ?? 0) + 1;
    return counts;
  }, {});
  const selectedShapes = objects.filter((object) => selectedIdSet.has(object.id)).map(compactShapeFromObject);
  const viewportShapes = objects
    .filter((object) => isObjectInBounds(object, input.viewportBounds))
    .slice(0, 80)
    .map(compactShapeFromObject);
  const candidateShapes = objects
    .filter((object) => selectedIdSet.has(object.id) || object.type === "sticky")
    .slice(0, 80)
    .map(compactShapeFromObject);

  return {
    objectTypeCounts: typeCounts,
    totalObjectCount: objects.length,
    viewportBounds: input.viewportBounds,
    selectedShapes,
    viewportShapes,
    candidateShapes,
  };
}
