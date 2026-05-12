import type { BoardObject, BoardPoint } from "@/lib/board/types";

export function objectCenter(object: BoardObject): BoardPoint {
  if (object.type === "connector" && object.start && object.end) {
    return {
      x: (object.start.x + object.end.x) / 2,
      y: (object.start.y + object.end.y) / 2,
    };
  }

  return {
    x: object.x + object.width / 2,
    y: object.y + object.height / 2,
  };
}

export function connectorEndpoints(
  connector: Extract<BoardObject, { type: "connector" }>,
  objectsById: Record<string, BoardObject>,
): { start: BoardPoint; end: BoardPoint } {
  const from = connector.fromId ? objectsById[connector.fromId] : undefined;
  const to = connector.toId ? objectsById[connector.toId] : undefined;

  return {
    start: from ? objectCenter(from) : connector.start ?? { x: connector.x, y: connector.y },
    end: to
      ? objectCenter(to)
      : connector.end ?? {
          x: connector.x + connector.width,
          y: connector.y + connector.height,
        },
  };
}

export function isObjectInBounds(
  object: BoardObject,
  bounds: { x: number; y: number; width: number; height: number },
) {
  return (
    object.x + object.width >= bounds.x &&
    object.x <= bounds.x + bounds.width &&
    object.y + object.height >= bounds.y &&
    object.y <= bounds.y + bounds.height
  );
}

export function sortByZIndex(objects: BoardObject[]) {
  return [...objects].sort((a, b) => a.zIndex - b.zIndex || a.createdAt - b.createdAt);
}
