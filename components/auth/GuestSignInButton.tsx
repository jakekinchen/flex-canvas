"use client";

import { createClient } from "@/lib/supabase/client";

export function GuestSignInButton({ displayName }: { displayName: string }) {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInAnonymously({
      options: { data: { display_name: displayName || "Guest" } },
    });
  }

  return (
    <button type="button" onClick={signIn}>
      Continue as guest
    </button>
  );
}
