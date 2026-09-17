import { generate } from "@llm/client";
import { JUDGE_SYSTEM_PROMPT, parseRagScore, RESPONSE_FORMAT } from "./prompt";
import type { RagMetricInput, RagMetricResult } from "./types";

const FAITHFULNESS_RUBRIC = `A claim is grounded if it is supported by the retrieved chunks.
Support means the chunks contain the information, even if the answer
uses different words to express it. Paraphrase does not count as
ungrounded.

A claim is ungrounded if the answer introduces a fact, number, or
assertion that is not supported by the chunks. Absent support is
the test; the answer does not need to contradict the chunks to fail.

Examples:

- Chunks say "employees accrue 20 days of vacation per year."
  Answer says "employees get 20 days of vacation per year."
  This is grounded. The verb changed; the fact did not. Score 1.0.

- Chunks say "employees accrue 20 days of vacation per year."
  Answer says "employees get 20 days of vacation plus 10 sick days."
  This is partially grounded. The vacation claim is supported;
  the sick-day claim is not. Score 0.5.

- Chunks say "employees accrue 20 days of vacation per year."
  Answer says "employees do not receive any vacation time."
  This is ungrounded and contradicts the chunks. Score 0.0.

Score the answer on a 0.0-1.0 scale:
  1.0 — every claim in the answer is grounded in the chunks
  0.7 — most claims are grounded; one minor ungrounded claim
  0.4 — about half the claims are grounded
  0.1 — most claims are ungrounded, or the answer contradicts the chunks
  0.0 — the answer introduces facts that directly contradict the chunks`;

export async function judgeFaithfulness(
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
  return `You are evaluating whether an answer is grounded in retrieved context.

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

${FAITHFULNESS_RUBRIC}

${RESPONSE_FORMAT}`;
}
