import { redirect } from "next/navigation";
import { FlexCanvasLogo } from "@/components/brand/FlexCanvasLogo";
import { FlexCanvasDashboard } from "@/components/home/FlexCanvasDashboard";
import { toFlexRecentBoards } from "@/lib/boards/presentation";
import { getEnvStatus } from "@/lib/env";
import { getCustomCanvasEngineFlag } from "@/lib/featureFlags";
import { ensureProfile, listBoardsForUser } from "@/lib/db/queries";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const customCanvasEngine = getCustomCanvasEngineFlag();
  if (!customCanvasEngine.enabled) {
    return (
      <main className="dashboard-shell">
        <section className="setup-warning">
          <FlexCanvasLogo />
          <h1>Custom canvas engine disabled</h1>
          <p>Set the feature flag to keep the merged React Konva and Liveblocks Storage implementation active.</p>
          <code>{customCanvasEngine.name}=true</code>
        </section>
      </main>
    );
  }

  const env = getEnvStatus([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);
  if (!env.ok) {
    return (
      <main className="dashboard-shell">
        <section className="setup-warning">
          <FlexCanvasLogo />
          <h1>Supabase setup required</h1>
          <code>{env.missing.join(", ")}</code>
        </section>
      </main>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/boards");

  const profile = await ensureProfile(user);
  const boards = await listBoardsForUser(user.id);

  return (
    <FlexCanvasDashboard
      activeView="boards"
      account={{
        detail: user.email ?? "Anonymous guest",
        isAuthenticated: true,
        name: profile.display_name,
      }}
      boards={toFlexRecentBoards(boards)}
      canCreate
    />
  );
}
