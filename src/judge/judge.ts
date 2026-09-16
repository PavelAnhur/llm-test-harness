import { generate } from "@llm/client";

export interface JudgeResult {
  score: number;
  rationale: string;
  answers: string;
  raw: string;
}

const JUDGE_SYSTEM_PROMPT = `You are a strict evaluator. You follow the rubric exactly.
You always respond in the required format. You do not add commentary.`;

export async function judgeHelpfulness(
  question: string,
  response: string,
): Promise<JudgeResult> {
  const prompt = buildJudgePrompt(question, response);
  const { text } = await generate(prompt, {
    system: JUDGE_SYSTEM_PROMPT,
    temperature: 0,
  });
  return parseJudgeOutput(text);
}

function buildJudgePrompt(question: string, response: string): string {
  return `You are evaluating a customer support reply.

Customer question:
"""
${question}
"""

Reply to evaluate:
"""
${response}
"""

Answer each of the following with YES or NO.

A. Does the response contain a concrete answer — a specific fact,
   figure, definition, or yes/no — that a customer could act on?
B. Does that concrete answer address the question that was actually
   asked, rather than a different one?
C. Is the response specific enough that the customer does not have
   to ask again for the same information?
D. Does the response stay on topic, without pivoting to promote
   another product or answering a different question?
E. Does the response redirect the customer to another resource
   (product page, support contact, checkout) where they can find
   the answer themselves?
F. Does the response tell the customer what to do once they have
   the answer — a next action they can take?

Score:
  1 — A=NO, E=NO, F=NO
  2 — A=YES, B=NO
  3 — A=NO, E=YES    (a redirect is sufficient, even without F)
  4 — A=YES, B=YES, C=YES, D=NO
  5 — A=YES, B=YES, C=YES, D=YES

Respond with EXACTLY this format and nothing else:

ANSWERS: A=<YES|NO> B=<YES|NO> C=<YES|NO> D=<YES|NO> E=<YES|NO> F=<YES|NO>
RATIONALE: <one sentence>
SCORE: <one number 1-5>

Do not include any other text.`;
}

function parseJudgeOutput(text: string): JudgeResult {
  const scoreMatch = text.match(/^SCORE:\s*([1-5])/im);
  if (!scoreMatch) {
    throw new Error(`Judge did not return a valid SCORE. Raw output:\n${text}`);
  }
  const rationaleMatch = text.match(/^RATIONALE:\s*(.+)$/im);
  const rationale = rationaleMatch?.[1]?.trim() ?? '';
  const answersMatch = text.match(/^ANSWERS:\s*(.+)$/im);
  const answers = answersMatch?.[1]?.trim() ?? '';

  return {
    score: Number(scoreMatch[1]),
    rationale,
    answers,
    raw: text,
  };
}
