"use client";

import { useRouter } from "next/navigation";
import { Check, Ellipsis, Pencil, X } from "lucide-react";
import { FormEvent, useId, useState, useTransition } from "react";

type RenameBoardResult = {
  board?: {
    name: string;
  };
  error?: string;
};

async function renameBoard(boardId: string, name: string): Promise<RenameBoardResult> {
  const response = await fetch(`/api/boards/${boardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const payload = (await response.json()) as RenameBoardResult;
  if (!response.ok) return { error: payload.error ?? "Unable to rename board." };
  return payload;
}

export function BoardTitleEditor({
  boardId,
  canEdit,
  initialName,
}: {
  boardId: string;
  canEdit: boolean;
  initialName: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [draftName, setDraftName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  function startRename() {
    setDraftName(name);
    setError(null);
    setIsEditing(true);
  }

  function cancelRename() {
    setDraftName(name);
    setError(null);
    setIsEditing(false);
  }

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = draftName.trim();
    if (!nextName || nextName === name) {
      cancelRename();
      return;
    }

    startTransition(async () => {
      const result = await renameBoard(boardId, nextName);
      if (result.error) {
        setError(result.error);
        return;
      }

      setName(result.board?.name ?? nextName);
      setIsEditing(false);
      router.refresh();
    });
  }

  if (!canEdit) {
    return <h1 title={name}>{name}</h1>;
  }

  return (
    <div className="board-title-editor">
      {isEditing ? (
        <form className="board-title-form" onSubmit={submitRename}>
          <label className="sr-only" htmlFor={inputId}>
            Board name
          </label>
          <input
            autoFocus
            disabled={isPending}
            id={inputId}
            maxLength={120}
            onChange={(event) => setDraftName(event.target.value)}
            value={draftName}
          />
          <button aria-label="Save board name" disabled={isPending} title="Save board name" type="submit">
            <Check size={16} />
          </button>
          <button aria-label="Cancel rename" disabled={isPending} onClick={cancelRename} title="Cancel rename" type="button">
            <X size={16} />
          </button>
        </form>
      ) : (
        <span className="board-title-display">
          <h1 title={name}>{name}</h1>
          <button aria-label="Rename board" onClick={startRename} title="Rename board" type="button">
            <Pencil size={15} />
          </button>
        </span>
      )}
      {error ? <small className="board-rename-error">{error}</small> : null}
    </div>
  );
}

export function BoardCardMenu({
  boardId,
  initialName,
}: {
  boardId: string;
  initialName: string;
}) {
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(initialName);

  function openRename() {
    setDraftName(initialName);
    setIsRenaming(true);
    setIsOpen(true);
  }

  function closeMenu() {
    setIsRenaming(false);
    setIsOpen(false);
  }

  return (
    <div className="board-card-menu">
      <button
        aria-expanded={isOpen}
        aria-label={`Open menu for ${initialName}`}
        className="board-card-menu-trigger"
        onClick={() => {
          setIsRenaming(false);
          setIsOpen((open) => !open);
        }}
        title="Board menu"
        type="button"
      >
        <Ellipsis size={18} />
      </button>
      {isOpen ? (
        <div className="board-card-popover" role="menu">
          {isRenaming ? (
            <form action={`/boards/${boardId}/rename`} method="post">
              <label className="sr-only" htmlFor={inputId}>
                Board name
              </label>
              <input
                autoFocus
                id={inputId}
                maxLength={120}
                minLength={1}
                name="name"
                onChange={(event) => setDraftName(event.target.value)}
                required
                value={draftName}
              />
              <div className="board-card-popover-actions">
                <button type="submit">
                  Save
                </button>
                <button onClick={closeMenu} type="button">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={openRename} role="menuitem" type="button">
              <Pencil size={15} />
              Rename
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
