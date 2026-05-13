"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="profile-sign-out" type="button" onClick={signOut} disabled={pending} aria-label="Sign out">
      <LogOut size={16} />
      <span>{pending ? "Signing out" : "Sign out"}</span>
    </button>
  );
}
