# Notes

Running log for the [playwright-llm-tests](https://github.com/PavelAnhur/playwright-llm-tests) project.

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

stdout | tests/smoke.spec.ts > Day 1 > a single color
Prompt:    Name a color. Reply with one word only.
Baseline:  "Red"
Runs:      "Red", "Blue", "Blue", "Blue", "Blue"
Matches:   1/5 (baseline appeared 1 time(s))
Distinct:  2

stdout | tests/smoke.spec.ts > Day 1 > a random number between 1 and 100
Prompt:    Give me a random number between 1 and 100. Reply with the number only.
Baseline:  "42"
Runs:      "42", "87", "12", "99", "3"
Matches:   1/5 (baseline appeared 1 time(s))
Distinct:  5

 ❯ tests/smoke.spec.ts (4 tests | 4 failed)
   × Day 1 > a single color
     → Expected all 5 runs to match the baseline. 2 distinct responses observed: Red, Blue
   × Day 1 > a random number between 1 and 100
     → Expected all 5 runs to match the baseline. 5 distinct responses observed: 42, 87, 12, 99, 3

 Test Files  1 failed (1)
      Tests  4 failed (4)
```

</details>

## Day 2 — Property-based assertions pass

- [`day2-properties.test.ts`](./tests/day2-properties.test.ts)

**Setup:** same prompts, same model, same `temperature: 0.7`, 5 runs
per test.

**Result:** 5 of 5 tests passed. 25 model calls, 25 passing
assertions. The responses differed from each other, but every
response satisfied the property the test asserted.

**Takeaway:** The model was never the problem. The assertion was.
Replacing "the response equals X" with "the response has property
P" turns a flaky suite into a stable one, without pretending the
model became deterministic.

<details>
<summary><strong>View test output</strong></summary>

```console
$ npm test day2-properties.test.ts
npm notice run playwright-llm-tests@0.1.0 test
npm notice run vitest run day2-properties.test.ts

 RUN  v3.2.7 /home/pavel/projects/playwright-llm-tests

stdout | tests/day2-properties.test.ts > Day 2: property-based assertion against an LLM > always returns a single word when asked for a color
Run 1: Blue
Run 2: Blue
Run 3: Blue
Run 4: Blue
Run 5: Blue

stdout | tests/day2-properties.test.ts > Day 2: property-based assertion against an LLM > always return an integer in [1, 100] when asked for a number
Run 1: 19
Run 2: 62
Run 3: 14
Run 4: 14
Run 5: 34

stdout | tests/day2-properties.test.ts > Day 2: property-based assertion against an LLM > always returns a single word when asked for a fruit
Run 1: Apple
Run 2: Apple.
Run 3: Apple
Run 4: Apple
Run 5: Apple

stdout | tests/day2-properties.test.ts > Day 2: property-based assertion against an LLM > always returns exactly two non-empty lines when asked for a poem
Run 1:
Golden leaves fall soft and slow,
Crisp air whispers as the winds do blow.
---
Run 2:
As leaves fall, golden bright,
Autumn's fleeting beauty takes flight.
---
Run 3:
Golden leaves fall soft and slow,
Crimson hues upon the ground below.
---
Run 4:
Golden leaves fall slow and free,
Crisp air whispers secrets to me.
---
Run 5:
Golden leaves fall soft and slow,
Crisp air whispers as the winds go.
---

stdout | tests/day2-properties.test.ts > Day 2: property-based assertion against an LLM > returns valid JSON when asked for a structured output
Run 1:
{
  "color": "red",
  "hex": "#ff0000"
}
Run 2:
{
  "color": "red",
  "hex": "#ff0000"
}
Run 3:
{
  "color": "red",
  "hex": "#ff0000"
}
Run 4:
{
  "color": "red",
  "hex": "#ff0000"
}
Run 5:
{
  "color": "red",
  "hex": "#ff0000"
}

 ✓ tests/day2-properties.test.ts (5 tests) 4050ms
   ✓ Day 2: property-based assertion against an LLM > always returns a single word wahen asked for a clolr  501ms
   ✓ Day 2: property-based assertion against an LLM > always return an integer in [1, 100] when asked for a number 220ms
   ✓ Day 2: property-based assertion against an LLM > always returns a single word when asked for a fruit 220ms
   ✓ Day 2: property-based assertion against an LLM > always returns exactly two non-empty lines when asked for a poem  1377ms
   ✓ Day 2: property-based assertion against an LLM > returns valid JSON when asked for a structured output  1730ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  20:40:57
   Duration  4.56s (transform 86ms, setup 0ms, collect 182ms, tests 4.05s, environment 0ms, prepare 98ms)
```

</details>

### Failures observed

**Poem prompt — line count mismatch (1 run before fix).**
The original prompt `"Write a two-line poem about autumn."` produced a
response with a preamble line ("Here's a two-line poem about autumn:")
followed by the two lines. The assertion `expectLineCount(text, 2)`
correctly rejected this.

Two fixes were available:

1. Tighten the prompt: `"Write a two-line poem about autumn. Without
any intro. Just two lines."`
2. Loosen the assertion: extract the last two non-empty lines and
   assert on those.

I chose fix 1. The prompt's contract was ambiguous — a human writer
would also have added an intro. Clarifying the contract is the correct
fix; loosening the assertion would hide the ambiguity rather than
resolve it.

**Experiment:** reverting the prompt to the original and running 5x
produced [2/5 passes].

## Summary

Over four weeks, this repo builds a test harness for non-deterministic
LLM outputs. The journey starts by proving that exact-match assertions
fail against an LLM — the correct answer varies between runs. It
continues by replacing those assertions with properties that survive
rewording: schema, range, enum, shape.

**Day 1:** 0 of 4 tests passed. The model gave correct answers. The
assertions rejected them.

**Day 2:** 5 of 5 tests passed. The same prompts, the same temperature,
the same model. Only the assertions changed.

## Day 3 — Multi-run harness and pass-rate thresholds

- [`day3-multi-run.test.ts`](./tests/day3-multi-run.test.ts)

**Setup:** 10 runs per test, per-test thresholds (default 0.8), temperature 0.7,
`llama3.2:3b`.

**Result:** 5 of 5 tests passed at 10/10.

| Test    | Pass Rate | Distinct Responses |
| ------- | --------- | ------------------ |
| Color   | 10/10     | 1                  |
| Integer | 10/10     | 4                  |
| Fruit   | 10/10     | 4                  |
| Poem    | 10/10     | 9                  |
| JSON    | 10/10     | 2                  |

**Observation:** The pass rate is 100% across the board, but the
distinct responses confirm the model is not deterministic — nine
different poems, four different fruits, four different integers.
Every variation satisfies its property. This is the property-based
assertion working as designed.

**Observation (model size):** `llama3.2:3b` is measurably more
consistent than `llama3.2:1b` at the same temperature. The color
prompt returned "Blue" ten times in a row; the 1B model returned a
mix of "Blue" and "Blue.".

**Observation (schema tolerance):** The JSON test returned hex
codes in both upper and lower case. The schema regex is
case-insensitive by intent. The model's case inconsistency is
tolerated because both forms are valid hex representations.

<details>
<summary><strong>View test output</strong></summary>

```console
$ npm test day3-multi-run.test.ts
npm notice run playwright-llm-tests@0.1.0 test
npm notice run vitest run day3-multi-run.test.ts

 RUN  v3.2.7 /home/pavel/projects/playwright-llm-tests

stdout | tests/day3-multi-run.test.ts > Day 3: multi-run harness with pass-rate thresholds > return a single word (color) atleast 80% of the time
Pass rate: 10/10 (100.0%)
Threshold: 80%
Distinct: "Blue"

stdout | tests/day3-multi-run.test.ts > Day 3: multi-run harness with pass-rate thresholds > returns an integer in [1, 100] at least 90% of the time
Pass rate: 10/10 (100.0%)
Threshold: 90%
Distinct: "87", "82", "85", "53"

stdout | tests/day3-multi-run.test.ts > Day 3: multi-run harness with pass-rate thresholds > returns a single word (fruit) at least 80% of the time
Pass rate: 10/10 (100.0%)
Threshold: 80%
Distinct: "Apple", "Orange", "Banana", "Strawberry"

stdout | tests/day3-multi-run.test.ts > Day 3: multi-run harness with pass-rate thresholds > returns exactly two lines (poem) at least 70% of the time
Pass rate: 10/10 (100.0%)
Threshold: 70%
Distinct: "Golden leaves fall to the ground, Nature's final dance be...", "Golden leaves fall slow and bright, Autumn's hue, a fleet...", "Golden leaves fall slow and bright, Autumn's hue paints t...", "Golden leaves fall slow and bright, Autumn's hue, afadin...", "Golden leaves fall slow and bright, Autumn's chill brings...", "Golden leaves fall slow and bright, Autumn's hue upon the...", "Golden leaves fall slow and free, Autumn's hue upon the t...", "Golden leaves fall slow and bright, Autumn's hue, a final...", "Golden leaves fall slow and cold, Autumn's whisper, young..."

stdout | tests/day3-multi-run.test.ts > Day 3: multi-run harness with pass-rate thresholds > returns valid JSON (color + hex) at least 90% of the time
Pass rate: 10/10 (100.0%)
Threshold: 90%
Distinct: "{"color": "red", "hex": "#FF0000"}", "{"color": "red", "hex": "#ff0000"}"

 ✓ tests/day3-multi-run.test.ts (5 tests) 12245ms
   ✓ Day 3: multi-run harness with pass-rate thresholds > return a single word (color) atleast 80% of the time  914ms
   ✓ Day 3: multi-run harness with pass-rate thresholds > returns an integer in [1, 100] at least 90% of the time  711ms
   ✓ Day 3: multi-run harness with pass-rate thresholds > returns a single word (fruit) at least 80% of the time  811ms
   ✓ Day 3: multi-run harness with pass-rate thresholds > returns exactly two lines (poem) at least 70% of the time  5124ms
   ✓ Day 3: multi-run harness with pass-rate thresholds > returns valid JSON (color + hex) at least 90% of the time  4683ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  16:41:24
   Duration  12.74s (transform 100ms, setup 0ms, collect 190ms, tests 12.25s, environment 0ms, prepare 97ms)
```

</details>
