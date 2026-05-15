"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { withDuplicatePresenceNames } from "@/lib/board/presenceNames";
import type { ViewportTransform } from "@/lib/board/viewport";
import { worldToScreen } from "@/lib/board/viewport";

type CursorView = {
  key: string;
  name: string;
  displayName: string;
  color: string;
  x: number;
  y: number;
  isSelf: boolean;
  cursor: { x: number; y: number } | null;
  cursorState: "idle" | "pressing" | "dragging";
};

export function RemoteCursors({ viewport }: { viewport: ViewportTransform }) {
  const self = useSelf();
  const others = useOthers();
  const cursors = withDuplicatePresenceNames([
    {
      connectionId: self.connectionId,
      key: `self:${self.connectionId}`,
      name: self.presence.name || self.info.name || "Guest",
      color: self.presence.color || self.info.color || "#2563EB",
      cursor: self.presence.cursor,
      cursorState: self.presence.cursorState || "idle",
      isSelf: true,
    },
    ...others.map((other) => ({
      connectionId: other.connectionId,
      key: `other:${other.connectionId}`,
      name: other.presence.name || other.info?.name || "Guest",
      color: other.presence.color || other.info?.color || "#2563EB",
      cursor: other.presence.cursor,
      cursorState: other.presence.cursorState || "idle",
      isSelf: false,
    })),
  ])
    .map((entry) => {
      if (entry.isSelf || !entry.cursor) return null;
      const screen = worldToScreen(entry.cursor, viewport);
      return {
        ...entry,
        x: screen.x,
        y: screen.y,
      };
    })
    .filter(Boolean) as CursorView[];

  return (
    <div className="board-cursor-layer" aria-hidden="true">
      {cursors.map((cursor) => (
        <div
          className={`board-cursor cursor-${cursor.cursorState}`}
          data-cursor-base-name={cursor.name}
          data-cursor-name={cursor.displayName}
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
          <div className="board-cursor-label" data-cursor-name={cursor.displayName} style={{ borderColor: cursor.color }}>
            <span style={{ background: cursor.color }} />
            {cursor.displayName}
          </div>
        </div>
      ))}
    </div>
  );
}
