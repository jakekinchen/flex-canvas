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
import { applyBoardOperationsServer, getBoardStorage } from "@/lib/liveblocks/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = aiCommandClientRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const commandRequest = parsed.data;
  const board = await getBoardById(commandRequest.boardId);
  if (!board || board.room_id !== commandRequest.roomId) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const access = await getBoardAccess(board, user.id);
  if (!access.canEdit) {
    return NextResponse.json({ error: "Editor access required" }, { status: 403 });
  }

  const commandId = await logAiCommandStarted(board.id, user.id, commandRequest.command);

  try {
    const storage = await getBoardStorage(commandRequest.roomId);
    const aiRequest = aiCommandRequestSchema.parse({
      ...commandRequest,
      context: buildCompactBoardContextFromObjects(Object.values(storage.objects), commandRequest.context),
    });

    const openai = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    const model = process.env.OPENAI_MODEL || "gpt-5.5";
    const effort = process.env.OPENAI_REASONING_EFFORT || "medium";

    const response = await openai.responses.parse({
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
    });

    const parsedPlan = response.output_parsed;
    if (!parsedPlan) {
      throw new Error("OpenAI did not return a parsed operation plan.");
    }
    const plan = normalizeOpenAiCommandPlan(parsedPlan);
    const operations = await applyBoardOperationsServer(commandRequest.roomId, plan.operations, user.id);

    const inputTokens = response.usage?.input_tokens;
    const outputTokens = response.usage?.output_tokens;
    const estimatedCostUsd = estimateGpt55CostUsd(inputTokens, outputTokens);
    await completeAiCommandLog(commandId, inputTokens, outputTokens, estimatedCostUsd, operations);

    return NextResponse.json({
      commandId,
      mode: "openai",
      message: plan.message,
      operationCount: operations.length,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI command failed";
    await failAiCommandLog(commandId, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
