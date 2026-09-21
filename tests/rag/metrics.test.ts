import { label, noteWithLink } from "@allure/helpers";
import { judgeFaithfulness } from "@rag/faithfulness";
import { judgeRelevance } from "@rag/relevance";
import { type RagMetricInput, type RagMetricResult } from "@rag/types";
import * as allure from "allure-js-commons";
import { Severity } from "allure-js-commons";
import { describe, expect, it } from "vitest";

describe("RAG: metrics", () => {
  describe("Faithfulness", () => {
    it("scores a fully grounded answer at or above 0.9", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Metrics",
        story: "Faithfulness — fully grounded",
        severity: Severity.NORMAL,
        tags: ["week-3", "rag", "faithfulness"],
      });
      const input: RagMetricInput = {
        question: "How many vacation days do full-time employees get?",
        chunks: [
          "Full-time employees accrue 20 days of paid vacation per year.",
          "Part-time employees accrue vacation proportional to hours worked.",
        ],
        answer: "Full-time staff are entitled to 20 paid days off each year.",
      };
      const result: RagMetricResult = await judgeFaithfulness(input);
      await allure.parameter("faithfulnessScore", String(result.score));
      await allure.attachment(
        "Input",
        JSON.stringify(input, null, 2),
        allure.ContentType.JSON,
      );
      await allure.attachment(
        "Per-claim breakdown",
        result.rationale,
        allure.ContentType.TEXT,
      );
      await noteWithLink(
        3,
        "faithfulness--succeeded",
        "Faithfulness measures whether every claim in the answer is " +
          "supported by the retrieved chunks. Score = supported claims / " +
          "total claims. This entry has one claim, fully grounded in the " +
          "chunks.",
      );
      expect(
        result.score,
        `Per-claim breakdown: ${result.rationale}`,
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("scores a partially grounded answer between 0.3 and 0.7", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Metrics",
        story: "Faithfulness — partially grounded",
        severity: Severity.NORMAL,
        tags: ["week-3", "rag", "faithfulness"],
      });
      const input: RagMetricInput = {
        question: "How many vacation days do full-time employees get?",
        chunks: [
          "Full-time employees accrue 20 days of paid vacation per year.",
        ],
        answer:
          "Full-time employees get 20 days of vacation per year, plus 10 sick days.",
      };
      const result: RagMetricResult = await judgeFaithfulness(input);
      await allure.parameter("faithfulnessScore", String(result.score));
      await allure.attachment(
        "Input",
        JSON.stringify(input, null, 2),
        allure.ContentType.JSON,
      );
      await allure.attachment(
        "Per-claim breakdown",
        result.rationale,
        allure.ContentType.TEXT,
      );
      await noteWithLink(
        3,
        "faithfulness--succeeded",
        "This answer mixes a grounded claim (20 days of vacation, present " +
          "in the chunks) with an ungrounded claim (10 sick days, not in " +
          "the chunks). Expected score is 0.5 — one of two claims grounded.",
      );
      expect(result.score).toBeGreaterThanOrEqual(0.3);
      expect(result.score).toBeLessThanOrEqual(0.7);
    });
  });

  describe("Relevance", () => {
    it("scores a relevant answer at or above 0.9", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Metrics",
        story: "Relevance — relevant answer",
        severity: Severity.MINOR,
        tags: ["week-3", "rag", "relevance"],
      });
      const input: RagMetricInput = {
        question: "How many vacation days do full-time employees get?",
        chunks: [
          "Full-time employees accrue 20 days of paid vacation per year.",
        ],
        answer: "Full-time employees get 20 days of paid vacation per year.",
      };
      const result: RagMetricResult = await judgeRelevance(input);
      await allure.parameter("relevanceScore", String(result.score));
      await allure.attachment(
        "Input",
        JSON.stringify(input, null, 2),
        allure.ContentType.JSON,
      );
      await allure.attachment(
        "Judge rationale",
        result.rationale,
        allure.ContentType.TEXT,
      );
      await noteWithLink(
        3,
        "relevance--did-not-succeed",
        "Relevance is at 47% exact agreement with hand labels. The 3B " +
          "judge cannot reliably distinguish similar populations " +
          "(full-time vs part-time). Documented as a model limitation, " +
          "not a rubric gap. This test asserts a case the judge handles " +
          "correctly.",
      );
      expect(result.score).toBeGreaterThanOrEqual(0.9);
    });

    it("scores a grounded but irrelevant answer at or below 0.4", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Metrics",
        story: "Relevance — grounded but irrelevant",
        severity: Severity.MINOR,
        tags: ["week-3", "rag", "relevance", "known-limitation"],
      });
      const input: RagMetricInput = {
        question: "How many vacation days do full-time employees get?",
        chunks: [
          "Full-time employees accrue 20 days of paid vacation per year.",
          "Part-time employees accrue vacation proportional to hours worked.",
        ],
        answer:
          "Part-time employees accrue vacation proportional to hours worked.",
      };
      const result: RagMetricResult = await judgeRelevance(input);
      await allure.parameter("relevanceScore", String(result.score));
      await allure.attachment(
        "Input",
        JSON.stringify(input, null, 2),
        allure.ContentType.JSON,
      );
      await allure.attachment(
        "Judge rationale",
        result.rationale,
        allure.ContentType.TEXT,
      );
      await allure.attachment(
        "Human label",
        "0.1 — the answer is grounded in the chunks but addresses " +
          "part-time employees, not the full-time employees the question " +
          "asked about.",
        allure.ContentType.TEXT,
      );
      await noteWithLink(
        3,
        "relevance--did-not-succeed",
        "This test is a candidate for the known limitation. The 3B judge " +
          "often scores this case at 1.0 because it hallucinates the " +
          "population name from the question. See notes/week-3.md.",
      );
      expect(result.score).toBeLessThanOrEqual(0.4);
    });
  });
});
