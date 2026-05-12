import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBoard, listBoardsForUser } from "@/lib/db/queries";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createBoardSchema = z.object({
  name: z.string().max(120).optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boards = await listBoardsForUser(user.id);
  return NextResponse.json({ boards });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = createBoardSchema.parse(await request.json());
  const board = await createBoard(user, payload.name);
  return NextResponse.json({ board });
}
