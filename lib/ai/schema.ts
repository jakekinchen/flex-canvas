import { z } from "zod";

export const compactShapeSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  color: z.string().optional(),
  text: z.string().optional(),
});

export type CompactShape = z.infer<typeof compactShapeSchema>;

const viewportBoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const aiCommandClientRequestSchema = z.object({
  boardId: z.string().uuid(),
  roomId: z.string().min(1),
  command: z.string().min(1).max(1000),
  context: z.object({
    viewportBounds: viewportBoundsSchema,
    selectedIds: z.array(z.string()).max(100),
  }),
});

export type AiCommandClientRequest = z.infer<typeof aiCommandClientRequestSchema>;

export const aiCommandRequestSchema = z.object({
  boardId: z.string().uuid(),
  roomId: z.string().min(1),
  command: z.string().min(1).max(1000),
  context: z.object({
    objectTypeCounts: z.record(z.string(), z.number().int().nonnegative()),
    viewportBounds: viewportBoundsSchema,
    totalObjectCount: z.number().int().nonnegative(),
    selectedShapes: z.array(compactShapeSchema).max(100),
    viewportShapes: z.array(compactShapeSchema).max(150),
    candidateShapes: z.array(compactShapeSchema).max(150),
  }),
});

export type AiCommandRequest = z.infer<typeof aiCommandRequestSchema>;

const connectorOperationSchema = z
  .object({
    type: z.literal("createConnector"),
    fromId: z.string().min(1).optional(),
    toId: z.string().min(1).optional(),
    start: z.object({ x: z.number(), y: z.number() }).optional(),
    end: z.object({ x: z.number(), y: z.number() }).optional(),
    style: z.enum(["line", "arrow"]),
  })
  .refine((value) => (value.fromId && value.toId) || (value.start && value.end), {
    message: "Connector operations require fromId/toId or start/end.",
  });

export const boardOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createStickyNote"),
    text: z.string().min(1).max(500),
    x: z.number(),
    y: z.number(),
    color: z.string().min(1).max(40),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("createShape"),
    shapeType: z.enum(["rectangle", "circle", "line"]),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    color: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal("createText"),
    text: z.string().min(1).max(500),
    x: z.number(),
    y: z.number(),
    fontSize: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("createFrame"),
    title: z.string().min(1).max(120),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  connectorOperationSchema,
  z.object({
    type: z.literal("moveObject"),
    objectId: z.string().min(1),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal("resizeObject"),
    objectId: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  z.object({
    type: z.literal("updateText"),
    objectId: z.string().min(1),
    newText: z.string().min(1).max(1000),
  }),
  z.object({
    type: z.literal("changeColor"),
    objectId: z.string().min(1),
    color: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal("deleteObject"),
    objectId: z.string().min(1),
  }),
]);

export type BoardOperation = z.infer<typeof boardOperationSchema>;

export const aiCommandPlanSchema = z.object({
  message: z.string().min(1).max(500),
  operations: z.array(boardOperationSchema).max(80),
});

export type AiCommandPlan = z.infer<typeof aiCommandPlanSchema>;

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const openAiBoardOperationSchema = z.object({
  type: z.enum([
    "createStickyNote",
    "createShape",
    "createText",
    "createFrame",
    "createConnector",
    "moveObject",
    "resizeObject",
    "updateText",
    "changeColor",
    "deleteObject",
  ]),
  text: nullableString,
  title: nullableString,
  shapeType: z.enum(["rectangle", "circle", "line"]).nullable(),
  objectId: nullableString,
  fromId: nullableString,
  toId: nullableString,
  style: z.enum(["line", "arrow"]).nullable(),
  newText: nullableString,
  color: nullableString,
  x: nullableNumber,
  y: nullableNumber,
  width: nullableNumber,
  height: nullableNumber,
  fontSize: nullableNumber,
  startX: nullableNumber,
  startY: nullableNumber,
  endX: nullableNumber,
  endY: nullableNumber,
});

export const openAiCommandPlanSchema = z.object({
  message: z.string().min(1).max(500),
  operations: z.array(openAiBoardOperationSchema).max(80),
});

export type OpenAiCommandPlan = z.infer<typeof openAiCommandPlanSchema>;

export function validateOperations(operations: unknown[]) {
  return z.array(boardOperationSchema).parse(operations);
}

function requiredString(value: string | null, field: string, type: string) {
  if (!value) throw new Error(`${type}.${field} is required`);
  return value;
}

function requiredNumber(value: number | null, field: string, type: string) {
  if (typeof value !== "number") throw new Error(`${type}.${field} is required`);
  return value;
}

export function normalizeOpenAiCommandPlan(plan: OpenAiCommandPlan): AiCommandPlan {
  const operations = plan.operations.map((operation) => {
    switch (operation.type) {
      case "createStickyNote":
        return {
          type: operation.type,
          text: requiredString(operation.text, "text", operation.type),
          x: requiredNumber(operation.x, "x", operation.type),
          y: requiredNumber(operation.y, "y", operation.type),
          color: requiredString(operation.color, "color", operation.type),
          width: operation.width ?? undefined,
          height: operation.height ?? undefined,
        };
      case "createShape":
        return {
          type: operation.type,
          shapeType: operation.shapeType ?? "rectangle",
          x: requiredNumber(operation.x, "x", operation.type),
          y: requiredNumber(operation.y, "y", operation.type),
          width: requiredNumber(operation.width, "width", operation.type),
          height: requiredNumber(operation.height, "height", operation.type),
          color: requiredString(operation.color, "color", operation.type),
        };
      case "createText":
        return {
          type: operation.type,
          text: requiredString(operation.text, "text", operation.type),
          x: requiredNumber(operation.x, "x", operation.type),
          y: requiredNumber(operation.y, "y", operation.type),
          fontSize: operation.fontSize ?? undefined,
        };
      case "createFrame":
        return {
          type: operation.type,
          title: requiredString(operation.title, "title", operation.type),
          x: requiredNumber(operation.x, "x", operation.type),
          y: requiredNumber(operation.y, "y", operation.type),
          width: requiredNumber(operation.width, "width", operation.type),
          height: requiredNumber(operation.height, "height", operation.type),
        };
      case "createConnector": {
        const fromId = operation.fromId ?? undefined;
        const toId = operation.toId ?? undefined;
        const start =
          typeof operation.startX === "number" && typeof operation.startY === "number"
            ? { x: operation.startX, y: operation.startY }
            : undefined;
        const end =
          typeof operation.endX === "number" && typeof operation.endY === "number"
            ? { x: operation.endX, y: operation.endY }
            : undefined;
        return {
          type: operation.type,
          fromId,
          toId,
          start,
          end,
          style: operation.style ?? "arrow",
        };
      }
      case "moveObject":
        return {
          type: operation.type,
          objectId: requiredString(operation.objectId, "objectId", operation.type),
          x: requiredNumber(operation.x, "x", operation.type),
          y: requiredNumber(operation.y, "y", operation.type),
        };
      case "resizeObject":
        return {
          type: operation.type,
          objectId: requiredString(operation.objectId, "objectId", operation.type),
          width: requiredNumber(operation.width, "width", operation.type),
          height: requiredNumber(operation.height, "height", operation.type),
        };
      case "updateText":
        return {
          type: operation.type,
          objectId: requiredString(operation.objectId, "objectId", operation.type),
          newText: requiredString(operation.newText, "newText", operation.type),
        };
      case "changeColor":
        return {
          type: operation.type,
          objectId: requiredString(operation.objectId, "objectId", operation.type),
          color: requiredString(operation.color, "color", operation.type),
        };
      case "deleteObject":
        return {
          type: operation.type,
          objectId: requiredString(operation.objectId, "objectId", operation.type),
        };
    }
  });

  return aiCommandPlanSchema.parse({ message: plan.message, operations });
}
