import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureProfile, getBoardAccess, getBoardByRoomId } from "@/lib/db/queries";
import { createLiveblocksServerClient } from "@/lib/liveblocks/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const liveblocksAuthSchema = z.object({
  room: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = liveblocksAuthSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing Liveblocks room" }, { status: 400 });
  }

  const board = await getBoardByRoomId(parsed.data.room);
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  const access = await getBoardAccess(board, user.id);
  if (!access.canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await ensureProfile(user);
  const liveblocks = createLiveblocksServerClient();
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: profile.display_name,
      color: profile.color,
      avatar: profile.avatar_url ?? "",
    },
  });

  session.allow(parsed.data.room, access.canEdit ? session.FULL_ACCESS : session.READ_ACCESS);
  const { status, body } = await session.authorize();
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}
