import type { LiveMap, LiveObject } from "@liveblocks/client";
import type { BoardObject, Presence } from "@/lib/board/types";

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: {
      objects: LiveMap<string, LiveObject<BoardObject>>;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };
  }
}

export {};
