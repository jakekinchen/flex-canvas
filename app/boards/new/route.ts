import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { buildExampleBoardOperations, getExampleBoardTemplate } from "@/lib/boards/examples";
import { createBoard } from "@/lib/db/queries";
import { applyBoardOperationsServer } from "@/lib/liveblocks/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/boards");

  const form = await request.formData();
  const template = getExampleBoardTemplate(form.get("template"));
  const name = String(form.get("name") || template?.name || "Untitled board");
  const board = await createBoard(user, name);
  if (template) {
    await applyBoardOperationsServer(board.room_id, buildExampleBoardOperations(template.id), user.id);
  }
  redirect(`/boards/${board.id}`);
}
