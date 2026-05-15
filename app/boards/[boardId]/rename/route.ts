import { NextRequest, NextResponse } from "next/server";
import { getBoardAccess, getBoardById, updateBoardName } from "@/lib/db/queries";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const redirectUrl = new URL(request.headers.get("referer") ?? "/boards", request.url);
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/boards", request.url));

  const { boardId } = await params;
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) return NextResponse.redirect(redirectUrl);

  const board = await getBoardById(boardId);
  if (!board) return NextResponse.redirect(new URL("/boards", request.url));

  const access = await getBoardAccess(board, user.id);
  if (!access.canEdit) return NextResponse.redirect(redirectUrl);

  await updateBoardName(board.id, name);
  return NextResponse.redirect(redirectUrl);
}
