import { label, noteWithLink } from "@allure/helpers";
import { StreamingClient } from "@stream/client";
import * as allure from "allure-js-commons";
import { Severity } from "allure-js-commons";
import { describe, expect, it } from "vitest";

const BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
const PROMPT = "Reply with exactly the word: pong";

describe("Streaming: real-model smoke", () => {
  it(
    "streams tokens from a live Ollama model and completes cleanly",
    { timeout: 60_000 },
    async () => {
      await label({
        epic: "LLM Testing",
        feature: "Streaming",
        story: "Real-model smoke — Ollama NDJSON",
        severity: Severity.CRITICAL,
        tags: ["week-4", "streaming", "day-4", "smoke", "real-model"],
      });
      await allure.parameter("model", MODEL);
      await allure.parameter("baseUrl", BASE_URL);
      await allure.parameter("prompt", PROMPT);
      const client = new StreamingClient(`${BASE_URL}/api/chat`, {
        protocol: "ollama-ndjson",
        body: {
          model: MODEL,
          stream: true,
          options: { temperature: 0 },
          messages: [{ role: "user", content: PROMPT }],
        },
      });
      const result = await client.start();
      await allure.attachment(
        "Tokens",
        JSON.stringify(result.tokens, null, 2),
        allure.ContentType.JSON,
      );
      await allure.parameter(
        "ttftMs",
        result.firstTokenAt !== undefined
          ? String(result.firstTokenAt - result.startedAt)
          : "undefined",
      );
      await allure.parameter("tokenCount", String(result.tokens.length));
      await noteWithLink(
        4,
        "day-4--real-model-streaming-smoke",
        "Days 1-3 test the streaming client against a mock SSE " +
          "server, where timing is controlled and determinism is " +
          "the point. This test is the opposite: a live Ollama " +
          "model over NDJSON, where nothing about the timing is " +
          "controlled. The assertions are deliberately loose. The " +
          "mock suite owns precision; this test only proves the " +
          "client can speak to a real server at all.",
      );
      expect(result.finalState).toBe("completed");
      expect(result.receivedDoneMarker).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.tokens.join("").trim().length).toBeGreaterThan(0);
      // Per-token timestamps must be non-decreasing.
      const times = result.events.map((e) => e.receivedAt);
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]!);
      }
      // events and tokens must stay in lockstep.
      expect(result.events.length).toBe(result.tokens.length);
      expect(result.firstTokenAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      if (result.firstTokenAt !== undefined) {
        const ttft = result.firstTokenAt - result.startedAt;
        expect(ttft).toBeGreaterThanOrEqual(0);
        expect(ttft).toBeLessThan(30_000);
      }
    },
  );
});
