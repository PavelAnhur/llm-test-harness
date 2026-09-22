import { label, noteWithLink } from "@allure/helpers";
import { ingestDoc } from "@rag/ingest";
import { contextPrecision } from "@rag/precision";
import { contextRecall } from "@rag/recall";
import { retrieve } from "@rag/retriever";
import { clearCollection } from "@rag/store";
import * as allure from "allure-js-commons";
import { Severity } from "allure-js-commons";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const FIXTURE_PATH = join(__dirname, "..", "fixtures", "hr-policy.txt");

const RELEVANT: Record<string, string[]> = {
  "How many vacation days do full-time employees get?": ["hr-policy:0"],
  "What is the sick leave policy?": ["hr-policy:1"],
  "Can employees work remotely?": ["hr-policy:2"],
  "How do I submit expenses for reimbursement?": ["hr-policy:3"],
  "What is the policy for both vacation and sick leave?": [
    "hr-policy:0",
    "hr-policy:1",
  ],
};

describe("RAG: retrieval metrics", () => {
  beforeAll(async () => {
    await clearCollection();
    const text = readFileSync(FIXTURE_PATH, "utf-8");
    await ingestDoc({ id: "hr-policy", text });
  }, 60_000);
  for (const [question, relevantIds] of Object.entries(RELEVANT)) {
    it(`retrieves the right chunks for: ${question}`, async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Metrics",
        story: "Context precision and recall",
        severity: Severity.NORMAL,
        tags: ["week-5", "rag", "retrieval"],
      });
      const retrieved = await retrieve(question, { k: 3 });
      const precision = contextPrecision({
        retrieved,
        relevantChunkIds: relevantIds,
      });
      const recall = contextRecall({
        retrieved,
        relevantChunkIds: relevantIds,
      });
      const topHit = retrieved[0]?.readableId;
      const precisionAt1 = topHit && relevantIds.includes(topHit) ? 1 : 0;
      await allure.parameter("question", question);
      await allure.parameter("precision@k", precision.score.toFixed(2));
      await allure.parameter("precision@1", String(precisionAt1));
      await allure.parameter("recall", recall.score.toFixed(2));
      await allure.attachment(
        "Retrieved chunks",
        JSON.stringify(
          retrieved.map((c) => ({
            id: c.readableId,
            score: c.score,
            text: c.text,
          })),
          null,
          2,
        ),
        allure.ContentType.JSON,
      );
      await allure.attachment(
        "Precision rationale",
        precision.rationale,
        allure.ContentType.TEXT,
      );
      await allure.attachment(
        "Recall rationale",
        recall.rationale,
        allure.ContentType.TEXT,
      );
      await noteWithLink(
        3,
        "retrieval--context-precision-and-recall",
        "Deterministic retrieval metrics. Precision = of the chunks " +
          "retrieved, how many were relevant. Recall = of the chunks " +
          "needed, how many were retrieved. Both compare exact chunk " +
          "IDs against hand-labeled ground truth, which is why the " +
          "chunker must be stable across runs.",
      );
      // Precision@k floor depends on how many chunks are relevant:
      //   one relevant chunk  → 1/3 of the top-3 should be relevant
      //   two relevant chunks → 2/3 of the top-3 should be relevant
      const expectedMinPrecision = relevantIds.length >= 2 ? 0.66 : 0.33;
      expect(precision.score).toBeGreaterThanOrEqual(
        expectedMinPrecision - 0.01,
      );
      expect(precisionAt1).toBe(1);
      expect(recall.score).toBe(1.0);
    });
  }
});
