import { expect } from "vitest";

export function expectLineCount(response: string, expected: number): void {
  const lines = response
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  expect(
    lines,
    `Expected ${expected} non-empty lines, got ${lines.length}.\n\nResponse:\n${response}`,
  ).toHaveLength(expected);
}

export function expectSingleWord(response: string): void {
  const cleaned = response.trim().replace(/\.$/, "");
  const words = cleaned.split(/\s+/);
  expect(
    words,
    `Expected a single word, got ${words.length} token(s): "${response}"`,
  ).toHaveLength(1);
  expect(cleaned, `Expected only letters, got: "${response}"`).toMatch(
    /^[A-Za-z]+$/,
  );
}
