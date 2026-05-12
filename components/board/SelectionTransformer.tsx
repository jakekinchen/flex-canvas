"use client";

import type Konva from "konva";
import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type { BoardObject, BoardObjectPatch } from "@/lib/board/types";

export function SelectionTransformer({
  objectsById,
  onChange,
  selectedIds,
}: {
  objectsById: Record<string, BoardObject>;
  onChange: (id: string, patch: BoardObjectPatch) => void;
  selectedIds: string[];
}) {
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = transformer?.getStage();
    if (!transformer || !stage) return;

    const nodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter((node): node is Konva.Node => Boolean(node));

    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds]);

  return (
    <Transformer
      boundBoxFunc={(_, nextBox) => {
        if (nextBox.width < 24 || nextBox.height < 24) return _;
        return nextBox;
      }}
      onTransformEnd={() => {
        const transformer = transformerRef.current;
        if (!transformer) return;

        for (const node of transformer.nodes()) {
          const object = objectsById[node.id()];
          if (!object || object.type === "connector") continue;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const width = Math.max(24, object.width * scaleX);
          const height = Math.max(24, object.height * scaleY);
          node.scaleX(1);
          node.scaleY(1);
          onChange(object.id, {
            height,
            rotation: node.rotation(),
            width,
            x: node.x(),
            y: node.y(),
          });
        }
      }}
      ref={transformerRef}
      rotateEnabled
    />
  );
}
