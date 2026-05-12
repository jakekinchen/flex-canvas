"use client";

import type { KonvaEventObject } from "konva/lib/Node";
import type React from "react";
import { useRef } from "react";
import { Group } from "react-konva";
import { ConnectorNode } from "@/components/board/ConnectorNode";
import { FrameNode } from "@/components/board/FrameNode";
import { ShapeNode } from "@/components/board/ShapeNode";
import { StickyNoteNode } from "@/components/board/StickyNoteNode";
import { TextNode } from "@/components/board/TextNode";
import type { BoardObject, BoardObjectPatch } from "@/lib/board/types";

export function BoardObjectRenderer({
  canEdit,
  object,
  objectsById,
  onChange,
  onSelect,
  onStartEdit,
}: {
  canEdit: boolean;
  object: BoardObject;
  objectsById: Record<string, BoardObject>;
  onChange: (id: string, patch: BoardObjectPatch) => void;
  onSelect: (id: string, additive: boolean) => void;
  onStartEdit: (id: string) => void;
}) {
  const lastDragUpdateAt = useRef(0);

  function handleSelect(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    event.cancelBubble = true;
    onSelect(object.id, "shiftKey" in event.evt ? event.evt.shiftKey : false);
  }

  if (object.type === "connector") {
    return (
      <ConnectorNode
        object={object}
        objectsById={objectsById}
        onSelect={(event) => onSelect(object.id, "shiftKey" in event.evt ? event.evt.shiftKey : false)}
      />
    );
  }

  let child: React.ReactNode = null;
  if (object.type === "sticky") child = <StickyNoteNode object={object} />;
  if (object.type === "shape") child = <ShapeNode object={object} />;
  if (object.type === "text") child = <TextNode object={object} />;
  if (object.type === "frame") child = <FrameNode object={object} />;

  return (
    <Group
      draggable={canEdit}
      id={object.id}
      name="board-object-node"
      onClick={handleSelect}
      onDblClick={() => {
        if (object.type === "sticky" || object.type === "text" || object.type === "frame") onStartEdit(object.id);
      }}
      onDragEnd={(event) => onChange(object.id, { x: event.target.x(), y: event.target.y() })}
      onDragMove={(event) => {
        const now = performance.now();
        if (now - lastDragUpdateAt.current < 50) return;
        lastDragUpdateAt.current = now;
        onChange(object.id, { x: event.target.x(), y: event.target.y() });
      }}
      onTap={handleSelect}
      rotation={object.rotation}
      x={object.x}
      y={object.y}
    >
      {child}
    </Group>
  );
}
