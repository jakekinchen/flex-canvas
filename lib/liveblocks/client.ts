"use client";

import { LiveMap } from "@liveblocks/client";
import type { LiveObject } from "@liveblocks/client";
import type { BoardObject, Presence } from "@/lib/board/types";

export function liveblocksAuthEndpoint(room?: string) {
  return fetch("/api/liveblocks-auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ room }),
  }).then(async (response) => {
    if (!response.ok) {
      return { error: "forbidden", reason: await response.text() };
    }
    return response.json();
  });
}

export function initialBoardStorage() {
  return {
    objects: new LiveMap<string, LiveObject<BoardObject>>(),
  };
}

export function initialBoardPresence(): Presence {
  return {
    cursor: null,
    cursorState: "idle",
    selectedIds: [],
    name: "",
    color: "#2563EB",
    activeAiCommand: null,
  };
}
