# playwright-llm-tests

A test harness for non-deterministic LLM outputs. Built with TypeScript,
Playwright, and Vitest.

> **Status:** work in progress. Week 1 of a 4-week build. See [Roadmap](#roadmap).

---

## Why this exists

A conventional test asserts that a function returns an exact value:

```typescript
expect(calculateTotal([10, 20])).toBe(30);
```

That works because calculateTotal is deterministic. An LLM is not. Send
the same prompt twice and you get two different answers that mean the same
thing. Assert on the exact text and your test fails on a correct response —
which is worse than no test at all, because it teaches the team to ignore
the suite.

This repo is an answer to that problem. Instead of asserting on what the
model said, it asserts on the properties the response must have: valid
JSON, a field within range, a required entity present, no forbidden
content. Then it runs the same test many times and gates on a pass rate
rather than a single run.

## What's covered

| Area                 | What it tests                                                             |
|----------------------|---------------------------------------------------------------------------|
| Property assertions  | JSON schema, required and forbidden keys, numeric ranges, enum membership |
| Pass-rate thresholds | Multi-run execution with a configurable success floor                     |
| Adversarial inputs   | Prompt injection, boundary inputs, empty input, role confusion            |
| SQL verification     | Persisted state in the database matches what the response claims          |
| Structured reporting | Allure reports with pass rate as a parameter, grouped by feature          |
## What this is not

- Not an LLM application. There is no UI, no chat, no product.
- Not a model. Nothing is trained, fine-tuned, or hosted here.

- Not a benchmark. No scores against a public leaderboard.

- Not a replacement for human review. LLM-as-a-judge is used for some
checks, calibrated against a hand-labeled sample, and its limits are
documented in the tests.

## Quick start

```bash
git clone https://github.com/PavelAnhur/playwright-llm-tests.git
cd playwright-llm-tests
npm install
cp .env.example .env       # add your LLM API key
npm test

# generate and open Allure report
npm run test:allure
npm run allure:open

#run only the adversarial suite
npm run test:adversarial
```
#


## Project structure

<details>
<summary><strong>📂 Expand full project structure</strong></summary>

```bash
playwright-llm-tests/
├── src/
│   ├── llm/
│   │   └── client.ts            # thin wrapper around the LLM API
│   ├── assertions/
│   │   ├── schema.ts            # JSON schema validation helpers
│   │   ├── range.ts             # numeric and length bounds
│   │   └── forbidden.ts         # content the response must not contain
│   └── harness/
│       ├── multi-run.ts         # run N times, compute pass rate
│       └── thresholds.ts        # gate on pass rate, not single run
├── tests/
│   ├── properties.spec.ts       # structural assertions
│   ├── multi-run.spec.ts        # pass-rate thresholds
│   ├── adversarial.spec.ts      # prompt injection and boundary cases
│   └── db-verification.spec.ts  # SQL checks after generation
├── fixtures/
│   └── prompts.json             # reusable prompts with expected properties
├── notes.md                     # week-by-week reflection
└── package.json
```
</details>

## Roadmap

| **Week** |                                **Focus**                               |  **Status**|
|:--------|:-----------------------------------------------------------------------|:-----------|
|     1    | Property assertions, multi-run harness, adversarial inputs, SQL checks | in progress|
|     2    | LLM-as-a-judge with calibration against a hand-labeled sample          | planned    |
|     3    | RAG metrics (faithfulness, answer relevance, context precision)        | planned    |
|     4    | Streaming tests (SSE, TTFT, mid-stream disconnect)                     | planned    |

## Tech stack

**TypeScript** — types matter more than usual when your subject is shape-shifting text.\
**Vitest** — unit-style tests for assertions, harness logic, and small helpers.\
**Playwright Test** — the driver for anything that touches an API, a page, or a streaming endpoint.\
**Allure** — the report format. Pass rate appears as a parameter, not
as pass/fail.\
**zod** — schema validation for structured LLM responses.\
**Postgres client** — for verifying persisted state after generation.

## Running the tests in CI

The GitHub Actions workflow runs on every push:

1. Lint and typecheck.
2. Unit tests for assertion and harness logic.
3. Integration tests against a recorded LLM response set (no live API calls in CI, to keep the run deterministic and free).
4. Allure report published to GitHub Pages.
5. Live-API tests are excluded from CI on purpose. They are run locally before any change to an assertion or a prompt.

## Contributing

This is a personal project. It is not looking for external contributions,\
but issues and questions are welcome.

