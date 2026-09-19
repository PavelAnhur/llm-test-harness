import { readJsonFile } from "@utils/json";
import { judgeFaithfulness } from "./faithfulness";
import { judgeRelevance } from "./relevance";
import type {
  RagCalibrationReport,
  RagComparison,
  RagMetricInput,
  RagMetricResult,
  RagMetricSummary,
} from "./types";

const EXACT_TOLERANCE = 0.05;
const AGREEMENT_TOLERANCE = 0.2;

export interface RagDatasetExample {
  id: string;
  question: string;
  chunks: string[];
  answer: string;
  expectedFaithfulness: number;
  expectedRelevance: number;
}

export async function calibrateRag(
  datasetPath: string,
): Promise<RagCalibrationReport> {
  const dataset = readJsonFile<RagDatasetExample[]>(datasetPath);
  validateDataset(dataset);
  const comparisons: RagComparison[] = [];
  for (const example of dataset) {
    const input: RagMetricInput = {
      question: example.question,
      chunks: example.chunks,
      answer: example.answer,
    };
    const faithfulnessResult: RagMetricResult = await judgeFaithfulness(input);
    comparisons.push({
      id: example.id,
      metric: "faithfulness",
      expected: example.expectedFaithfulness,
      actual: faithfulnessResult.score,
      diff: Math.abs(faithfulnessResult.score - example.expectedFaithfulness),
      rationale: faithfulnessResult.rationale,
    });
    const relevanceResult: RagMetricResult = await judgeRelevance(input);
    comparisons.push({
      id: example.id,
      metric: "relevance",
      expected: example.expectedRelevance,
      actual: relevanceResult.score,
      diff: Math.abs(relevanceResult.score - example.expectedRelevance),
      rationale: relevanceResult.rationale,
    });
  }
  return summarise(comparisons);
}

function validateDataset(dataset: RagDatasetExample[]): void {
  if (dataset.length === 0) {
    throw new Error("RAG dataset is empty.");
  }
  const seen = new Set<string>();
  for (const entry of dataset) {
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate dataset id: ${entry.id}`);
    }
    seen.add(entry.id);
    if (entry.expectedFaithfulness < 0 || entry.expectedFaithfulness > 1) {
      throw new Error(
        `Entry ${entry.id}: expectedFaithfulness must be in [0, 1], got ${entry.expectedFaithfulness}`,
      );
    }
    if (entry.expectedRelevance < 0 || entry.expectedRelevance > 1) {
      throw new Error(
        `Entry ${entry.id}: expectedRelevance must be in [0, 1], got ${entry.expectedRelevance}`,
      );
    }
  }
}

function summarise(comparisons: RagComparison[]): RagCalibrationReport {
  const faithfulness = comparisons.filter((c) => c.metric === "faithfulness");
  const relevance = comparisons.filter((c) => c.metric === "relevance");
  return {
    total: faithfulness.length,
    byMetric: {
      faithfulness: summariseMetric(faithfulness),
      relevance: summariseMetric(relevance),
    },
    comparisons,
  };
}

function summariseMetric(comparisons: RagComparison[]): RagMetricSummary {
  const total = comparisons.length;
  if (total === 0) {
    return { exactMatches: 0, withinTolerance: 0, meanAbsoluteError: 0 };
  }
  const exactMatches = comparisons.filter(
    (c) => c.diff <= EXACT_TOLERANCE,
  ).length;
  const withinTolerance = comparisons.filter(
    (c) => c.diff <= AGREEMENT_TOLERANCE,
  ).length;
  const meanAbsoluteError =
    comparisons.reduce((sum, c) => sum + c.diff, 0) / total;
  return { exactMatches, withinTolerance, meanAbsoluteError };
}

export function printReport(report: RagCalibrationReport): void {
  console.log("\n=== RAG metric calibration ===\n");
  printMetricSection("FAITHFULNESS", report.comparisons, "faithfulness");
  printMetricSection("RELEVANCE", report.comparisons, "relevance");
  console.log("\n=== Summary ===\n");
  printSummary("Faithfulness", report.byMetric.faithfulness, report.total);
  printSummary("Relevance", report.byMetric.relevance, report.total);
}

function printMetricSection(
  header: string,
  comparisons: RagComparison[],
  metric: RagComparison["metric"],
): void {
  console.log(header);
  const filtered = comparisons.filter((c) => c.metric === metric);
  for (const c of filtered) {
    const marker =
      c.diff <= EXACT_TOLERANCE
        ? "✓"
        : c.diff <= AGREEMENT_TOLERANCE
          ? "~"
          : "✗";
    console.log(
      `${marker} ${c.id.padEnd(34)} expected=${c.expected.toFixed(2)} actual=${c.actual.toFixed(2)} diff=${c.diff.toFixed(2)}`,
    );
    if (c.diff > AGREEMENT_TOLERANCE) {
      console.log(`   rationale: ${c.rationale}`);
    }
  }
  console.log("");
}

function printSummary(
  name: string,
  summary: RagMetricSummary,
  total: number,
): void {
  const pct = (n: number) => ((n / total) * 100).toFixed(1);
  console.log(
    `${name.padEnd(14)} exact ${summary.exactMatches}/${total} (${pct(summary.exactMatches)}%)  ` +
      `within-0.2 ${summary.withinTolerance}/${total} (${pct(summary.withinTolerance)}%)  ` +
      `MAE ${summary.meanAbsoluteError.toFixed(2)}`,
  );
}
