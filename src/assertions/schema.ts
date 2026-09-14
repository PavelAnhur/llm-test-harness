import { expect } from "vitest";
import { type ZodType } from "zod";

export function expectValidJson<T>(response: string, schema: ZodType<T>): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch (error) {
    expect.fail(
      `Response is not valid JSON.\n\nResponse:\n${response}\n\nParse error:\n${String(error)}`,
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    expect.fail(
      `Response does not match schema.\n\nResponse:\n${response}\n\nIssues:\n${JSON.stringify(result.error.issues, null, 2)}`,
    );
  }
  return result.data;
}

export function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? match[0] : null;
}

export function extractFirstJson(text: string): string | null {
  const cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  const start = cleaned.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return cleaned.slice(start, i + 1);
      }
    }
  }
  return null;
}
