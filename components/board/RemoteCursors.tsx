"use client";

import { useOthers } from "@liveblocks/react/suspense";
import type { ViewportTransform } from "@/lib/board/viewport";
import { worldToScreen } from "@/lib/board/viewport";

type CursorView = {
  key: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

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
    .filter(Boolean) as CursorView[];

  return (
    <div className="board-cursor-layer" aria-hidden="true">
      {cursors.map((cursor) => (
        <div
          className="board-cursor"
          data-cursor-name={cursor.name}
          data-cursor-screen-x={Math.round(cursor.x)}
          data-cursor-screen-y={Math.round(cursor.y)}
          key={cursor.key}
          style={{
            color: cursor.color,
            transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
          }}
        >
          <svg className="board-cursor-pointer" focusable="false" viewBox="0 0 20 24">
            <path d="M3 2L17 14H10L7 22L3 2Z" fill={cursor.color} stroke="white" strokeWidth="2" />
          </svg>
          <div className="board-cursor-label" data-cursor-name={cursor.name} style={{ borderColor: cursor.color }}>
            <span style={{ background: cursor.color }} />
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  );
}
