import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getEnvStatus } from "@/lib/env";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const env = getEnvStatus([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  if (!env.ok) {
    return (
      <main className="auth-shell">
        <section className="setup-warning">
          <h1>Supabase setup required</h1>
          <p>Configure these variables before using auth:</p>
          <code>{env.missing.join(", ")}</code>
        </section>
      </main>
    );
  }

  const user = await getAuthenticatedUser().catch(() => null);
  if (user) redirect("/boards");

  return (
    <main className="auth-shell">
      <section>
        <p className="eyebrow">Supabase Auth</p>
        <h1>Join Flex Canvas</h1>
        <LoginForm />
      </section>
    </main>
  );
}
