"use client";

import { Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import type { BoardContextInput } from "@/lib/board/types";

type CommandMode = "openai";

type CommandStatus = {
  message: string;
  mode?: CommandMode;
  operationCount?: number;
};

const commandGroups: Array<{ label: string; commands: string[] }> = [
  {
    label: "Live AI",
    commands: ["Create a purple circle at position 360, 160"],
  },
  {
    label: "Suggested prompts",
    commands: [
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
    ],
  },
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
  const [command, setCommand] = useState(commandGroups[0].commands[0]);
  const [status, setStatus] = useState<CommandStatus | null>(null);
  const [pending, setPending] = useState(false);

  async function runAiCommand(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!canEdit || !command.trim()) return;

    setPending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/ai-command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          boardId,
          roomId,
          command,
          context: boardContext,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "AI command failed.");
      }

      setStatus({
        message: result.message || `Applied ${result.operationCount ?? 0} operations.`,
        mode: result.mode,
        operationCount: result.operationCount,
      });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "AI command failed." });
    } finally {
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
      <div className="command-groups">
        {commandGroups.map((group) => (
          <section className="command-group" key={group.label}>
            <h3>{group.label}</h3>
            <div className="command-list">
              {group.commands.map((demoCommand) => (
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
        ))}
      </div>
      {status ? (
        <p className="form-status" data-ai-mode={status.mode}>
          {status.mode ? (
            <span className={`status-chip ${status.mode}`}>Live AI</span>
          ) : null}
          {status.message}
          {typeof status.operationCount === "number" ? <span className="operation-count">{status.operationCount} ops</span> : null}
        </p>
      ) : null}
    </aside>
  );
}
