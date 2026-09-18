import { StreamingClient } from "@stream/client";
import { MockStreamServer } from "@stream/mock-server";
import { describe, expect, it } from "vitest";

describe("Day 1: streaming basics", () => {
  it("receives all tokens in order", async () => {
    const server = new MockStreamServer({
      delayBeforeFirstToken: 20,
      delayBetweenTokens: 10,
      tokens: ["Hello", " ", "world", "!"],
    });
    await server.start();
    const client = new StreamingClient(server.url());
    const result = await client.start();
    expect(result.finalState).toBe("completed");
    expect(result.tokens).toEqual(["Hello", " ", "world", "!"]);
    expect(result.firstTokenAt).toBeDefined();
    await server.stop();
  });

  it("completes when the server sends [DONE] but keeps the connection open", async () => {
    const server = new MockStreamServer({
      delayBeforeFirstToken: 20,
      delayBetweenTokens: 10,
      tokens: ["Hello", " ", "world", "!"],
      keepAliveAfterDone: true,
    });
    await server.start();
    const client = new StreamingClient(server.url());
    const result = await client.start();
    expect(result.finalState).toBe("completed");
    expect(result.tokens).toEqual(["Hello", " ", "world", "!"]);
    await server.stop();
  });
});
