import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBoardAccess, getBoardById, updateBoardName } from "@/lib/db/queries";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const updateBoardSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { boardId } = await params;
  const parsed = updateBoardSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Board name must be 1 to 120 characters." }, { status: 400 });
  }

  const board = await getBoardById(boardId);
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  const access = await getBoardAccess(board, user.id);
  if (!access.canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updatedBoard = await updateBoardName(board.id, parsed.data.name);
  return NextResponse.json({ board: updatedBoard });
}
