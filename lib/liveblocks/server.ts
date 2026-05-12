import { Liveblocks, LiveMap, LiveObject } from "@liveblocks/node";
import type { BoardOperation } from "@/lib/ai/schema";
import { objectFromOperation, nextZIndex } from "@/lib/board/defaults";
import type { BoardObject } from "@/lib/board/types";
import { sanitizeBoardOperations } from "@/lib/board/validation";
import { requireEnv } from "@/lib/env";

export function createLiveblocksServerClient() {
  return new Liveblocks({
    secret: requireEnv("LIVEBLOCKS_SECRET_KEY"),
  });
}

export async function getBoardStorage(roomId: string): Promise<{ objects: Record<string, BoardObject> }> {
  const liveblocks = createLiveblocksServerClient();
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");
    return {
      objects: ((storage as { objects?: Record<string, BoardObject> }).objects ?? {}) as Record<string, BoardObject>,
    };
  } catch {
    return { objects: {} };
  }
}

export async function mutateBoardStorage(
  roomId: string,
  callback: (objects: LiveMap<string, LiveObject<BoardObject>>) => void | Promise<void>,
) {
  const liveblocks = createLiveblocksServerClient();
  await liveblocks.mutateStorage(roomId, async ({ root }) => {
    let objects = root.get("objects") as LiveMap<string, LiveObject<BoardObject>> | undefined;
    if (!objects) {
      objects = new LiveMap<string, LiveObject<BoardObject>>();
      root.set("objects", objects);
    }

    await callback(objects);
  });
}

function updateObject(
  objects: LiveMap<string, LiveObject<BoardObject>>,
  id: string,
  patch: Partial<BoardObject>,
  actorUserId: string,
) {
  const object = objects.get(id);
  if (!object) return;
  object.update({
    ...patch,
    updatedAt: Date.now(),
    updatedBy: actorUserId,
  });
}

export async function applyBoardOperationsServer(
  roomId: string,
  rawOperations: BoardOperation[],
  actorUserId: string,
) {
  const operations = sanitizeBoardOperations(rawOperations);

  await mutateBoardStorage(roomId, (objects) => {
    for (const operation of operations) {
      switch (operation.type) {
        case "createStickyNote":
        case "createShape":
        case "createText":
        case "createFrame":
        case "createConnector": {
          const existingObjects = [...objects.values()].map((value) => value.toJSON() as BoardObject);
          const object = objectFromOperation(operation, actorUserId, nextZIndex(existingObjects));
          if (object) objects.set(object.id, new LiveObject(object));
          break;
        }
        case "moveObject":
          updateObject(objects, operation.objectId, { x: operation.x, y: operation.y }, actorUserId);
          break;
        case "resizeObject":
          updateObject(
            objects,
            operation.objectId,
            { width: operation.width, height: operation.height },
            actorUserId,
          );
          break;
        case "updateText": {
          const object = objects.get(operation.objectId)?.toJSON() as BoardObject | undefined;
          if (!object) break;
          if (object.type === "sticky" || object.type === "text") {
            updateObject(objects, operation.objectId, { text: operation.newText }, actorUserId);
          } else if (object.type === "frame") {
            updateObject(objects, operation.objectId, { title: operation.newText }, actorUserId);
          }
          break;
        }
        case "changeColor":
          updateObject(objects, operation.objectId, { color: operation.color }, actorUserId);
          break;
        case "deleteObject":
          objects.delete(operation.objectId);
          break;
      }
    }
  });

  return operations;
}
