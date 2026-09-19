import { readJsonFile } from "@utils/json";
import { judgeHelpfulness } from "./judge";
import { type JudgeResult } from "./types";

export interface HelpfulnessExample {
  id: string;
  question: string;
  response: string;
  humanScore: number;
  label: {
    givesAnswer: boolean;
    answersThisQuestion: boolean;
    givesNextStep: boolean;
    staysOnTopic: boolean;
    anticipatesFollowUp: boolean;
  };
}

export interface Comparison {
  id: string;
  humanScore: number;
  judgeScore: number;
  diff: number;
  rationale: string;
  question: string;
}

export interface CalibrationReport {
  total: number;
  exactMatches: number;
  withinOne: number;
  meanAbsoluteError: number;
  comparisons: Comparison[];
}

export async function calibrateJudge(
  filePath: string,
): Promise<CalibrationReport> {
  const dataset = readJsonFile<HelpfulnessExample[]>(filePath);
  const comparisons: Comparison[] = [];
  for (const example of dataset) {
    const result: JudgeResult = await judgeHelpfulness(
      example.question,
      example.response,
    );
    comparisons.push({
      id: example.id,
      humanScore: example.humanScore,
      judgeScore: result.score,
      diff: Math.abs(result.score - example.humanScore),
      rationale: result.rationale,
      question: example.question,
    });
  }
  return summarise(comparisons);
}

function summarise(comparisons: Comparison[]): CalibrationReport {
  const total = comparisons.length;
  const exactMatches = comparisons.filter((c) => c.diff === 0).length;
  const withinOne = comparisons.filter((c) => c.diff <= 1).length;
  const meanAbsoluteError =
    comparisons.reduce((sum, c) => sum + c.diff, 0) / total;
  return {
    total,
    exactMatches,
    withinOne,
    meanAbsoluteError,
    comparisons,
  };
}

export function printReport(report: CalibrationReport): void {
  console.log("\n=== Calibration report ===\n");
  for (const c of report.comparisons) {
    const marker = c.diff === 0 ? "✓" : c.diff <= 1 ? "~" : "✗";
    console.log(
      `${marker} ${c.id.padEnd(14)} human=${c.humanScore} judge=${c.judgeScore} diff=${c.diff}`,
    );
    console.log(`  rationale: ${c.rationale}`);
  }
  console.log("\n=== Summary ===\n");
  console.log(`Total examples:        ${report.total}`);
  console.log(
    `Exact agreement:       ${report.exactMatches}/${report.total} (${(
      (report.exactMatches / report.total) *
      100
    ).toFixed(1)}%)`,
  );
  console.log(
    `Within-one agreement:  ${report.withinOne}/${report.total} (${(
      (report.withinOne / report.total) *
      100
    ).toFixed(1)}%)`,
  );
  console.log(`Mean absolute error:   ${report.meanAbsoluteError.toFixed(2)}`);
}
