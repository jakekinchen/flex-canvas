"use client";

import { LiveObject } from "@liveblocks/client";
import { useMutation } from "@liveblocks/react/suspense";
import type { BoardOperation } from "@/lib/ai/schema";
import { objectFromOperation, nextZIndex } from "@/lib/board/defaults";
import type { BoardObject, BoardObjectPatch } from "@/lib/board/types";
import { sanitizeBoardOperations } from "@/lib/board/validation";

function withAudit<T extends BoardObjectPatch>(patch: T, actorUserId: string): T & Pick<BoardObject, "updatedAt" | "updatedBy"> {
  return {
    ...patch,
    updatedAt: Date.now(),
    updatedBy: actorUserId,
  };
}

export function useBoardMutations(actorUserId: string) {
  const createObject = useMutation(
    ({ storage }, object: BoardObject) => {
      storage.get("objects").set(object.id, new LiveObject(object));
    },
    [],
  );

  const updateObject = useMutation(
    ({ storage }, id: string, patch: BoardObjectPatch) => {
      const object = storage.get("objects").get(id);
      if (!object) return;
      object.update(withAudit(patch, actorUserId));
    },
    [actorUserId],
  );

  const deleteObject = useMutation(
    ({ storage }, id: string) => {
      storage.get("objects").delete(id);
    },
    [],
  );

  const duplicateObject = useMutation(
    ({ storage }, id: string) => {
      const objects = storage.get("objects");
      const source = objects.get(id)?.toJSON() as BoardObject | undefined;
      if (!source) return;
      const now = Date.now();
      const copy = {
        ...source,
        id: `duplicate:${crypto.randomUUID()}`,
        x: source.x + 32,
        y: source.y + 32,
        zIndex: nextZIndex([...objects.values()].map((value) => value.toJSON() as BoardObject)),
        createdAt: now,
        updatedAt: now,
        updatedBy: actorUserId,
      } as BoardObject;
      objects.set(copy.id, new LiveObject(copy));
    },
    [actorUserId],
  );

  const moveObject = useMutation(
    ({ storage }, id: string, x: number, y: number) => {
      const object = storage.get("objects").get(id);
      if (!object) return;
      object.update(withAudit({ x, y }, actorUserId));
    },
    [actorUserId],
  );

  const resizeObject = useMutation(
    ({ storage }, id: string, width: number, height: number) => {
      const object = storage.get("objects").get(id);
      if (!object) return;
      object.update(withAudit({ width, height }, actorUserId));
    },
    [actorUserId],
  );

  const updateText = useMutation(
    ({ storage }, id: string, text: string) => {
      const object = storage.get("objects").get(id);
      if (!object) return;
      const current = object.toJSON() as BoardObject;
      if (current.type === "sticky") object.update(withAudit({ text }, actorUserId));
      if (current.type === "text") object.update(withAudit({ text }, actorUserId));
      if (current.type === "frame") object.update(withAudit({ title: text }, actorUserId));
    },
    [actorUserId],
  );

  const changeColor = useMutation(
    ({ storage }, id: string, color: string) => {
      const object = storage.get("objects").get(id);
      if (!object) return;
      object.update(withAudit({ color }, actorUserId));
    },
    [actorUserId],
  );

  const applyBoardOperations = useMutation(
    ({ storage }, rawOperations: BoardOperation[]) => {
      const objects = storage.get("objects");
      const operations = sanitizeBoardOperations(rawOperations);

      for (const operation of operations) {
        switch (operation.type) {
          case "createStickyNote":
          case "createShape":
          case "createText":
          case "createFrame":
          case "createConnector": {
            const object = objectFromOperation(
              operation,
              actorUserId,
              nextZIndex([...objects.values()].map((value) => value.toJSON() as BoardObject)),
            );
            if (object) objects.set(object.id, new LiveObject(object));
            break;
          }
          case "moveObject": {
            const object = objects.get(operation.objectId);
            if (object) object.update(withAudit({ x: operation.x, y: operation.y }, actorUserId));
            break;
          }
          case "resizeObject": {
            const object = objects.get(operation.objectId);
            if (object) {
              object.update(withAudit({ width: operation.width, height: operation.height }, actorUserId));
            }
            break;
          }
          case "updateText": {
            const object = objects.get(operation.objectId);
            if (!object) break;
            const current = object.toJSON() as BoardObject;
            if (current.type === "sticky" || current.type === "text") {
              object.update(withAudit({ text: operation.newText }, actorUserId));
            }
            if (current.type === "frame") {
              object.update(withAudit({ title: operation.newText }, actorUserId));
            }
            break;
          }
          case "changeColor": {
            const object = objects.get(operation.objectId);
            if (object) object.update(withAudit({ color: operation.color }, actorUserId));
            break;
          }
          case "deleteObject":
            objects.delete(operation.objectId);
            break;
        }
      }
    },
    [actorUserId],
  );

  return {
    createObject,
    updateObject,
    deleteObject,
    duplicateObject,
    moveObject,
    resizeObject,
    updateText,
    changeColor,
    applyBoardOperations,
  };
}
