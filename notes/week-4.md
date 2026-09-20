## Week 4 — Streaming

Weeks 1–3 tested **what the model said**. Week 4 tests **how the
model said it** — the transport, timing, and lifecycle of a
token-by-token response.

The three things this week measures:

| Test                  | What it asserts                                              |
| --------------------- | ------------------------------------------------------------ |
| Token delivery        | Every token arrives, in order, once                          |
| Time to first token   | The client measures the delay correctly                      |
| Mid-stream disconnect | The client surfaces the error and keeps the partial response |

### Setup

Two pieces of test infrastructure:

- **`StreamingClient`** — opens an SSE connection, reads tokens as
  they arrive, records per-token timestamps, and returns a
  `StreamResult` with the final lifecycle state and buffered
  tokens.
- **`MockStreamServer`** — serves a configurable SSE stream.
  Delays, token sequence, mid-stream disconnect, and keep-alive
  behavior are all controlled by the test.

Every test in this week runs against the mock server, not the real
model. The reason is determinism. TTFT measured against a real
model on CPU is dominated by the model's load time and the
machine's throughput. A mock server emits tokens at a configured
rate, so a test can assert a specific band and mean it.

### Day 1 — Streaming basics

Two tests: the happy path and the keep-alive path.

| Test                                              | What it asserts                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| Receives all tokens in order                      | Four tokens arrive, in order, and the stream completes                |
| Completes after `[DONE]` with the connection open | The client exits the read loop on the marker, not on the socket close |

**The bug that took an hour to find.**

The second test hung for fifteen minutes. Every log showed the
client receiving the `[DONE]` marker and printing it. The client
code looked correct: a flag was set, the loop condition read the
flag, the inner loop broke. And yet the test timed out.

The bug was not in the client. It was in the test teardown.

The mock server's `stop()` method called `server.close()`. Node's
`server.close()` stops accepting new connections but waits for
existing ones to close. The test's connection was deliberately
kept open by `keepAliveAfterDone: true`. So `close()` waited for a
socket that would never close, and `close()` never called back.

The fix was one line: `server.closeAllConnections()` before
`server.close()`. That force-closes every open socket, and
`close()` completes immediately.

**The lesson.** A streaming test has two failure surfaces — the
client under test, and the test harness that runs it. Both can
hang. When a test times out, the first question is "which side is
waiting?" The answer is not always the side under test.

### Day 2 — Time to first token

TTFT is `firstTokenAt - startedAt`. `startedAt` is recorded before
the fetch call. `firstTokenAt` is recorded when the first token
arrives.

**Measurement first, assertion second.**

The mock server was configured to delay the first token by 200ms.
Ten runs produced:

    min: 203
    max: 229
    avg: 206.5

The floor is 203ms — the client cannot see a token before the
server sends it. The ceiling is 229ms — one run had a GC pause or
event-loop hiccup. Most runs land at 204–206ms.

The assertion band is `[200, 250]`. The lower bound is the server's
guarantee. The upper bound is the measured ceiling plus about
20ms of headroom.

**The second test.**

A band test on one delay value can pass for the wrong reason — a
client that hardcoded 205ms would pass. The second test uses a
100ms delay and asserts `[100, 150]`. Now the client has to
produce two different values for two different configured delays.
A hardcoded value fails one of the two.

**The finding.** The overhead of the localhost HTTP stack is small
and consistent — about 3–6ms in the steady state, with rare spikes
to 29ms. That is what makes a tight band possible. On a real
network, the overhead would be larger and the band would need to
be wider. Localhost is the correct environment for a client-side
timing test, and the numbers reflect that.

### Day 3 — Mid-stream disconnect

Three tests, one for each way a stream can end badly. All three
pass.

| Test                                                  | What it asserts                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Clean EOF without `[DONE]` marks the stream truncated | `finalState === "truncated"`, no error, partial tokens preserved         |
| Abrupt socket destroy marks the stream errored        | `finalState === "errored"`, error set, partial tokens preserved          |
| Socket dies before the first token invents no TTFT    | `firstTokenAt === undefined`, `tokens` empty, `finalState === "errored"` |

**Why truncation and error are different states.**

The first draft had a single failure state: `errored`. That is
wrong, and the test suite proved it. A stream that ends with a
clean EOF and no `[DONE]` marker is a _protocol_ failure — the
server closed politely but broke the SSE contract. A stream that
ends because the TCP socket was destroyed is a _transport_
failure — the network or the peer vanished. These have different
causes and different remediations. Collapsing them into one state
throws away the information a reader needs to tell "the model
stopped mid-sentence" apart from "the CI runner's network
hiccupped."

So `StreamState` gained a fifth value, `truncated`, and the client
distinguishes the two cases on the way out of the read loop:

- `receivedDoneMarker === true` → `completed`
- loop exited via `read()` returning `{ done: true }`, no marker →
  `truncated`
- `catch` fired → `errored`

**Why `receivedDoneMarker` lives on `StreamResult`.**

The marker is the only field that separates a genuine completion
from a truncation that happens to have delivered every expected
token. Without it, a test asserting `tokens.length === 4` would
pass on a stream that never sent `[DONE]` — the exact failure mode
Day 3 exists to catch. `receivedDoneMarker` is one boolean. It
belongs next to the tokens it qualifies, not in a side channel.

**The pre-first-token case.**

If the socket dies before any token is written, the client leaves
`firstTokenAt` undefined. Reporting a TTFT there would be a
fabrication, and it would poison the Day 2 gates — a stream that
never produced a first token would sail through a band assertion
if the client invented a plausible-looking number. The third test
asserts `firstTokenAt` is `undefined` specifically so a future
refactor cannot quietly reintroduce a default.

**The lesson.** Lifecycle state is not a boolean. "Did the stream
finish?" has at least three meaningful answers here — completed,
truncated, errored — and a test framework that only models two of
them will pass streams it should fail.

---

[← Back to notes index](./README.md)
