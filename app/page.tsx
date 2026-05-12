import { redirect } from "next/navigation";
import { FlexCanvasDashboard } from "@/components/home/FlexCanvasDashboard";
import { getEnvStatus } from "@/lib/env";
import { getCustomCanvasEngineFlag } from "@/lib/featureFlags";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const env = getEnvStatus();
  const customCanvasEngine = getCustomCanvasEngineFlag();
  const user = env.ok && customCanvasEngine.enabled ? await getAuthenticatedUser().catch(() => null) : null;

  if (user) {
    redirect("/boards");
  }

  return (
    <FlexCanvasDashboard
      setupWarning={
        !customCanvasEngine.enabled ? (
        <section className="setup-warning">
          <h2>Custom canvas engine disabled</h2>
          <p>The merged React Konva and Liveblocks Storage implementation is controlled by this feature flag:</p>
          <code>{customCanvasEngine.name}=true</code>
        </section>
        ) : !env.ok ? (
        <section className="setup-warning">
          <h2>Environment setup required</h2>
          <p>Production and live collaboration are blocked until these variables are configured:</p>
          <code>{env.missing.join(", ")}</code>
        </section>
        ) : null
      }
    />
  );
}
