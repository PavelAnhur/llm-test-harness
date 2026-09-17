import type { RagMetricResult } from "./types";

export const JUDGE_SYSTEM_PROMPT = `You are a strict evaluator. You follow the rubric exactly.
You always respond in the required format. You do not add commentary.`;

export const RESPONSE_FORMAT = `Respond with EXACTLY this format and nothing else:

RATIONALE: <one sentence>
SCORE: <one number between 0.0 and 1.0>

Do not include any other text.`;

export function parseRagScore(text: string): RagMetricResult {
  const scoreMatch = text.match(/^SCORE:\s*(0(?:\.\d+)?|1(?:\.0+)?)/im);
  if (!scoreMatch) {
    throw new Error(`Judge did not return a valid SCORE. Raw output:\n${text}`);
  }
  const rationaleMatch = text.match(/^RATIONALE:\s*(.+)$/im);
  const rationale = rationaleMatch?.[1]?.trim() ?? "";
  const score = Number(scoreMatch[1]);
  if (score < 0 || score > 1) {
    throw new Error(
      `Judge returned an out-of-range score: ${score}. Expected [0, 1].`,
    );
  }
  return {
    score,
    rationale,
    raw: text,
  };
}
