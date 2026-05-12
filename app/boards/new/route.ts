import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createBoard } from "@/lib/db/queries";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/boards");

  const form = await request.formData();
  const name = String(form.get("name") || "Untitled board");
  const board = await createBoard(user, name);
  redirect(`/boards/${board.id}`);
}
