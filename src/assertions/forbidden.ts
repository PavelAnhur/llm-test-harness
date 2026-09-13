import { expect } from 'vitest';


export function expectNoForbiddenContent(
  response: string,
  forbidden: readonly string[],
  options: { caseSensitive?: boolean } = {}
): void {
  const haystack = options.caseSensitive ? response : response.toLowerCase();
  for (const needle of forbidden) {
    const target = options.caseSensitive ? needle : needle.toLowerCase();
    expect(
      haystack.includes(target),
      `Response contains forbidden content "${needle}".\n\nResponse:\n${response}`
    ).toBe(false);
  }
}

export function expectLineCount(response: string, expected: number): void {
  const lines = response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  expect(
    lines,
    `Expected ${expected} non-empty lines, got ${lines.length}.\n\nResponse:\n${response}`
  ).toHaveLength(expected);
}
