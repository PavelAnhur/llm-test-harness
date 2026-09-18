## Week 4 — Streaming

Streaming tests differ in kind from Weeks 1–3. Those weeks tested
**what the model said**. Week 4 tests **how the model said it** —
the transport, timing, and lifecycle of a token-by-token response.

### Day 1 — Streaming basics

Two pieces of infrastructure:

- `StreamingClient` — opens an SSE connection, reads tokens as they
  arrive, records per-token timestamps, and returns a lifecycle
  result when the stream ends.
- `MockStreamServer` — serves a configurable SSE stream. Delays,
  token sequence, mid-stream disconnect, and keep-alive behavior
  are all controlled by the test.

**The finding:** the second test hung for fifteen minutes across
several debugging rounds, and the cause was not the client. It was
`server.close()` waiting for a socket the client had deliberately
left open. The client finished correctly. The teardown did not.

The fix was `closeAllConnections()` before `close()`. It forces
every open socket to close so the server can shut down regardless
of what clients are doing.

**The lesson:** a streaming test has two failure surfaces — the
client under test, and the test harness that runs it. Both can
hang. When a test times out, the first question is "which side is
waiting?" and the answer is not always the side under test.