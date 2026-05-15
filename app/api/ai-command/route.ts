import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextRequest, NextResponse } from "next/server";
import {
  aiCommandClientRequestSchema,
  aiCommandRequestSchema,
  normalizeOpenAiCommandPlan,
  openAiCommandPlanSchema,
} from "@/lib/ai/schema";
import { buildAiUserPrompt, aiSystemPrompt } from "@/lib/ai/prompt";
import { estimateGpt55CostUsd } from "@/lib/ai/estimateCost";
import { buildCompactBoardContextFromObjects } from "@/lib/board/defaults";
import {
  completeAiCommandLog,
  failAiCommandLog,
  getBoardAccess,
  getBoardById,
  logAiCommandStarted,
} from "@/lib/db/queries";
import { requireEnv } from "@/lib/env";
import { applyBoardOperationsServer, ensureBoardStorage, getBoardStorage } from "@/lib/liveblocks/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const openAiTimeoutMs = 55_000;

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();
  const timings: Record<string, number> = {};
  const mark = (name: string, startedAt: number) => {
    timings[name] = Date.now() - startedAt;
  };
  const responseTimings = () => ({ ...timings, totalMs: Date.now() - requestStartedAt });

  const authStartedAt = Date.now();
  const user = await getAuthenticatedUser();
  mark("authMs", authStartedAt);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parseStartedAt = Date.now();
  const parsed = aiCommandClientRequestSchema.safeParse(await request.json().catch(() => ({})));
  mark("parseMs", parseStartedAt);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten(), timings: responseTimings() }, { status: 400 });
  }

  const commandRequest = parsed.data;
  const accessStartedAt = Date.now();
  const board = await getBoardById(commandRequest.boardId);
  if (!board || board.room_id !== commandRequest.roomId) {
    mark("accessMs", accessStartedAt);
    return NextResponse.json({ error: "Board not found", timings: responseTimings() }, { status: 404 });
  }

  const access = await getBoardAccess(board, user.id);
  mark("accessMs", accessStartedAt);
  if (!access.canEdit) {
    return NextResponse.json({ error: "Editor access required", timings: responseTimings() }, { status: 403 });
  }

  const logStartedAt = Date.now();
  const commandId = await logAiCommandStarted(board.id, user.id, commandRequest.command);
  mark("logStartMs", logStartedAt);

  try {
    const storageStartedAt = Date.now();
    await ensureBoardStorage(commandRequest.roomId);
    const storage = await getBoardStorage(commandRequest.roomId);
    mark("storageMs", storageStartedAt);
    const aiRequest = aiCommandRequestSchema.parse({
      ...commandRequest,
      context: buildCompactBoardContextFromObjects(Object.values(storage.objects), commandRequest.context),
    });

    const openai = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    const model = process.env.OPENAI_MODEL || "gpt-5.5";
    const effort = process.env.OPENAI_REASONING_EFFORT || "medium";

    const openAiStartedAt = Date.now();
    const response = await (async () => {
      try {
        return await openai.responses.parse(
          {
            model,
            reasoning: { effort: effort as "low" | "medium" | "high" | "xhigh" },
            max_output_tokens: 4000,
            input: [
              { role: "system", content: aiSystemPrompt },
              { role: "user", content: buildAiUserPrompt(aiRequest) },
            ],
            text: {
              format: zodTextFormat(openAiCommandPlanSchema, "board_operation_plan"),
            },
          },
          {
            idempotencyKey: commandId,
            maxRetries: 1,
            timeout: openAiTimeoutMs,
          },
        );
      } finally {
        mark("openAiMs", openAiStartedAt);
      }
    })();

    const parsedPlan = response.output_parsed;
    if (!parsedPlan) {
      throw new Error("OpenAI did not return a parsed operation plan.");
    }
    const plan = normalizeOpenAiCommandPlan(parsedPlan);
    const applyStartedAt = Date.now();
    const operations = await applyBoardOperationsServer(commandRequest.roomId, plan.operations, user.id);
    mark("applyStorageMs", applyStartedAt);

    const inputTokens = response.usage?.input_tokens;
    const outputTokens = response.usage?.output_tokens;
    const estimatedCostUsd = estimateGpt55CostUsd(inputTokens, outputTokens);
    const logCompleteStartedAt = Date.now();
    await completeAiCommandLog(commandId, inputTokens, outputTokens, estimatedCostUsd, operations);
    mark("logCompleteMs", logCompleteStartedAt);

    const finalTimings = responseTimings();
    console.info("[ai-command]", {
      commandId,
      boardId: board.id,
      model,
      operationCount: operations.length,
      timings: finalTimings,
    });

    return NextResponse.json({
      commandId,
      mode: "openai",
      message: plan.message,
      operationCount: operations.length,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
      timings: finalTimings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI command failed";
    await failAiCommandLog(commandId, message);
    const finalTimings = responseTimings();
    console.error("[ai-command]", {
      commandId,
      boardId: board.id,
      error: message,
      timings: finalTimings,
    });
    return NextResponse.json({ commandId, error: message, timings: finalTimings }, { status: 500 });
  }
}
