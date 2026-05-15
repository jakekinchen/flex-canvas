"use client";

import { ClientSideSuspense, LiveblocksProvider, RoomProvider, useSelf, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useEffect, useMemo, useState } from "react";
import { FlexCanvasLogo } from "@/components/brand/FlexCanvasLogo";
import { AiCommandPanel } from "@/components/board/AiCommandPanel";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { BoardTitleEditor } from "@/components/board/BoardRenameControls";
import { PresenceList } from "@/components/board/PresenceList";
import { ShareBoardButton } from "@/components/board/ShareBoardButton";
import type { Board } from "@/lib/db/queries";
import type { BoardContextInput } from "@/lib/board/types";
import { initialBoardPresence, initialBoardStorage, liveblocksAuthEndpoint } from "@/lib/liveblocks/client";

type CustomBoardProps = {
  boardId: string;
  roomId: string;
  boardName: string;
  shareMode: Board["share_mode"];
  canEdit: boolean;
};

export function CustomBoard(props: CustomBoardProps) {
  return (
    <LiveblocksProvider throttle={16} authEndpoint={liveblocksAuthEndpoint}>
      <RoomProvider id={props.roomId} initialPresence={initialBoardPresence()} initialStorage={initialBoardStorage()}>
        <ClientSideSuspense fallback={<div className="board-loading">Connecting to board...</div>}>
          <BoardSurface {...props} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function BoardSurface({ boardId, roomId, boardName, shareMode, canEdit }: CustomBoardProps) {
  const self = useSelf();
  const updateMyPresence = useUpdateMyPresence();
  const user = useMemo(
    () => ({
      id: self.id,
      name: self.info.name || "Guest",
      color: self.info.color || "#2563EB",
    }),
    [self.id, self.info.color, self.info.name],
  );
  const [boardContext, setBoardContext] = useState<BoardContextInput>({
    viewportBounds: { x: 0, y: 0, width: 1200, height: 800 },
    selectedIds: [],
  });

  useEffect(() => {
    updateMyPresence({
      name: user.name,
      color: user.color,
    });
  }, [updateMyPresence, user.color, user.name]);

  return (
    <div className="board-shell">
      <header className="board-topbar">
        <div className="board-brand">
          <FlexCanvasLogo className="board-brand-logo" />
          <span className="board-title-stack">
            <p>Live board</p>
            <BoardTitleEditor boardId={boardId} canEdit={canEdit} initialName={boardName} />
          </span>
        </div>
        <div className="board-topbar-actions">
          <PresenceList />
          <ShareBoardButton boardName={boardName} shareMode={shareMode} />
        </div>
      </header>
      <main className="board-main">
        <BoardCanvas canEdit={canEdit} onContextChange={setBoardContext} user={user} />
        <AiCommandPanel boardContext={boardContext} boardId={boardId} canEdit={canEdit} roomId={roomId} />
      </main>
    </div>
  );
}
