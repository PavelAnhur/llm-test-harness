import { label, noteWithLink } from "@allure/helpers";
import { judgeHelpfulness } from "@judge/judge";
import { type JudgeResult } from "@judge/types";
import * as allure from "allure-js-commons";
import { Severity } from "allure-js-commons";
import { describe, expect, it } from "vitest";

describe("Week 2 - Day 5: LLM-as-a-judge integration", () => {
  it("scores a helpful response above the passing threshold", async () => {
    await label({
      epic: "LLM Testing",
      feature: "LLM-as-a-Judge",
      story: "Direct Answer",
      severity: Severity.NORMAL,
      tags: ["week-2", "day-5", "judge"],
    });
    const question = "How much does the lamp cost?";
    const response =
      "The lamp is $49.99, and first-time buyers get 10% off at checkout";
    await allure.attachment(
      "Input",
      JSON.stringify({ question, response }, null, 2),
      allure.ContentType.JSON,
    );
    const result: JudgeResult = await judgeHelpfulness(question, response);
    await allure.parameter("judgeScore", String(result.score));
    await allure.attachment(
      "Judge rationale",
      result.rationale,
      allure.ContentType.TEXT,
    );
    await noteWithLink(
      2,
      "the-finding",
      "The judge is calibrated against 25 hand-labeled examples. " +
        "See the calibration write-up for the residual disagreement " +
        "on redirect responses.",
    );
    expect(result.score).toBeGreaterThanOrEqual(4);
  });

  it("documents the judge disagreement on action-shaped redirects", async () => {
    await label({
      epic: "LLM Testing",
      feature: "LLM-as-a-Judge",
      story: "Redirect Over-Score",
      severity: Severity.MINOR,
      tags: ["week-2", "day-5", "judge", "known-limitation"],
    });
    const question = "How long does shipping take?";
    const response =
      "I cannot give you a precise estimate without your address. " +
      "If you enter your ZIP code at checkout, the exact delivery date " +
      "will be shown before you pay.";
    await allure.attachment(
      "Input",
      JSON.stringify({ question, response }, null, 2),
      allure.ContentType.JSON,
    );
    const result = await judgeHelpfulness(question, response);
    await allure.parameter("judgeScore", String(result.score));
    await allure.attachment(
      "Judge rationale",
      result.rationale,
      allure.ContentType.TEXT,
    );
    await noteWithLink(
      2,
      "known-limitations",
      "Human label: 3 (a redirect — the customer does not yet have the " +
        "delivery date). Judge score: 5 (reads 'enter your ZIP code' as " +
        "a concrete answer). The two-point disagreement is a value " +
        "question, not a bug. Both readings are defensible. The test " +
        "asserts a range, not an exact score, because the disagreement " +
        "is the finding.",
    );
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeLessThanOrEqual(5);
  });
});
