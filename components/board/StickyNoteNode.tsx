"use client";

import { Rect, Text } from "react-konva";
import type { StickyNoteObject } from "@/lib/board/types";

export function StickyNoteNode({ object }: { object: StickyNoteObject }) {
  return (
    <>
      <Rect
        cornerRadius={6}
        fill={object.color}
        height={object.height}
        shadowBlur={8}
        shadowColor="rgba(15, 23, 42, 0.14)"
        shadowOffsetY={4}
        width={object.width}
      />
      <Text
        fill="#172033"
        fontFamily="Inter, Arial, sans-serif"
        fontSize={16}
        fontStyle="600"
        height={object.height - 24}
        lineHeight={1.25}
        padding={14}
        text={object.text}
        verticalAlign="top"
        width={object.width}
      />
    </>
  );
}
