"use client";

import { Text } from "react-konva";
import type { TextObject } from "@/lib/board/types";

export function TextNode({ object }: { object: TextObject }) {
  return (
    <Text
      fill={object.color}
      fontFamily="Inter, Arial, sans-serif"
      fontSize={object.fontSize}
      fontStyle="600"
      height={object.height}
      text={object.text}
      width={object.width}
    />
  );
}
