"use client";

import { Arrow, Line } from "react-konva";
import type { BoardObject, ConnectorObject } from "@/lib/board/types";
import { connectorEndpoints } from "@/lib/board/geometry";

export function ConnectorNode({
  object,
  objectsById,
  onSelect,
}: {
  object: ConnectorObject;
  objectsById: Record<string, BoardObject>;
  onSelect: (event: { evt: MouseEvent | TouchEvent }) => void;
}) {
  const { start, end } = connectorEndpoints(object, objectsById);
  const points = [start.x, start.y, end.x, end.y];

  if (object.style === "arrow") {
    return (
      <Arrow
        hitStrokeWidth={16}
        id={object.id}
        onClick={onSelect}
        onTap={onSelect}
        pointerLength={12}
        pointerWidth={12}
        points={points}
        stroke={object.color}
        strokeWidth={3}
      />
    );
  }

  return (
    <Line
      hitStrokeWidth={16}
      id={object.id}
      onClick={onSelect}
      onTap={onSelect}
      points={points}
      stroke={object.color}
      strokeWidth={3}
    />
  );
}
