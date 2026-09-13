import { expect } from "vitest";

export function expectIntegerInRange(
  response: string,
  min: number,
  max: number,
): number {
  const trimmed = response.trim();
  const value = Number(trimmed);
  if (!Number.isInteger(value)) {
    expect.fail(
      `Response is not an integer.\n\nResponse:\n"${response}"\n\nParsed value:\n${value}`,
    );
  }
  expect(
    value,
    `Expected integer in [${min}, ${max}], got ${value}. Raw response: "${response}"`,
  ).toBeGreaterThanOrEqual(min);
  expect(
    value,
    `Expected integer in [${min}, ${max}], got ${value}. Raw response: "${response}"`,
  ).toBeLessThanOrEqual(max);
  return value;
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
