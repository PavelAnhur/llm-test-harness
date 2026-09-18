import { judgeFaithfulness } from "@rag/faithfulness";
import { judgeRelevance } from "@rag/relevance";
import { type RagMetricInput, type RagMetricResult } from "@rag/types";
import * as allure from "allure-js-commons";
import { describe, expect, it } from "vitest";

describe("Day 1: RAG metrics", () => {
  describe("Faithfulness", () => {
    it("scores a fully grounded answer at or above 0.9", async () => {
      const input = {
        question: "How many vacation days do full-time employees get?",
        chunks: [
          "Full-time employees accrue 20 days of paid vacation per year.",
          "Part-time employees accrue vacation proportional to hours worked.",
        ],
        answer: "Full-time employees get 20 days of paid vacation per year.",
      } as RagMetricInput;
      const result: RagMetricResult = await judgeFaithfulness(input);
      await allure.parameter("faithfulnessScore", String(result.score));
      await allure.attachment(
        "Judge rationale",
        result.rationale,
        allure.ContentType.TEXT,
      );
      expect(
        result.score,
        `Judge rationale: ${result.rationale}`,
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("scores a partially grounded answer between 0.3 and 0.7", async () => {
      const input = {
        question: "How many vacation days do full-time employees get?",
        chunks: [
          "Full-time employees accrue 20 days of paid vacation per year.",
        ],
        answer:
          "Full-time employees get 20 days of vacation per year, plus 10 sick days.",
      } as RagMetricInput;
      const result: RagMetricResult = await judgeFaithfulness(input);
      await allure.parameter("faithfulnessScore", String(result.score));
      await allure.attachment(
        "Judge rationale",
        result.rationale,
        allure.ContentType.TEXT,
      );
      // 20 vacation days is grounded. 10 sick days is not.
      // Expected score around 0.5.
      expect(result.score).toBeGreaterThanOrEqual(0.3);
      expect(result.score).toBeLessThanOrEqual(0.7);
    });
  });

  describe("Relevance", () => {
    it("evaluates whether an answer addresses the question", async () => {
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
        "Judge rationale",
        result.rationale,
        allure.ContentType.TEXT,
      );
      expect(result.score).toBeGreaterThanOrEqual(0.9);
    });

    it("evaluates whether an answer grounded but irrelevant", async () => {
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
        "Judge rationale",
        result.rationale,
        allure.ContentType.TEXT,
      );
      expect(result.score).toBeLessThanOrEqual(0.4);
    });
  });
});
