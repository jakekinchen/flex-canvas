"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/boards";
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset-password");
        setStatus("Enter a new password to finish account recovery.");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

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

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStatus(null);
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
      const { data, error } =
        mode === "sign-up"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { display_name: displayName || email.split("@")[0] || "Guest" },
                emailRedirectTo: `${window.location.origin}${redirectTo}`,
              },
            })
          : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) {
        setStatus("Check your email to confirm the account, then sign in.");
        return;
      }
      if (data.user) await saveProfile(data.user.id, displayName || email.split("@")[0] || "Guest");
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : mode === "sign-up" ? "Sign-up failed." : "Email login failed.");
    } finally {
      setPending(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(redirectTo)}`,
      });
      if (error) throw error;
      setStatus("Password reset email sent. Follow the link in your inbox.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Password reset request failed.");
    } finally {
      setPending(false);
    }
  }

  async function updateRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setStatus("Password updated. Redirecting to your boards...");
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Password update failed.");
    } finally {
      setPending(false);
    }
  }

  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";
  const isSignUp = mode === "sign-up";
  const emailFieldId = isForgotPassword ? "password-reset-email" : isSignUp ? "sign-up-email" : "sign-in-email";
  const emailAutoComplete = isForgotPassword ? "email" : "username";
  const passwordFieldId = isSignUp ? "sign-up-password" : "sign-in-password";
  const passwordAutoComplete = isSignUp ? "new-password" : "current-password";

  return (
    <div className="auth-panel">
      {!isResetPassword ? (
        <>
          {!isForgotPassword ? (
            <>
              <label>
                Display name
                <input
                  id="auth-display-name"
                  name="name"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your board label"
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
              <button type="button" onClick={continueAsGuest} disabled={pending}>
                Continue as guest
              </button>
            </>
          ) : null}
          <form onSubmit={isForgotPassword ? requestPasswordReset : loginWithEmail} className="email-login" method="post">
            <label>
              Email
              <input
                id={emailFieldId}
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete={emailAutoComplete}
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>
            {!isForgotPassword ? (
              <label>
                Password
                <input
                  key={passwordFieldId}
                  id={passwordFieldId}
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete={passwordAutoComplete}
                  minLength={6}
                  required
                />
              </label>
            ) : null}
            <button type="submit" disabled={pending || !email || (!isForgotPassword && !password)}>
              {isForgotPassword ? "Send reset email" : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>
          <div className="auth-switcher" aria-label="Authentication options">
            <button type="button" onClick={() => switchMode(isSignUp ? "sign-in" : "sign-up")} disabled={pending}>
              {isSignUp ? "Use existing account" : "Create account"}
            </button>
            <button type="button" onClick={() => switchMode(isForgotPassword ? "sign-in" : "forgot-password")} disabled={pending}>
              {isForgotPassword ? "Back to sign in" : "Forgot password?"}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={updateRecoveredPassword} className="email-login" method="post">
          <label>
            New password
            <input
              id="recovered-new-password"
              name="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <button type="submit" disabled={pending || newPassword.length < 6}>
            Update password
          </button>
        </form>
      )}
      {status ? <p className="form-status">{status}</p> : null}
    </div>
  );
}
