import { generate } from "@llm/client";
import { JUDGE_SYSTEM_PROMPT, RESPONSE_FORMAT, parseRagScore } from "./prompt";
import type { RagMetricInput, RagMetricResult } from "./types";

const RELEVANCE_RUBRIC = `Score how well the answer addresses the question that was asked.

  1.0 — the answer directly answers the question
  0.7 — the answer addresses the question but is incomplete or vague
  0.4 — the answer is on the same topic but does not answer the question
  0.1 — the answer is off-topic
  0.0 — the answer refuses to answer or contradicts the question`;

export async function judgeRelevance(
  input: RagMetricInput,
): Promise<RagMetricResult> {
  const prompt = buildPrompt(input);
  const { text } = await generate(prompt, {
    system: JUDGE_SYSTEM_PROMPT,
    temperature: 0,
  });
  return parseRagScore(text);
}

function buildPrompt(input: RagMetricInput): string {
  const chunks = input.chunks.join("\n---\n");
  return `You are evaluating whether an answer addresses the question that was asked.

Question:
"""
${input.question}
"""

Retrieved chunks:
"""
${chunks}
"""

Answer to evaluate:
"""
${input.answer}
"""

${RELEVANCE_RUBRIC}

${RESPONSE_FORMAT}`;
}
