"use client";

import { useOthers, useSelf, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { BoardContextInput } from "@/lib/board/types";
import { withDuplicatePresenceNames } from "@/lib/board/presenceNames";

type CommandMode = "openai";

type CommandStatus = {
  message: string;
  mode?: CommandMode;
  operationCount?: number;
};

const commandTimeoutMs = 70_000;

const suggestedCommands = [
  "Create a purple circle at position 360, 160",
  "Add a yellow sticky note that says User Research",
  "Create a blue rectangle at position 100, 200",
  "Change the selected sticky note color to green",
  "Move all pink sticky notes to the right side",
  "Arrange selected sticky notes in a grid",
  "Space selected elements evenly",
  "Resize selected frame to fit contents",
  "Create a 2x3 sticky grid for pros and cons",
  "Create a SWOT analysis template",
  "Create a user journey map with 5 stages",
  "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns",
  "Get board state",
];

export function AiCommandPanel({
  boardContext,
  boardId,
  roomId,
  canEdit,
}: {
  boardContext: BoardContextInput;
  boardId: string;
  roomId: string;
  canEdit: boolean;
}) {
  const self = useSelf();
  const others = useOthers();
  const updateMyPresence = useUpdateMyPresence();
  const [command, setCommand] = useState(suggestedCommands[0]);
  const [status, setStatus] = useState<CommandStatus | null>(null);
  const [pending, setPending] = useState(false);
  const activeAiCommands = useMemo(
    () =>
      withDuplicatePresenceNames([
        {
          activeAiCommand: self.presence.activeAiCommand,
          color: self.presence.color || self.info.color || "#2563EB",
          connectionId: self.connectionId,
          key: `self:${self.connectionId}`,
          name: self.presence.name || self.info.name || "You",
          suffix: "you",
        },
        ...others.map((other) => ({
          activeAiCommand: other.presence.activeAiCommand,
          color: other.presence.color || other.info?.color || "#2563EB",
          connectionId: other.connectionId,
          key: `other:${other.connectionId}`,
          name: other.presence.name || other.info?.name || "Guest",
          suffix: null,
        })),
      ]).filter((person) => person.activeAiCommand),
    [
      others,
      self.connectionId,
      self.info.color,
      self.info.name,
      self.presence.activeAiCommand,
      self.presence.color,
      self.presence.name,
    ],
  );

  useEffect(() => {
    return () => updateMyPresence({ activeAiCommand: null });
  }, [updateMyPresence]);

  async function runAiCommand(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const commandText = command.trim();
    if (!canEdit || !commandText) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), commandTimeoutMs);
    const activeAiCommand = {
      id: crypto.randomUUID(),
      command: commandText,
      startedAt: Date.now(),
    };
    setPending(true);
    setStatus(null);
    updateMyPresence({ activeAiCommand });
    try {
      const response = await fetch("/api/ai-command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          boardId,
          roomId,
          command: commandText,
          context: boardContext,
        }),
      });

      const result = await response.json().catch(() => ({ error: "AI command returned an unreadable response." }));
      if (!response.ok) {
        throw new Error(result.error || "AI command failed.");
      }

      setStatus({
        message: result.message || `Applied ${result.operationCount ?? 0} operations.`,
        mode: result.mode,
        operationCount: result.operationCount,
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setStatus({
        message: timedOut
          ? "AI command timed out before the server responded. If changes do not appear, try again."
          : error instanceof Error
            ? error.message
            : "AI command failed.",
      });
    } finally {
      window.clearTimeout(timeoutId);
      updateMyPresence({ activeAiCommand: null });
      setPending(false);
    }
  }

  return (
    <aside className="ai-panel">
      <div className="panel-heading">
        <Sparkles size={18} />
        <h2>AI commands</h2>
      </div>
      <form onSubmit={runAiCommand}>
        <textarea
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          disabled={!canEdit || pending}
          rows={4}
        />
        <button className="ai-submit-button" type="submit" disabled={!canEdit || pending}>
          <span aria-hidden="true" />
          {pending ? "Running" : "Run command"}
        </button>
      </form>
      {activeAiCommands.length ? (
        <div className="ai-activity" aria-label="Running AI commands">
          <strong>Running commands</strong>
          {activeAiCommands.map((person) => (
            <p key={person.key}>
              <span style={{ background: person.color }} />
              <b>{person.displayName}</b>
              <small>{person.activeAiCommand?.command}</small>
            </p>
          ))}
        </div>
      ) : null}
      <div className="command-groups">
        <section className="command-group">
          <h3>Suggested prompts</h3>
          <div className="command-list">
            {suggestedCommands.map((demoCommand) => (
              <button
                aria-pressed={command === demoCommand}
                className={command === demoCommand ? "active" : undefined}
                key={demoCommand}
                type="button"
                onClick={() => {
                  setCommand(demoCommand);
                  setStatus(null);
                }}
                disabled={pending}
                title={demoCommand}
              >
                {demoCommand}
              </button>
            ))}
          </div>
        </section>
      </div>
      {status ? (
        <p className="form-status" data-ai-mode={status.mode}>
          {status.mode ? (
            <span className={`status-chip ${status.mode}`}>AI</span>
          ) : null}
          {status.message}
          {typeof status.operationCount === "number" ? <span className="operation-count">{status.operationCount} ops</span> : null}
        </p>
      ) : null}
    </aside>
  );
}
