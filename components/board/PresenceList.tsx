"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";

export function PresenceList() {
  const self = useSelf();
  const others = useOthers();
  const people = [
    {
      key: `self:${self.connectionId}`,
      name: self.presence.name || self.info.name || "You",
      color: self.presence.color || self.info.color || "#2563EB",
      suffix: "you",
    },
    ...others.map((other) => ({
      key: `other:${other.connectionId}`,
      name: other.presence.name || other.info?.name || "Guest",
      color: other.presence.color || other.info?.color || "#2563EB",
      suffix: null,
    })),
  ];

  return (
    <div className="presence-list" aria-label="Online collaborators">
      {people.map((person) => (
        <span className="presence-pill" key={person.key} title={person.name}>
          <span style={{ background: person.color }} />
          {person.name}
          {person.suffix ? <small>{person.suffix}</small> : null}
        </span>
      ))}
    </div>
  );
}
