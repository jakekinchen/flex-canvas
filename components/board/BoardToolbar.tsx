"use client";

import { ArrowRight, Circle, ClipboardPaste, Copy, Frame, Minus, StickyNote, Type, Square } from "lucide-react";
import type React from "react";

export type ToolbarObjectKind = "sticky" | "rectangle" | "circle" | "line" | "connector" | "text" | "frame";

const tools: Array<{ kind: ToolbarObjectKind; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { kind: "sticky", label: "Sticky note", icon: StickyNote },
  { kind: "rectangle", label: "Rectangle", icon: Square },
  { kind: "circle", label: "Circle", icon: Circle },
  { kind: "line", label: "Line", icon: Minus },
  { kind: "connector", label: "Arrow connector", icon: ArrowRight },
  { kind: "text", label: "Text", icon: Type },
  { kind: "frame", label: "Frame", icon: Frame },
];

const colors = [
  { label: "Yellow", value: "#fde68a" },
  { label: "Pink", value: "#f9a8d4" },
  { label: "Blue", value: "#60a5fa" },
  { label: "Green", value: "#86efac" },
  { label: "Orange", value: "#fdba74" },
  { label: "Purple", value: "#c4b5fd" },
] as const;

export function BoardToolbar({
  canPaste,
  canEdit,
  onCreate,
  onColorChange,
  onCopy,
  onDuplicate,
  onPaste,
  selectedCount,
}: {
  canEdit: boolean;
  canPaste: boolean;
  onCreate: (kind: ToolbarObjectKind) => void;
  onColorChange: (color: string) => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onPaste: () => void;
  selectedCount: number;
}) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="board-toolbar" aria-label="Board tools">
      <div className="board-toolbar-group" aria-label="Create objects">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              aria-label={tool.label}
              disabled={!canEdit}
              key={tool.kind}
              onClick={() => onCreate(tool.kind)}
              title={tool.label}
              type="button"
            >
              <Icon size={17} />
            </button>
          );
        })}
      </div>
      <div className="board-toolbar-group" aria-label="Selection actions">
        <button aria-label="Duplicate selection" disabled={!canEdit || !hasSelection} onClick={onDuplicate} title="Duplicate" type="button">
          <Copy size={16} />
        </button>
        <button aria-label="Copy selection" disabled={!canEdit || !hasSelection} onClick={onCopy} title="Copy" type="button">
          <Copy size={16} />
        </button>
        <button aria-label="Paste selection" disabled={!canEdit || !canPaste} onClick={onPaste} title="Paste" type="button">
          <ClipboardPaste size={16} />
        </button>
      </div>
      <div className="board-toolbar-group color-swatches" aria-label="Set selected color">
        {colors.map((color) => (
          <button
            aria-label={`Set color ${color.label.toLowerCase()}`}
            className="color-swatch"
            disabled={!canEdit || !hasSelection}
            key={color.value}
            onClick={() => onColorChange(color.value)}
            style={{ "--swatch-color": color.value } as React.CSSProperties}
            title={color.label}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
