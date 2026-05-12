"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileNameModal({ initialName }: { initialName?: string | null }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!response.ok) throw new Error(await response.text());
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="profile-modal" onSubmit={save}>
        <h2>Set display name</h2>
        <label>
          Name
          <input
            autoFocus
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
          />
        </label>
        <button disabled={pending || !displayName.trim()} type="submit">
          Save
        </button>
        {error ? <p className="form-status">{error}</p> : null}
      </form>
    </div>
  );
}
