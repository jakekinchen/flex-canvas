import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateProfile } from "@/lib/db/queries";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  displayName: z.string().min(1).max(80),
});

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = profileSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const profile = await updateProfile(user, payload.data.displayName);
  return NextResponse.json({ profile });
}
