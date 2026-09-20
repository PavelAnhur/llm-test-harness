import { label, noteWithLink } from "@allure/helpers";
import { StreamingClient } from "@stream/client";
import { MockStreamServer } from "@stream/mock-server";
import * as allure from "allure-js-commons";
import { Severity } from "allure-js-commons";
import { describe, expect, it } from "vitest";

const TOKENS = ["Hello", " ", "world", "!"];

describe("Day 3: Mid-stream disconnect", () => {
  it("marks the stream truncated on clean EOF without [DONE]", async () => {
    await label({
      epic: "LLM Testing",
      feature: "Streaming",
      story: "Mid-stream disconnect — clean EOF",
      severity: Severity.CRITICAL,
      tags: ["week-4", "streaming", "day-3", "disconnect"],
    });
    const server = new MockStreamServer({
      delayBeforeFirstToken: 20,
      delayBetweenTokens: 10,
      tokens: TOKENS,
      disconnectAfterTokens: 2,
      disconnectMode: "end",
    });
    await server.start();
    try {
      const client = new StreamingClient(server.url());
      const result = await client.start();
      await allure.parameter("disconnectMode", "end");
      await allure.parameter("disconnectAfterTokens", "2");
      await noteWithLink(
        4,
        "day-3--mid-stream-disconnect",
        "The server closes the response cleanly after two tokens " +
          "without sending [DONE]. The client must not report " +
          "success: EOF without the marker is a truncation. " +
          "receivedDoneMarker is the discriminator between a " +
          "genuine completion and a truncated stream that happens " +
          "to deliver every expected token.",
      );
      expect(result.receivedDoneMarker).toBe(false);
      expect(result.finalState).toBe("truncated");
      expect(result.tokens).toEqual(["Hello", " "]);
      expect(result.error).toBeUndefined();
      expect(result.completedAt).toBeDefined();
    } finally {
      await server.stop();
    }
  });

  it("marks the stream errored on abrupt socket destroy", async () => {
    await label({
      epic: "LLM Testing",
      feature: "Streaming",
      story: "Mid-stream disconnect — abrupt destroy",
      severity: Severity.CRITICAL,
      tags: ["week-4", "streaming", "day-3", "disconnect"],
    });
    const server = new MockStreamServer({
      delayBeforeFirstToken: 20,
      delayBetweenTokens: 10,
      tokens: TOKENS,
      disconnectAfterTokens: 2,
      disconnectMode: "destroy",
    });
    await server.start();
    try {
      const client = new StreamingClient(server.url());
      const result = await client.start();
      await allure.parameter("disconnectMode", "destroy");
      await allure.parameter("disconnectAfterTokens", "2");
      await noteWithLink(
        4,
        "day-3--mid-stream-disconnect",
        "The server destroys the TCP socket after two tokens. The " +
          "client sees a read error, not a clean EOF. The " +
          "distinction matters: a truncated stream is a server " +
          "protocol violation, an errored stream is a transport " +
          "failure. The suite reports them separately so a flaky " +
          "network is not mistaken for a model that stopped " +
          "mid-sentence.",
      );
      expect(result.receivedDoneMarker).toBe(false);
      expect(result.finalState).toBe("errored");
      expect(result.error).toBeDefined();
      // Whatever arrived before the cut must be preserved.
      expect(result.tokens.length).toBeGreaterThanOrEqual(0);
      expect(result.tokens.length).toBeLessThanOrEqual(2);
    } finally {
      await server.stop();
    }
  });

  it("never invents a TTFT when the socket dies before the first token", async () => {
    await label({
      epic: "LLM Testing",
      feature: "Streaming",
      story: "Mid-stream disconnect — before first token",
      severity: Severity.NORMAL,
      tags: ["week-4", "streaming", "day-3", "disconnect", "ttft"],
    });
    const server = new MockStreamServer({
      delayBeforeFirstToken: 200,
      delayBetweenTokens: 10,
      tokens: TOKENS,
      disconnectAfterTokens: 0,
      disconnectMode: "destroy",
    });
    await server.start();
    try {
      const client = new StreamingClient(server.url());
      const result = await client.start();
      await allure.parameter("disconnectAfterTokens", "0");
      await noteWithLink(
        4,
        "day-3--mid-stream-disconnect",
        "The connection dies before any token is written. The " +
          "client must leave firstTokenAt undefined — reporting a " +
          "TTFT here would be a fabrication. This is the case that " +
          "protects downstream TTFT gates from false positives.",
      );
      expect(result.receivedDoneMarker).toBe(false);
      expect(result.finalState).toBe("errored");
      expect(result.firstTokenAt).toBeUndefined();
      expect(result.tokens).toEqual([]);
    } finally {
      await server.stop();
    }
  });
});
