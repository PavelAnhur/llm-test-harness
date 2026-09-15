import { generate, type GenerateOptions } from "@llm/client";

export interface RunOutcome {
  index: number;
  response: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface MultiRunResult {
  passed: boolean;
  passRate: number;
  passCount: number;
  totalRuns: number;
  threshold: number;
  runs: RunOutcome[];
}

export interface RunOptions extends GenerateOptions {
  runs?: number;
  threshold?: number;
}

export async function runNTimes(
  prompt: string,
  assertion: (response: string) => void,
  options: RunOptions = {},
): Promise<MultiRunResult> {
  const runs = options.runs ?? 5;
  const threshold = options.threshold ?? 0.8;
  const outcomes: RunOutcome[] = [];
  for (let i = 1; i <= runs; i++) {
    const startedAt = Date.now();
    try {
      const { text } = await generate(prompt, {
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options.system !== undefined && { system: options.system }),
        ...(options.maxTokens !== undefined && {
          maxTokens: options.maxTokens,
        }),
        ...(options.signal !== undefined && { signal: options.signal }),
      });
      try {
        assertion(text);
        outcomes.push({
          index: i,
          response: text,
          passed: true,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        outcomes.push({
          index: i,
          response: text,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAt,
        });
      }
    } catch (error) {
      outcomes.push({
        index: i,
        response: "",
        passed: false,
        error: `Model call failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - startedAt,
      });
    }
  }
  const passCount = outcomes.filter((o) => o.passed).length;
  const passRate = passCount / runs;

  return {
    passed: passRate >= threshold,
    passRate,
    passCount,
    totalRuns: runs,
    threshold,
    runs: outcomes,
  };
}

export function formatResult(
  result: MultiRunResult,
  options: { fullResponse?: boolean } = {},
): string {
  const truncate = (s: string) => {
    if (options.fullResponse) return s;
    const flat = s.replace(/\s+/g, " ").trim();
    return flat.length > 60 ? `${flat.slice(0, 57)}...` : flat;
  };
  const distinct = [...new Set(result.runs.map((r) => r.response))]
    .map((r) => `"${truncate(r)}"`)
    .join(", ");
  const lines = [
    `Pass rate: ${result.passCount}/${result.totalRuns} (${(result.passRate * 100).toFixed(1)}%)`,
    `Threshold: ${(result.threshold * 100).toFixed(0)}%`,
    `Distinct: ${distinct}`,
  ];
  const failureMessages = [
    ...new Set(
      result.runs.filter((r) => !r.passed).map((r) => r.error ?? "failed"),
    ),
  ];
  if (failureMessages.length > 0) {
    const shown = failureMessages.slice(0, 3).map((m) => m.split("\n")[0]);
    lines.push(`Failures (${failureMessages.length} distinct):`);
    for (const m of shown) lines.push(` - ${m}`);
    if (failureMessages.length > 3) {
      lines.push(` ... and ${failureMessages.length - 3} more`);
    }
  }
  return lines.join("\n");
}
