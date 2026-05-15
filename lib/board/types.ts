import type { LiveMap, LiveObject } from "@liveblocks/client";

export type BoardObjectType = "sticky" | "shape" | "text" | "frame" | "connector";

export type BoardPoint = {
  x: number;
  y: number;
};

export type BaseBoardObject = {
  id: string;
  type: BoardObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
};

export type StickyNoteObject = BaseBoardObject & {
  type: "sticky";
  text: string;
};

export type ShapeObject = BaseBoardObject & {
  type: "shape";
  shapeType: "rectangle" | "circle" | "line";
};

export type TextObject = BaseBoardObject & {
  type: "text";
  text: string;
  fontSize: number;
};

export type FrameObject = BaseBoardObject & {
  type: "frame";
  title: string;
};

export type ConnectorObject = BaseBoardObject & {
  type: "connector";
  fromId?: string;
  toId?: string;
  start?: BoardPoint;
  end?: BoardPoint;
  style: "line" | "arrow";
};

export type BoardObject = StickyNoteObject | ShapeObject | TextObject | FrameObject | ConnectorObject;

export type Storage = {
  objects: LiveMap<string, LiveObject<BoardObject>>;
};

export type Presence = {
  cursor: BoardPoint | null;
  cursorState: "idle" | "pressing" | "dragging";
  selectedIds: string[];
  name: string;
  color: string;
};

export type ViewportBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BoardContextInput = {
  viewportBounds: ViewportBounds;
  selectedIds: string[];
};

export type BoardObjectPatch = Partial<BaseBoardObject> & {
  text?: string;
  title?: string;
  fontSize?: number;
  shapeType?: "rectangle" | "circle" | "line";
  fromId?: string;
  toId?: string;
  start?: BoardPoint;
  end?: BoardPoint;
  style?: "line" | "arrow";
};
