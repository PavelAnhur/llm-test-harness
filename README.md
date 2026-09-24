# llm-test-harness

A test harness for non-deterministic LLM outputs. Built with TypeScript
and Vitest.

> **Status:** complete. Five-week build. See Roadmap.

📊 **View the latest Allure report** — https://pavelanhur.github.io/llm-test-harness/

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
| RAG — generation     | Faithfulness (per-claim), relevance (documented limitation)               |
| RAG — retrieval      | Real retriever (Qdrant + Ollama embeddings), context precision and recall |
| Streaming            | Token delivery, time to first token, mid-stream disconnect, live smoke    |
| Structured reporting | Allure reports with pass rate as an attachment, grouped by feature        |

## What this is not

- Not an LLM application. There is no UI, no chat, no product.
- Not a model. Nothing is trained, fine-tuned, or hosted here.
- Not a benchmark. No scores against a public leaderboard.
- Not a replacement for human review. Every metric is calibrated against
  hand labels, and the limits of each are documented in the weekly
  write-ups under notes/.

## Quick start

Clone the repository, install dependencies, and start Ollama with the
default model.

```bash
    git clone https://github.com/PavelAnhur/llm-test-harness.git
    cd llm-test-harness
    npm install
    cp .env.example .env
    ollama pull llama3.2:3b
    ollama pull nomic-embed-text
    docker compose up -d
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
    llm-test-harness/
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
    │   │   └── thresholds.ts          # gate on pass rate
    │   ├── allure/
    │   │   └── helpers.ts             # label, noteWithLink, attachResult
    │   ├── judge/
    │   │   ├── types.ts               # judge result interfaces
    │   │   ├── judge.ts               # rubric-based LLM-as-a-judge
    │   │   ├── calibrate.ts           # agreement and MAE reporting
    │   │   └── calibrate.cli.ts       # CLI entry for calibration runs
    │   ├── rag/
    │   │   ├── types.ts               # shared RAG metric interfaces
    │   │   ├── prompt.ts              # shared prompt, format, parsers
    │   │   ├── embed.ts               # Ollama embeddings (nomic-embed-text)
    │   │   ├── store.ts               # Qdrant client — upsert, search
    │   │   ├── ingest.ts              # chunk + embed + upsert pipeline
    │   │   ├── retriever.ts           # question → top-K chunks
    │   │   ├── faithfulness.ts        # per-claim grounding metric
    │   │   ├── relevance.ts           # answer relevance metric
    │   │   ├── precision.ts           # context precision (deterministic)
    │   │   ├── recall.ts              # context recall (deterministic)
    │   │   ├── calibrate.ts           # agreement and MAE reporting
    │   │   └── calibrate.cli.ts       # CLI entry for calibration runs
    │   ├── stream/
    │   │   ├── types.ts               # StreamState, StreamEvent, StreamResult
    │   │   ├── client.ts              # SSE + Ollama NDJSON streaming client
    │   │   └── mock-server.ts         # configurable SSE mock server
    │   ├── utils/
    │   │   ├── json.ts                # JSON parse/format helpers
    │   │   └── path.ts                # path resolution helpers
    │   └── config/
    │       └── notes.ts               # notes URL constants
    ├── tests/
    │   ├── assertions/                # deterministic-style assertions on LLM output
    │   │   ├── exact-match.test.ts    # the trap: exact-match fails on correct answers
    │   │   ├── properties.test.ts     # schema, range, shape, safety
    │   │   └── multi-run.test.ts      # pass-rate thresholds
    │   ├── adversarial/               # inputs designed to break the model
    │   │   └── injection.test.ts      # prompt injection, role confusion
    │   ├── judge/                     # LLM-as-a-judge
    │   │   └── helpfulness.test.ts    # rubric scoring, calibrated
    │   ├── rag/                       # retrieval-augmented generation
    │   │   ├── generation.test.ts     # faithfulness, relevance (LLM judge)
    │   │   └── retrieval.test.ts      # precision, recall (deterministic)
    │   ├── streaming/                 # transport-level tests
    │   │   ├── basics.test.ts         # token delivery, ordering
    │   │   ├── ttft.test.ts           # time to first token
    │   │   ├── disconnect.test.ts     # truncation vs error
    │   │   └── smoke.test.ts          # live Ollama smoke test
    │   └── fixtures/
    │       ├── helpfulness-dataset.json  # 25 hand-labeled judge examples
    │       ├── rag-dataset.json          # 19 hand-labeled RAG examples
    │       └── hr-policy.txt             # source corpus for retrieval tests
    ├── notes/
    │   ├── README.md                  # summary and index
    │   ├── week-1.md                  # foundations of non-deterministic testing
    │   ├── week-2.md                  # LLM-as-a-judge calibration
    │   ├── week-3.md                  # RAG metrics
    │   ├── week-4.md                  # streaming
    │   └── week-5.md                  # real retriever and retrieval metrics
    ├── scripts/
    │   ├── prepare-history.mjs        # preserve Allure trend across runs
    │   ├── smoke-rag.ts               # end-to-end retriever verification
    │   └── inspect-chunks.ts          # print chunks produced by the chunker
    ├── docker-compose.yml             # Qdrant vector DB
    ├── eslint.config.mjs              # lint config
    ├── tsconfig.json                  # TypeScript config (path aliases)
    ├── vitest.config.ts               # Vitest config
    ├── package.json
    └── package-lock.json
```

</details>

## Roadmap

| **Week** | **Focus**                                                      | **Status** |
| :------- | :------------------------------------------------------------- | :--------- |
| 1        | Property assertions, multi-run harness, adversarial inputs     | complete   |
| 2        | LLM-as-a-judge with calibration against a hand-labeled sample  | complete   |
| 3        | RAG metrics (faithfulness, answer relevance)                   | complete   |
| 4        | Streaming tests (SSE, TTFT, mid-stream disconnect)             | complete   |
| 5        | Real retriever (Qdrant + embeddings), context precision/recall | complete   |

Each week's full write-up lives in [NOTES](./notes/). Every finding, every
calibration round, and every disagreement with the human labels is
documented there.

## Tech stack

- **TypeScript** — types matter more than usual when your subject is
  shape-shifting text.
- **Vitest** — the test runner and assertion framework.
- **Allure** — the report format. Pass rate appears as an attachment,
  not as pass/fail.
- **zod** — schema validation for structured LLM responses.
- **Qdrant** — vector database for the retriever, run via Docker.
- **Ollama** — the local model runtime. llama3.2:3b is the default
  model for both tests and the judge.

## Running the tests in CI

CI runs typecheck and lint only. The LLM-dependent tests are not executed
in CI — they require a model running locally or a paid API key, and
running them on every push would be slow, expensive, and
non-deterministic.

The published Allure report is a snapshot from the last local run. It is
regenerated manually and pushed to the gh-pages branch.

## Contributing

This is a personal project. It is not looking for external contributions,
but issues and questions are welcome.
