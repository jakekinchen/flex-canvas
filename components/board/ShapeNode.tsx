"use client";

import { Ellipse, Line, Rect } from "react-konva";
import type { ShapeObject } from "@/lib/board/types";

export function ShapeNode({ object }: { object: ShapeObject }) {
  if (object.shapeType === "circle") {
    return (
      <Ellipse
        fill={object.color}
        radiusX={object.width / 2}
        radiusY={object.height / 2}
        stroke="#1f2937"
        strokeWidth={1.5}
        x={object.width / 2}
        y={object.height / 2}
      />
    );
  }

  if (object.shapeType === "line") {
    return <Line lineCap="round" points={[0, 0, object.width, object.height]} stroke={object.color} strokeWidth={4} />;
  }

  return (
    <Rect
      cornerRadius={4}
      fill={object.color}
      height={object.height}
      opacity={0.86}
      stroke="#1f2937"
      strokeWidth={1.5}
      width={object.width}
    />
  );
}
