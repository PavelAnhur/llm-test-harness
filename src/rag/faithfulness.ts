import { generate } from "@llm/client";
import { JUDGE_SYSTEM_PROMPT, parseClaimJudgment } from "./prompt";
import type { ClaimJudgment, RagMetricInput, RagMetricResult } from "./types";

export async function judgeFaithfulness(
  input: RagMetricInput,
): Promise<RagMetricResult> {
  const claims = splitIntoClaims(input.answer);
  if (claims.length === 0) {
    return {
      score: 0,
      rationale: "Answer contains no claims to evaluate.",
      raw: "",
    };
  }
  const judgments: ClaimJudgment[] = [];
  for (const claim of claims) {
    const prompt = buildPromptPerClaim(input.chunks, claim);
    const { text } = await generate(prompt, {
      system: JUDGE_SYSTEM_PROMPT,
      temperature: 0,
    });
    const judgment = parseClaimJudgment(text);
    judgments.push({ claim, ...judgment });
  }
  const supported = judgments.filter((j) => j.supported).length;
  const score = supported / judgments.length;
  const rationale = judgments
    .map((j) => (j.supported ? "✓" : "✗") + " " + j.claim)
    .join(" | ");
  return {
    score,
    rationale,
    raw: JSON.stringify(judgments, null, 2),
  };
}

function buildPromptPerClaim(chunks: string[], claim: string): string {
  const chunksString = chunks.join("\n---\n");
  return `
  Is the following claim supported by the retrieved chunks?

Retrieved chunks:
"""
${chunksString}
"""

Claim:
"""
${claim}
"""

A claim is supported if the chunks contain the same fact, even if
the words differ. Paraphrase counts as support. A claim is
unsupported if the chunks do not contain the fact, even if the
claim is otherwise reasonable.

Respond with EXACTLY:
RATIONALE: <one sentence>
SUPPORTED: <YES or NO>`;
}

function splitIntoClaims(answer: string): string[] {
  return answer
    .split(/[.!?;,]\s+|\s+and\s+|\s+plus\s+/i)
    .map((s) => s.replace(/^(and|plus)\s+/i, "").trim())
    .filter((s) => s.length > 0);
}
