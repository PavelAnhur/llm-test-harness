# playwright-llm-tests

A test harness for non-deterministic LLM outputs. Built with TypeScript
and Vitest.

> **Status:** work in progress. Week 2 of a 4-week build. See Roadmap.

📊 **View the latest Allure report** — https://pavelanhur.github.io/playwright-llm-tests/

---

## Why this exists

A conventional test asserts that a function returns an exact value. That
works when the function is deterministic. An LLM is not. Send the same
prompt twice and you get two different answers that mean the same thing.
Assert on the exact text and your test fails on a correct response —
which is worse than no test at all, because it teaches the team to ignore
the suite.

This repo is an answer to that problem. Instead of asserting on what the
model said, it asserts on the properties the response must have: valid
JSON, a field within range, a required entity present, no forbidden
content. Then it runs the same test many times and gates on a pass rate
rather than a single run.

## What's covered

| Area                 | What it tests                                                             |
| -------------------- | ------------------------------------------------------------------------- |
| Property assertions  | JSON schema, required and forbidden keys, numeric ranges, enum membership |
| Pass-rate thresholds | Multi-run execution with a configurable success floor                     |
| Adversarial inputs   | Prompt injection, boundary inputs, empty input, role confusion            |
| LLM-as-a-judge       | Rubric-based scoring, calibrated against a hand-labeled dataset           |
| Structured reporting | Allure reports with pass rate as an attachment, grouped by feature        |

## What this is not

- Not an LLM application. There is no UI, no chat, no product.
- Not a model. Nothing is trained, fine-tuned, or hosted here.
- Not a benchmark. No scores against a public leaderboard.
- Not a replacement for human review. The judge is calibrated against
  a hand-labeled sample, and its blind spots are documented in
  notes/week-2.md.

## Quick start

Clone the repository, install dependencies, and start Ollama with the
default model.

```bash
    git clone https://github.com/PavelAnhur/playwright-llm-tests.git
    cd playwright-llm-tests
    npm install
    cp .env.example .env
    ollama pull llama3.2:3b
    npm test

Generate and open the Allure report:

    npm run allure:full
    npm run allure:open
```

## Project structure

The full tree is available below. Click to expand.

<details>
<summary><strong>Expand full project structure</strong></summary>

```bash
    playwright-llm-tests/
    ├── src/
    │   ├── llm/
    │   │   └── client.ts              # provider-agnostic LLM wrapper
    │   ├── assertions/
    │   │   ├── schema.ts              # JSON schema validation
    │   │   ├── range.ts               # numeric range checks
    │   │   ├── shape.ts               # single-word and line-count checks
    │   │   └── safety.ts              # prompt-leak and injection detectors
    │   ├── harness/
    │   │   ├── multi-run.ts           # run N times, compute pass rate
    │   │   ├── thresholds.ts          # gate on pass rate
    │   │   └── allure.ts              # label, attachResult, note helpers
    │   ├── judge/
    │   │   ├── judge.ts               # rubric-based LLM-as-a-judge
    │   │   └── calibrate.ts           # agreement and MAE reporting
    │   └── config/
    │       └── notes.ts               # notes URL constants
    ├── tests/
    │   ├── day1-exact-match.test.ts   # exact-match failures
    │   ├── day2-properties.test.ts    # property-based assertions
    │   ├── day3-multi-run.test.ts     # pass-rate thresholds
    │   ├── day4-adversarial.test.ts   # prompt injection, role confusion
    │   └── fixtures/
    │       └── helpfulness-dataset.json  # 25 hand-labeled examples
    ├── notes/
    │   ├── README.md                  # summary and index
    │   ├── week-1.md                  # foundations of non-deterministic testing
    │   └── week-2.md                  # LLM-as-a-judge calibration
    ├── scripts/
    │   └── prepare-history.mjs        # preserve Allure trend across runs
    └── package.json
```

</details>

## Roadmap

| **Week** | **Focus**                                                       | **Status**  |
| :------- | :-------------------------------------------------------------- | :---------- |
| 1        | Property assertions, multi-run harness, adversarial inputs      | complete    |
| 2        | LLM-as-a-judge with calibration against a hand-labeled sample   | complete    |
| 3        | RAG metrics (faithfulness, answer relevance, context precision) | in progress |
| 4        | Streaming tests (SSE, TTFT, mid-stream disconnect)              | planned     |

Each week's full write-up lives in notes/. Every finding, every
calibration round, and every disagreement with the human labels is
documented there.

## Tech stack

- **TypeScript** — types matter more than usual when your subject is
  shape-shifting text.
- **Vitest** — the test runner and assertion framework.
- **Allure** — the report format. Pass rate appears as an attachment,
  not as pass/fail.
- **zod** — schema validation for structured LLM responses.
- **Ollama** — the local model runtime. llama3.2:3b is the default
  model for both tests and the judge.

## Running the tests in CI

CI runs typecheck and lint only. The LLM-dependent tests are not executed
in CI — they require a model running locally or a paid API key, and
running them on every push would be slow, expensive, and
non-deterministic.

The published Allure report is a snapshot from the last local run. It is
regenerated manually and pushed to the gh-pages branch.

A mocked LLM provider is planned for Week 3. Once it lands, CI will run
the full suite against recorded responses, and the report will regenerate
on every push without a model dependency.

## Contributing

This is a personal project. It is not looking for external contributions,
but issues and questions are welcome.
