"use client";

import { Link as LinkIcon } from "lucide-react";
import { useState } from "react";

export function ShareBoardButton() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="icon-button" type="button" onClick={copyLink} aria-label="Copy board link" title="Copy board link">
      <LinkIcon size={18} />
      <span>{copied ? "Copied" : "Share"}</span>
    </button>
  );
}
