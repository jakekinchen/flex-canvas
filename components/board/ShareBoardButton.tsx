"use client";

import { Check, Copy, Eye, Link as LinkIcon, Lock, Pencil, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Board } from "@/lib/db/queries";

type ShareBoardButtonProps = {
  boardName: string;
  shareMode: Board["share_mode"];
};

const shareModeCopy = {
  link_edit: {
    Icon: Pencil,
    status: "Anyone signed in with this link can edit this board.",
    note: "Guests and email users land back here after authentication.",
  },
  link_view: {
    Icon: Eye,
    status: "Anyone signed in with this link can view this board.",
    note: "Only board members with edit access can make changes.",
  },
  private: {
    Icon: Lock,
    status: "Only invited board members can open this board.",
    note: "This link is still useful for members who already have access.",
  },
} satisfies Record<Board["share_mode"], { Icon: LucideIcon; status: string; note: string }>;

export function ShareBoardButton({ boardName, shareMode }: ShareBoardButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [boardUrl] = useState(() => (typeof window === "undefined" ? "" : window.location.href));
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const shareDetails = useMemo(() => shareModeCopy[shareMode], [shareMode]);
  const ShareModeIcon = shareDetails.Icon;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function selectLink() {
    linkInputRef.current?.focus();
    linkInputRef.current?.select();
  }

  async function copyLink() {
    const link = boardUrl || window.location.href;
    setCopyError(null);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        selectLink();
        if (!document.execCommand("copy")) throw new Error("Clipboard copy unavailable.");
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      selectLink();
      setCopyError("Copy was blocked. Select the link and copy it manually.");
    }
  }

  function toggleSharePanel() {
    setOpen((current) => !current);
    setCopyError(null);
  }

  const statusText = copyError ?? (copied ? "Copied. Send this link to your collaborator." : shareDetails.note);

  return (
    <div className="share-board" ref={containerRef}>
      <button
        aria-controls="board-share-popover"
        aria-expanded={open}
        aria-label="Share board link"
        className="icon-button"
        onClick={toggleSharePanel}
        title="Share board"
        type="button"
      >
        <LinkIcon size={18} />
        <span>{copied ? "Copied" : "Share"}</span>
      </button>
      {open ? (
        <div aria-label={`Share ${boardName}`} className="board-share-popover" id="board-share-popover" role="dialog">
          <div className="board-share-summary">
            <span className="board-share-mode-icon" aria-hidden="true">
              <ShareModeIcon size={16} />
            </span>
            <div>
              <strong>Board link</strong>
              <p>{shareDetails.status}</p>
            </div>
          </div>
          <label className="board-share-link">
            Link
            <input
              aria-label={`Link to ${boardName}`}
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              ref={linkInputRef}
              value={boardUrl}
            />
          </label>
          <button className="board-share-copy" onClick={copyLink} type="button">
            {copied ? <Check size={17} /> : <Copy size={17} />}
            <span>{copied ? "Copied" : "Copy link"}</span>
          </button>
          <p className={copyError ? "board-share-status error" : "board-share-status"}>{statusText}</p>
        </div>
      ) : null}
    </div>
  );
}
