import { label, noteWithLink } from "@allure/helpers";
import { StreamingClient } from "@stream/client";
import { MockStreamServer, type MockServerConfig } from "@stream/mock-server";
import { Severity } from "allure-js-commons";
import { describe, expect, it } from "vitest";

const BASE_CONFIG: MockServerConfig = {
  delayBeforeFirstToken: 20,
  delayBetweenTokens: 10,
  tokens: ["Hello", " ", "world", "!"],
};

describe("Streaming: basics", () => {
  it("receives all tokens in order", async () => {
    await label({
      epic: "LLM Testing",
      feature: "Streaming",
      story: "Token delivery — happy path",
      severity: Severity.CRITICAL,
      tags: ["week-4", "streaming", "day-1"],
    });
    const server = new MockStreamServer(BASE_CONFIG);
    await server.start();
    try {
      const client = new StreamingClient(server.url());
      const result = await client.start();
      await noteWithLink(
        4,
        "day-1--streaming-basics",
        "The client opens an SSE connection, reads tokens as they " +
          "arrive, and returns a StreamResult when the stream ends. " +
          "This test asserts the simplest path: tokens arrive, in " +
          "order, and the stream completes.",
      );
      expect(result.finalState).toBe("completed");
      expect(result.tokens).toEqual(["Hello", " ", "world", "!"]);
      expect(result.firstTokenAt).toBeDefined();
    } finally {
      await server.stop();
    }
  });

  it("completes when the server sends [DONE] but keeps the connection open", async () => {
    await label({
      epic: "LLM Testing",
      feature: "Streaming",
      story: "Token delivery — keep-alive after [DONE]",
      severity: Severity.NORMAL,
      tags: ["week-4", "streaming", "day-1"],
    });
    const server = new MockStreamServer({
      ...BASE_CONFIG,
      keepAliveAfterDone: true,
    });
    await server.start();
    try {
      const client = new StreamingClient(server.url());
      const result = await client.start();
      await noteWithLink(
        4,
        "day-1--streaming-basics",
        "The server sends [DONE] but does not close the connection. " +
          "The client must exit the read loop on the marker, not on " +
          "the socket close. Before this test existed, the client " +
          "hung on the second read() forever.",
      );
      expect(result.finalState).toBe("completed");
      expect(result.tokens).toEqual(["Hello", " ", "world", "!"]);
    } finally {
      await server.stop();
    }
  });
});
