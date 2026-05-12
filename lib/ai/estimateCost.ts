const GPT55_INPUT_PER_MILLION = 5;
const GPT55_OUTPUT_PER_MILLION = 30;

export function estimateGpt55CostUsd(inputTokens?: number, outputTokens?: number) {
  if (typeof inputTokens !== "number" && typeof outputTokens !== "number") {
    return undefined;
  }

  const input = ((inputTokens ?? 0) / 1_000_000) * GPT55_INPUT_PER_MILLION;
  const output = ((outputTokens ?? 0) / 1_000_000) * GPT55_OUTPUT_PER_MILLION;
  return Number((input + output).toFixed(6));
}
