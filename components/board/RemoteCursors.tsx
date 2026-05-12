"use client";

import { useOthers } from "@liveblocks/react/suspense";
import type { ViewportTransform } from "@/lib/board/viewport";
import { worldToScreen } from "@/lib/board/viewport";

export function RemoteCursors({ viewport }: { viewport: ViewportTransform }) {
  const others = useOthers();
  const cursors = others
    .map((other) => {
      if (!other.presence.cursor) return null;
      const screen = worldToScreen(other.presence.cursor, viewport);
      return {
        key: `${other.connectionId}:${other.id}`,
        name: other.presence.name || other.info?.name || "Guest",
        color: other.presence.color || other.info?.color || "#2563EB",
        x: screen.x,
        y: screen.y,
      };
    })
    .filter(Boolean) as { key: string; name: string; color: string; x: number; y: number }[];

  return (
    <div className="board-cursor-layer" aria-hidden="true">
      {cursors.map((cursor) => (
        <div
          className="board-cursor-label"
          data-cursor-name={cursor.name}
          key={cursor.key}
          style={{
            borderColor: cursor.color,
            color: cursor.color,
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
          }}
        >
          <span style={{ background: cursor.color }} />
          {cursor.name}
        </div>
      ))}
    </div>
  );
}
