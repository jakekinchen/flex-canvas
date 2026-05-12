"use client";

import { Rect, Text } from "react-konva";
import type { FrameObject } from "@/lib/board/types";

export function FrameNode({ object }: { object: FrameObject }) {
  return (
    <>
      <Rect
        dash={[10, 8]}
        fill="rgba(255,255,255,0.18)"
        height={object.height}
        stroke={object.color}
        strokeWidth={2}
        width={object.width}
      />
      <Text
        fill={object.color}
        fontFamily="Inter, Arial, sans-serif"
        fontSize={18}
        fontStyle="700"
        height={30}
        padding={8}
        text={object.title}
        width={object.width}
      />
    </>
  );
}
