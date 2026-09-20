import { label, noteWithLink } from "@allure/helpers";
import { StreamingClient } from "@stream/client";
import { MockStreamServer } from "@stream/mock-server";
import * as allure from "allure-js-commons";
import { Severity } from "allure-js-commons";
import { describe, expect, it } from "vitest";

describe.each([
  { delay: 200, upper: 250 },
  { delay: 100, upper: 140 },
])("Day 2: TTFT with server delay $delay ms", ({ delay, upper }) => {
  it("measures TTFT within the expected band", async () => {
    await label({
      epic: "LLM Testing",
      feature: "Streaming",
      story: "Time to first token",
      severity: Severity.CRITICAL,
      tags: ["week-4", "streaming", "day-2", "ttft"],
    });
    const server = new MockStreamServer({
      delayBeforeFirstToken: delay,
      delayBetweenTokens: 10,
      tokens: ["a", "b", "c"],
    });
    await server.start();
    try {
      const client = new StreamingClient(server.url());
      const result = await client.start();
      const ttft = result.firstTokenAt! - result.startedAt!;
      await allure.parameter("ttftMs", String(ttft));
      await allure.parameter("serverDelayMs", String(delay));
      await noteWithLink(
        4,
        "day-2--time-to-first-token",
        `The mock server delays the first token by ${delay}ms. ` +
          "The client records startedAt before the fetch and " +
          "firstTokenAt when the first token arrives. TTFT is the " +
          "difference.",
      );
      expect(ttft).toBeGreaterThanOrEqual(delay);
      expect(ttft).toBeLessThanOrEqual(upper);
    } finally {
      await server.stop();
    }
  });
});
