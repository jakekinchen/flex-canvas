import { redirect } from "next/navigation";
import { FlexCanvasDashboard } from "@/components/home/FlexCanvasDashboard";
import { getEnvStatus } from "@/lib/env";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const env = getEnvStatus();
  const user = env.ok ? await getAuthenticatedUser().catch(() => null) : null;

  if (user) {
    redirect("/boards");
  }

  return (
    <FlexCanvasDashboard
      setupWarning={
        !env.ok ? (
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
