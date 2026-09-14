import { expect } from "vitest";
import { formatResult, type MultiRunResult } from "./multi-run";

export function expectPassRate(result: MultiRunResult): void {
  expect(
    result.passRate,
    `Pass rate below threshold.\n\n${formatResult(result)}`,
  ).toBeGreaterThanOrEqual(result.threshold);
}

export function expectPassRateAtLeast(
  result: MultiRunResult,
  minimum: number,
): void {
  expect(
    result.passRate,
    `Pass rate ${result.passRate} below required minimum ${minimum}.\n\n${formatResult(result)}`,
  ).toBeGreaterThanOrEqual(minimum);
}
