"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/boards";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveProfile(userId: string, name: string) {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name || "Guest" }),
    });

    if (!response.ok) {
      throw new Error(`Could not save profile for ${userId}`);
    }
  }

  async function continueAsGuest() {
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { display_name: displayName || "Guest" } },
      });
      if (error) throw error;
      if (data.user) await saveProfile(data.user.id, displayName || "Guest");
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Guest sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  async function loginWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await saveProfile(data.user.id, displayName || email.split("@")[0] || "Guest");
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Email login failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-panel">
      <label>
        Display name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Your board label"
          maxLength={80}
        />
      </label>
      <button type="button" onClick={continueAsGuest} disabled={pending}>
        Continue as guest
      </button>
      <form onSubmit={loginWithEmail} className="email-login">
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={pending || !email || !password}>
          Sign in
        </button>
      </form>
      {status ? <p className="form-status">{status}</p> : null}
    </div>
  );
}
