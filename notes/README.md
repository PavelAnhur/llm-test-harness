# Notes

Running log for the playwright-llm-tests project. Four weeks of
work on testing non-deterministic LLM outputs.

## Week 1 — Foundations of non-deterministic testing

[Read Week 1 in full →](./week-1.md)

| Day | Focus                     | Result                                      |
| --- | ------------------------- | ------------------------------------------- |
| 1   | Exact-match assertions    | 4/4 failed — demonstrated the trap          |
| 2   | Property-based assertions | 5/5 passed                                  |
| 3   | Multi-run harness         | 5/5 passed at 10 runs                       |
| 4   | Adversarial inputs        | 4/5 passed — indirect injection refused 1/5 |
| 5   | Allure integration        | 19 tests, published report                  |

## Week 2 — LLM-as-a-judge

[Read Week 2 in full →](./week-2.md)

| Round | Model | Exact | Within-one | MAE  |
| ----- | ----- | ----- | ---------- | ---- |
| 1     | 3B    | 32%   | 60%        | 1.28 |
| 2     | 3B    | 40%   | 80%        | 0.80 |
| 3     | 3B    | 48%   | 80%        | 0.72 |
| 4     | 3B    | 44%   | 84%        | 0.72 |
| 5     | 7B    | 44%   | 88%        | 0.68 |
| 6     | 7B    | 40%   | 84%        | 0.76 |
| 7     | 3B    | 80%   | 100%       | 0.20 |
| 8     | 3B    | 48%   | 88%        | 0.64 |

## Week 3 — RAG metrics

[Read Week 3 in full →](./week-3.md)

| Metric       | Exact | Within-0.2 | MAE  | Status                |
| ------------ | ----- | ---------- | ---- | --------------------- |
| Faithfulness | 79%   | 100%       | 0.04 | working               |
| Relevance    | 47%   | 47%        | 0.27 | documented limitation |

## Week 4 — Streaming

[Read Week 4 in full →](./week-4.md)

Streaming tests: token delivery, time to first token, mid-stream
disconnect. In progress.

| Day | Focus                      | Status   |
| --- | -------------------------- | -------- |
| 1   | Streaming basics           | complete |
| 2   | Time to first token        | complete |
| 3   | Mid-stream disconnect      | complete |
| 4   | Real-model streaming smoke | complete |

## Week 5 — Real retriever

[Read Week 5 in full →](./week-5.md)

A real retriever (Qdrant + Ollama embeddings) so the retrieval
half of RAG could be tested, not just the generation half.
Found that chunk overlap was pure cost on this corpus, and that
precision@1 is a sharper signal than precision@k.

| Metric                    | Result                              |
| ------------------------- | ----------------------------------- |
| Context recall            | 1.0 across all questions            |
| Context precision@1       | 1.0 across all questions            |
| Context precision@k (k=3) | 0.33 single-chunk, 0.67 cross-chunk |
