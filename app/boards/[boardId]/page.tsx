import { notFound, redirect } from "next/navigation";
import { ProfileNameModal } from "@/components/auth/ProfileNameModal";
import { CustomBoard } from "@/components/board/CustomBoard";
import { getEnvStatus } from "@/lib/env";
import { getCustomCanvasEngineFlag } from "@/lib/featureFlags";
import { ensureProfile, getBoardAccess, getBoardById, getProfile } from "@/lib/db/queries";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const customCanvasEngine = getCustomCanvasEngineFlag();
  if (!customCanvasEngine.enabled) {
    return (
      <main className="dashboard-shell">
        <section className="setup-warning">
          <h1>Custom canvas engine disabled</h1>
          <p>The merged React Konva and Liveblocks Storage implementation is controlled by this feature flag.</p>
          <code>{customCanvasEngine.name}=true</code>
        </section>
      </main>
    );
  }

  const env = getEnvStatus();
  if (!env.ok) {
    return (
      <main className="dashboard-shell">
        <section className="setup-warning">
          <h1>Deployment environment incomplete</h1>
          <p>Live board access is blocked until all required variables are configured.</p>
          <code>{env.missing.join(", ")}</code>
        </section>
      </main>
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect(`/login?next=/boards/${boardId}`);

  const board = await getBoardById(boardId);
  if (!board) notFound();

  const access = await getBoardAccess(board, user.id);
  if (!access.canView) redirect("/boards");

  await ensureProfile(user);
  const profile = await getProfile(user.id);

  return (
    <>
      <CustomBoard
        boardId={board.id}
        roomId={board.room_id}
        boardName={board.name}
        canEdit={access.canEdit}
      />
      {!profile?.display_name ? <ProfileNameModal initialName={profile?.display_name} /> : null}
    </>
  );
}
