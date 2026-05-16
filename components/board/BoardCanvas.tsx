"use client";

import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useStorage, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Layer, Rect, Stage } from "react-konva";
import { BoardObjectRenderer } from "@/components/board/BoardObjectRenderer";
import { BoardToolbar, type ToolbarObjectKind } from "@/components/board/BoardToolbar";
import { RemoteCursors } from "@/components/board/RemoteCursors";
import { SelectionTransformer } from "@/components/board/SelectionTransformer";
import type { BoardOperation } from "@/lib/ai/schema";
import { createObjectId, objectFromOperation, nextZIndex } from "@/lib/board/defaults";
import { isObjectInBounds, objectCenter, sortByZIndex } from "@/lib/board/geometry";
import { useBoardMutations } from "@/lib/board/operations";
import type { BoardContextInput, BoardObject, BoardObjectPatch, BoardPoint } from "@/lib/board/types";
import type { ViewportTransform } from "@/lib/board/viewport";
import { getViewportBounds, screenToWorld, worldToScreen, zoomTowardPoint } from "@/lib/board/viewport";

type BoardCanvasProps = {
  canEdit: boolean;
  onContextChange: (context: BoardContextInput) => void;
  user: {
    id: string;
    name: string;
    color: string;
  };
};

const emptyObjects: Record<string, BoardObject> = {};

type SelectionBox = {
  start: BoardPoint;
  end: BoardPoint;
};

type CursorState = "idle" | "pressing" | "dragging";

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

function boundsFromPoints(start: BoardPoint, end: BoardPoint) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function intersects(box: { x: number; y: number; width: number; height: number }, object: BoardObject) {
  return (
    object.x + object.width >= box.x &&
    object.x <= box.x + box.width &&
    object.y + object.height >= box.y &&
    object.y <= box.y + box.height
  );
}

function inflateBounds(bounds: { x: number; y: number; width: number; height: number }, margin: number) {
  return {
    x: bounds.x - margin,
    y: bounds.y - margin,
    width: bounds.width + margin * 2,
    height: bounds.height + margin * 2,
  };
}

function cloneBoardObjects(
  sourceObjects: BoardObject[],
  existingObjects: BoardObject[],
  actorUserId: string,
  offset: BoardPoint,
) {
  const now = Date.now();
  const idMap = new Map(sourceObjects.map((object) => [object.id, createObjectId(object.type)]));
  let zIndex = nextZIndex(existingObjects);

  return sourceObjects.map((object) => {
    const clone = {
      ...object,
      id: idMap.get(object.id) ?? createObjectId(object.type),
      x: object.x + offset.x,
      y: object.y + offset.y,
      zIndex: zIndex++,
      createdAt: now,
      updatedAt: now,
      updatedBy: actorUserId,
    } as BoardObject;

    if (clone.type === "connector") {
      clone.fromId = clone.fromId && idMap.has(clone.fromId) ? idMap.get(clone.fromId) : undefined;
      clone.toId = clone.toId && idMap.has(clone.toId) ? idMap.get(clone.toId) : undefined;
      clone.start = clone.start ? { x: clone.start.x + offset.x, y: clone.start.y + offset.y } : undefined;
      clone.end = clone.end ? { x: clone.end.x + offset.x, y: clone.end.y + offset.y } : undefined;
    }

    return clone;
  });
}

export function BoardCanvas({ canEdit, onContextChange, user }: BoardCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const selectionStartRef = useRef<BoardPoint | null>(null);
  const didDragSelectRef = useRef(false);
  const pointerDownRef = useRef<BoardPoint | null>(null);
  const pendingCursorRef = useRef<{ cursor: BoardPoint | null; cursorState: CursorState } | null>(null);
  const cursorPresenceFrameRef = useRef<number | null>(null);
  const cursorStateRef = useRef<CursorState>("idle");
  const objectsById = (useStorage((root) => root.objects) ?? emptyObjects) as Record<string, BoardObject>;
  const objects = useMemo(() => sortByZIndex(Object.values(objectsById)), [objectsById]);
  const mutations = useBoardMutations(user.id);
  const updateMyPresence = useUpdateMyPresence();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboardObjects, setClipboardObjects] = useState<BoardObject[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [size, setSize] = useState({ width: 900, height: 700 });
  const [viewport, setViewport] = useState<ViewportTransform>({
    scale: 1,
    stageX: 0,
    stageY: 0,
  });
  const viewportBounds = useMemo(() => getViewportBounds(viewport, size), [size, viewport]);
  const renderBounds = useMemo(() => inflateBounds(viewportBounds, 420), [viewportBounds]);
  const visibleObjects = useMemo(
    () => objects.filter((object) => isObjectInBounds(object, renderBounds)),
    [objects, renderBounds],
  );

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(320, Math.floor(entry.contentRect.height)),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    updateMyPresence({ selectedIds });
    onContextChange({
      selectedIds,
      viewportBounds,
    });
  }, [onContextChange, selectedIds, updateMyPresence, viewportBounds]);

  useEffect(
    () => () => {
      if (cursorPresenceFrameRef.current !== null) {
        window.cancelAnimationFrame(cursorPresenceFrameRef.current);
      }
    },
    [],
  );

  const queueCursorPresence = useCallback(
    (cursor: BoardPoint | null, cursorState: CursorState = cursorStateRef.current) => {
      pendingCursorRef.current = { cursor, cursorState };
      if (cursorPresenceFrameRef.current !== null) return;
      updateMyPresence({ cursor, cursorState });
      cursorPresenceFrameRef.current = window.requestAnimationFrame(() => {
        cursorPresenceFrameRef.current = null;
        const pending = pendingCursorRef.current;
        if (pending && (pending.cursor !== cursor || pending.cursorState !== cursorState)) {
          updateMyPresence(pending);
        }
      });
    },
    [updateMyPresence],
  );

  const getLiveViewport = useCallback((): ViewportTransform => {
    const stage = stageRef.current;
    if (!stage) return viewport;
    return {
      scale: stage.scaleX(),
      stageX: stage.x(),
      stageY: stage.y(),
    };
  }, [viewport]);

  const syncViewportFromStage = useCallback((stage: Konva.Stage | null) => {
    if (!stage) return;
    const nextViewport = {
      scale: stage.scaleX(),
      stageX: stage.x(),
      stageY: stage.y(),
    };
    setViewport((current) => {
      if (
        current.scale === nextViewport.scale &&
        current.stageX === nextViewport.stageX &&
        current.stageY === nextViewport.stageY
      ) {
        return current;
      }
      return nextViewport;
    });
  }, []);

  const worldPointFromPointerEvent = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const element = wrapperRef.current;
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return screenToWorld(
        {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
        getLiveViewport(),
      );
    },
    [getLiveViewport],
  );

  const updateCursorFromPointerEvent = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cursorState = cursorStateRef.current) => {
      const worldPointer = worldPointFromPointerEvent(event);
      if (!worldPointer) return;
      cursorStateRef.current = cursorState;
      queueCursorPresence(worldPointer, cursorState);
    },
    [queueCursorPresence, worldPointFromPointerEvent],
  );

  function handleShellPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const worldPointer = worldPointFromPointerEvent(event);
    if (!worldPointer) return;
    pointerDownRef.current = worldPointer;
    cursorStateRef.current = "pressing";
    queueCursorPresence(worldPointer, "pressing");
  }

  function handleShellPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const worldPointer = worldPointFromPointerEvent(event);
    if (!worldPointer) return;
    let nextState = cursorStateRef.current;
    if (pointerDownRef.current) {
      const dragDistance = Math.hypot(worldPointer.x - pointerDownRef.current.x, worldPointer.y - pointerDownRef.current.y);
      nextState = dragDistance > 4 ? "dragging" : "pressing";
    }
    updateCursorFromPointerEvent(event, nextState);
  }

  function handleShellPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    pointerDownRef.current = null;
    updateCursorFromPointerEvent(event, "idle");
  }

  function handleShellPointerLeave() {
    pointerDownRef.current = null;
    cursorStateRef.current = "idle";
    queueCursorPresence(null, "idle");
  }

  const updateObject = useCallback(
    (id: string, patch: BoardObjectPatch) => {
      if (!canEdit) return;
      mutations.updateObject(id, patch);
    },
    [canEdit, mutations],
  );

  function selectObject(id: string, additive: boolean) {
    setSelectedIds((current) => {
      if (!additive) return [id];
      return current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id];
    });
  }

  const copySelection = useCallback(() => {
    if (!selectedIds.length) return;
    setClipboardObjects(selectedIds.map((id) => objectsById[id]).filter((object): object is BoardObject => Boolean(object)));
  }, [objectsById, selectedIds]);

  const pasteClipboard = useCallback(() => {
    if (!canEdit || !clipboardObjects.length) return;
    const clones = cloneBoardObjects(clipboardObjects, objects, user.id, { x: 36, y: 36 });
    clones.forEach((object) => mutations.createObject(object));
    setSelectedIds(clones.map((object) => object.id));
  }, [canEdit, clipboardObjects, mutations, objects, user.id]);

  const duplicateSelection = useCallback(() => {
    if (!canEdit || !selectedIds.length) return;
    const selectedObjects = selectedIds.map((id) => objectsById[id]).filter((object): object is BoardObject => Boolean(object));
    const clones = cloneBoardObjects(selectedObjects, objects, user.id, { x: 36, y: 36 });
    clones.forEach((object) => mutations.createObject(object));
    setClipboardObjects(selectedObjects);
    setSelectedIds(clones.map((object) => object.id));
  }, [canEdit, mutations, objects, objectsById, selectedIds, user.id]);

  const changeSelectedColor = useCallback(
    (color: string) => {
      if (!canEdit) return;
      selectedIds.forEach((id) => mutations.changeColor(id, color));
    },
    [canEdit, mutations, selectedIds],
  );

  const canConnectSelection = useMemo(() => {
    if (selectedIds.length !== 2) return false;
    return selectedIds.every((id) => {
      const object = objectsById[id];
      return object && object.type !== "connector";
    });
  }, [objectsById, selectedIds]);

  const connectSelection = useCallback(() => {
    if (!canEdit || !canConnectSelection) return;
    const [fromId, toId] = selectedIds;
    const from = objectsById[fromId];
    const to = objectsById[toId];
    if (!from || !to || from.type === "connector" || to.type === "connector") return;
    const object = objectFromOperation(
      {
        type: "createConnector",
        fromId: from.id,
        toId: to.id,
        start: objectCenter(from),
        end: objectCenter(to),
        style: "arrow",
      },
      user.id,
      nextZIndex(objects),
    );
    if (!object) return;
    mutations.createObject(object);
    setSelectedIds([object.id]);
  }, [canConnectSelection, canEdit, mutations, objects, objectsById, selectedIds, user.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canEdit || isTextInputTarget(event.target)) return;
      const commandKey = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        setSelectedIds([]);
        setEditingId(null);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length) {
        selectedIds.forEach((id) => mutations.deleteObject(id));
        setSelectedIds([]);
      }
      if (commandKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
      }
      if (commandKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
      }
      if (commandKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, copySelection, duplicateSelection, mutations, pasteClipboard, selectedIds]);

  function createAtCenter(kind: ToolbarObjectKind) {
    if (!canEdit) return;
    const center = screenToWorld({ x: size.width / 2, y: size.height / 2 }, viewport);
    const operationByKind: Record<ToolbarObjectKind, BoardOperation> = {
      circle: {
        type: "createShape",
        shapeType: "circle",
        x: center.x - 70,
        y: center.y - 70,
        width: 140,
        height: 140,
        color: "green",
      },
      frame: {
        type: "createFrame",
        title: "Frame",
        x: center.x - 260,
        y: center.y - 180,
        width: 520,
        height: 360,
      },
      rectangle: {
        type: "createShape",
        shapeType: "rectangle",
        x: center.x - 110,
        y: center.y - 70,
        width: 220,
        height: 140,
        color: "blue",
      },
      connector: {
        type: "createConnector",
        start: { x: center.x - 130, y: center.y },
        end: { x: center.x + 130, y: center.y },
        style: "arrow",
      },
      line: {
        type: "createShape",
        shapeType: "line",
        x: center.x - 120,
        y: center.y,
        width: 240,
        height: 1,
        color: "#111827",
      },
      sticky: {
        type: "createStickyNote",
        text: "New note",
        x: center.x - 90,
        y: center.y - 75,
        color: "yellow",
      },
      text: {
        type: "createText",
        text: "Text",
        x: center.x - 70,
        y: center.y - 20,
        fontSize: 28,
      },
    };

    const object = objectFromOperation(operationByKind[kind], user.id, nextZIndex(objects));
    if (!object) return;
    mutations.createObject(object);
    setSelectedIds([object.id]);
    if (kind === "sticky" || kind === "text" || kind === "frame") setEditingId(object.id);
  }

  function handleStageClick(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (didDragSelectRef.current) {
      didDragSelectRef.current = false;
      return;
    }
    const stage = event.target.getStage();
    if (event.target === stage) {
      setSelectedIds([]);
      setEditingId(null);
    }
  }

  function handleWheel(event: KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    setViewport((current) => zoomTowardPoint(current, pointer, event.evt.deltaY));
  }

  function handleMouseDown(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!canEdit || event.target !== event.target.getStage()) return;
    if (!("shiftKey" in event.evt) || !event.evt.shiftKey) return;

    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;

    const start = screenToWorld(pointer, getLiveViewport());
    selectionStartRef.current = start;
    didDragSelectRef.current = false;
    stage.draggable(false);
    setSelectionBox({ start, end: start });
    event.cancelBubble = true;
  }

  function handleMouseMove() {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const worldPointer = screenToWorld(pointer, getLiveViewport());

    if (selectionStartRef.current) {
      const start = selectionStartRef.current;
      didDragSelectRef.current =
        didDragSelectRef.current || Math.abs(start.x - worldPointer.x) > 4 || Math.abs(start.y - worldPointer.y) > 4;
      setSelectionBox({ start, end: worldPointer });
    }
  }

  function handleMouseUp() {
    if (!selectionStartRef.current || !selectionBox) return;

    const selectionBounds = boundsFromPoints(selectionBox.start, selectionBox.end);
    setSelectedIds(
      objects
        .filter((object) => selectionBounds.width > 4 && selectionBounds.height > 4 && intersects(selectionBounds, object))
        .map((object) => object.id),
    );
    selectionStartRef.current = null;
    setSelectionBox(null);
    stageRef.current?.draggable(true);
  }

  const editingObject = editingId ? objectsById[editingId] : null;
  const editableText =
    editingObject?.type === "sticky" || editingObject?.type === "text"
      ? editingObject.text
      : editingObject?.type === "frame"
        ? editingObject.title
        : "";
  const editorPosition = editingObject ? worldToScreen({ x: editingObject.x, y: editingObject.y }, viewport) : null;

  return (
    <div
      className="board-canvas-shell"
      onPointerDown={handleShellPointerDown}
      onPointerLeave={handleShellPointerLeave}
      onPointerMove={handleShellPointerMove}
      onPointerUp={handleShellPointerUp}
      ref={wrapperRef}
    >
      <BoardToolbar
        canEdit={canEdit}
        canConnectSelection={canConnectSelection}
        canPaste={clipboardObjects.length > 0}
        onColorChange={changeSelectedColor}
        onConnectSelection={connectSelection}
        onCopy={copySelection}
        onCreate={createAtCenter}
        onDuplicate={duplicateSelection}
        onPaste={pasteClipboard}
        selectedCount={selectedIds.length}
      />
      <div className="board-canvas-stage" data-testid="board-canvas-stage">
        <Stage
          draggable={!selectionBox}
          height={size.height}
          onClick={handleStageClick}
          onDragEnd={(event) => {
            if (event.target === event.target.getStage()) {
              syncViewportFromStage(event.target.getStage());
            }
          }}
          onDragMove={(event) => {
            if (event.target === event.target.getStage()) {
              syncViewportFromStage(event.target.getStage());
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTap={handleStageClick}
          onWheel={handleWheel}
          ref={stageRef}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          width={size.width}
          x={viewport.stageX}
          y={viewport.stageY}
        >
          <Layer>
            <Rect fill="#f8fafc" height={400000} listening={false} width={400000} x={-200000} y={-200000} />
            {visibleObjects.map((object) => (
              <BoardObjectRenderer
                canEdit={canEdit}
                key={object.id}
                object={object}
                objectsById={objectsById}
                onChange={updateObject}
                onSelect={selectObject}
                onStartEdit={setEditingId}
              />
            ))}
            <SelectionTransformer objectsById={objectsById} onChange={updateObject} selectedIds={selectedIds} />
            {selectionBox ? (
              <Rect
                dash={[8, 6]}
                fill="rgba(37, 99, 235, 0.08)"
                listening={false}
                stroke="#2563eb"
                strokeWidth={1.5 / viewport.scale}
                {...boundsFromPoints(selectionBox.start, selectionBox.end)}
              />
            ) : null}
          </Layer>
        </Stage>
        <RemoteCursors viewport={viewport} />
        {editingObject && editorPosition ? (
          <textarea
            autoFocus
            className="object-editor-overlay"
            defaultValue={editableText}
            onBlur={(event) => {
              mutations.updateText(editingObject.id, event.currentTarget.value);
              setEditingId(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                mutations.updateText(editingObject.id, event.currentTarget.value);
                setEditingId(null);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setEditingId(null);
              }
            }}
            style={{
              height: Math.max(40, editingObject.height * viewport.scale),
              left: editorPosition.x,
              top: editorPosition.y,
              width: Math.max(120, editingObject.width * viewport.scale),
            }}
          />
        ) : null}
        <div className="board-object-probes" aria-hidden="true">
          {objects.map((object) => (
            <span
              className="board-object-probe"
              data-object-color={object.color}
              data-object-from-id={object.type === "connector" ? (object.fromId ?? "") : ""}
              data-object-height={object.height}
              data-object-id={object.id}
              data-object-rotation={object.rotation}
              data-object-selected={selectedIds.includes(object.id) ? "true" : "false"}
              data-object-text={
                object.type === "sticky" || object.type === "text"
                  ? object.text
                  : object.type === "frame"
                    ? object.title
                    : ""
              }
              data-object-type={object.type}
              data-object-to-id={object.type === "connector" ? (object.toId ?? "") : ""}
              data-object-width={object.width}
              data-object-x={object.x}
              data-object-y={object.y}
              key={object.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
