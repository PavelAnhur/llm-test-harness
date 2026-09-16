# Notes

Running log for the playwright-llm-tests project. Two weeks of
work on testing non-deterministic LLM outputs.

## Week 1 — Foundations of non-deterministic testing

[Read Week 1 in full →](./week-1.md)

| Day | Focus                     | Result                                      |
| --- | ------------------------- | ------------------------------------------- |
| 1   | Exact-match assertions    | 4/4 failed — demonstrated the trap          |
| 2   | Property-based assertions | 5/5 passed                                  |
| 3   | Multi-run harness         | 5/5 passed at 10 runs                       |
| 4   | Adversarial inputs        | 4/5 passed — indirect injection refused 0/5 |
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
