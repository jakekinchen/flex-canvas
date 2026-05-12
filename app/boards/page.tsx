import { redirect } from "next/navigation";
import { FlexCanvasDashboard, type FlexRecentBoard } from "@/components/home/FlexCanvasDashboard";
import { getEnvStatus } from "@/lib/env";
import { ensureProfile, listBoardsForUser } from "@/lib/db/queries";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const env = getEnvStatus([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);
  if (!env.ok) {
    return (
      <main className="dashboard-shell">
        <section className="setup-warning">
          <h1>Supabase setup required</h1>
          <code>{env.missing.join(", ")}</code>
        </section>
      </main>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/boards");

  await ensureProfile(user);
  const boards = await listBoardsForUser(user.id);

  const recentBoards: FlexRecentBoard[] = boards.map((board, index) => ({
    collaborators: 3 + (index % 3),
    href: `/boards/${board.id}`,
    id: board.id,
    name: board.name,
    updatedLabel: relativeUpdateLabel(board.updated_at),
  }));

  return <FlexCanvasDashboard boards={recentBoards} canCreate />;
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
