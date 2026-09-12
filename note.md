# Notes

Running log for the [playwright-llm-tests](./) project.

---

## Day 1 — Exact-match assertions fail against an LLM
- [`tests/smoke.test.ts`](./tests/smoke.test.ts)

**Setup:** `llama3.2:1b`, `temperature: 0.7`, 5 runs per prompt.

**Result:** 4 of 4 prompts failed. The baseline response matched the
first call and then diverged. In every case the model converged on a
different answer after the first request — not random per call, but
different from the "expected" value we captured.

**Takeaway:** The first response is not the truth. Encoding it as the
expected value turns a correct answer into a test failure.

<details>
<summary><strong>View test output</strong></summary>

```console
$ npm test

 RUN  v3.2.7 /home/pavel/projects/playwright-llm-tests

stdout | tests/day1-exact-match.spec.ts > Day 1 > a single color
Prompt:    Name a color. Reply with one word only.
Baseline:  "Red"
Runs:      "Red", "Blue", "Blue", "Blue", "Blue"
Matches:   1/5 (baseline appeared 1 time(s))
Distinct:  2

stdout | tests/day1-exact-match.spec.ts > Day 1 > a random number between 1 and 100
Prompt:    Give me a random number between 1 and 100. Reply with the number only.
Baseline:  "42"
Runs:      "42", "87", "12", "99", "3"
Matches:   1/5 (baseline appeared 1 time(s))
Distinct:  5

 ❯ tests/day1-exact-match.spec.ts (4 tests | 4 failed)
   × Day 1 > a single color
     → Expected all 5 runs to match the baseline. 2 distinct responses observed: Red, Blue
   × Day 1 > a random number between 1 and 100
     → Expected all 5 runs to match the baseline. 5 distinct responses observed: 42, 87, 12, 99, 3

 Test Files  1 failed (1)
      Tests  4 failed (4)
```
</details>
