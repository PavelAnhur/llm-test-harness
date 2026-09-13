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
