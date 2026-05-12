"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";

export function BoardPresence() {
  const self = useSelf();
  const others = useOthers();
  const users = [
    self
      ? { key: `self:${self.connectionId ?? self.id}`, name: self.info.name, color: self.info.color }
      : null,
    ...others.map((other) => ({
      key: `other:${other.connectionId}`,
      name: other.info?.name ?? "Guest",
      color: other.info?.color ?? "#6B7280",
    })),
  ].filter(Boolean) as { key: string; name: string; color: string }[];

  return (
    <div className="presence-list" aria-label="People online">
      {users.map((user) => (
        <div className="presence-pill" key={user.key} title={user.name}>
          <span style={{ background: user.color }} />
          {user.name}
        </div>
      ))}
    </div>
  );
}
