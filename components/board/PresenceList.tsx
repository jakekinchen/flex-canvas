"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { withDuplicatePresenceNames } from "@/lib/board/presenceNames";

export function PresenceList() {
  const self = useSelf();
  const others = useOthers();
  const people = withDuplicatePresenceNames([
    {
      connectionId: self.connectionId,
      key: `self:${self.connectionId}`,
      name: self.presence.name || self.info.name || "You",
      color: self.presence.color || self.info.color || "#2563EB",
      suffix: "you",
    },
    ...others.map((other) => ({
      connectionId: other.connectionId,
      key: `other:${other.connectionId}`,
      name: other.presence.name || other.info?.name || "Guest",
      color: other.presence.color || other.info?.color || "#2563EB",
      suffix: null,
    })),
  ]);

  return (
    <div className="presence-list" aria-label="Online collaborators">
      {people.map((person) => (
        <span
          className="presence-pill"
          data-presence-base-name={person.name}
          data-presence-name={person.displayName}
          key={person.key}
          title={person.displayName}
        >
          <span style={{ background: person.color }} />
          {person.displayName}
          {person.suffix ? <small>{person.suffix}</small> : null}
        </span>
      ))}
    </div>
  );
}
