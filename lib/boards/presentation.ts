import type { Board } from "@/lib/db/queries";

export type FlexRecentBoard = {
  collaborators?: number;
  href?: string;
  id: string;
  name: string;
  updatedLabel: string;
};

export function toFlexRecentBoards(boards: Board[]): FlexRecentBoard[] {
  return boards.map((board, index) => ({
    collaborators: 1 + (index % 3),
    href: `/boards/${board.id}`,
    id: board.id,
    name: board.name,
    updatedLabel: relativeUpdateLabel(board.updated_at),
  }));
}

function relativeUpdateLabel(value: string) {
  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) return `Edited ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Edited ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Edited ${days}d ago`;
}
