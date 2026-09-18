import { generate } from "@llm/client";
import { JUDGE_SYSTEM_PROMPT, RESPONSE_FORMAT, parseRagScore } from "./prompt";
import type { RagMetricInput, RagMetricResult } from "./types";

const RELEVANCE_RUBRIC = `Do not score whether the answer is supported by the chunks. That is
a different metric. A fully grounded answer to a different question
is still irrelevant to the question asked.

  1.0 — the answer directly answers the question
  0.7 — the answer addresses the question but is incomplete or vague
  0.4 — the answer is on the same topic but does not answer the question
  0.1 — the answer is off-topic
  0.0 — the answer refuses to answer or contradicts the question

Examples:

- Question: "How many vacation days do full-time employees get?"
  Answer: "Full-time staff receive 20 paid days off per year."
  The wording is different (staff instead of employees, days off
  instead of vacation days), but the answer addresses the same
  population and the same fact. This is relevant. Score 1.0.

  - Question: "How many vacation days do full-time employees get?"
  Answer: "Part-time employees accrue vacation proportional to hours worked."
  The answer is on the same topic — employee vacation — but it is about
  a different population. The question asked about full-time employees.
  The answer addresses part-time employees. These are different policies
  for different groups. This is not an answer to the question asked.
  Score 0.1.

- Question: "How many vacation days do full-time employees get?"
  Answer: "We offer a generous benefits package."
  This is on the topic of benefits but does not answer the question.
  Score 0.4.

- Question: "How many vacation days do full-time employees get?"
  Answer: "I cannot help with that."
  This refuses to answer. Score 0.0.`;

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
  return `You are evaluating whether an answer addresses the question that was
  asked. A response that is on the same topic as the question but
  answers a different question is not relevant. A response that uses
  different words than the question but addresses the same fact is
  relevant. Relevance is about whether the customer's question is
  answered, not about whether the topic matches.

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
