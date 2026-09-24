## Week 2 — LLM-as-a-Judge calibration

Eight calibration rounds against the same 25-example hand-labeled
dataset. The rubric was rewritten four times. The judge model was
swapped once. The result:

| Round | Model | Rubric change               | Exact | Within-one | MAE  |
| ----- | ----- | --------------------------- | ----- | ---------- | ---- |
| 1     | 3B    | initial (lamp-specific)     | 32%   | 60%        | 1.28 |
| 2     | 3B    | generic A–D criteria        | 40%   | 80%        | 0.80 |
| 3     | 3B    | + E (next step)             | 48%   | 80%        | 0.72 |
| 4     | 3B    | + E/F split                 | 44%   | 84%        | 0.72 |
| 5     | 7B    | same rubric                 | 44%   | 88%        | 0.68 |
| 6     | 7B    | + "redirect is sufficient"  | 40%   | 84%        | 0.76 |
| 7     | 3B    | post-integration spot check | 80%   | 100%       | 0.20 |
| 8     | 3B    | full re-run, current rubric | 48%   | 88%        | 0.64 |

### The finding

Round 7 was a five-example spot check on the redirect class only,
after the rubric was finalized. Round 8 is the full 25-example
re-run. Round 8 is the number that represents the current state.

### What the numbers mean

Six rubric iterations moved exact agreement from 32% to 48%.
The last two rounds on the 3B model both land near 44–48%, and
within-one agreement stabilizes at 84–88%. This is the plateau.

The 7B model did not meaningfully improve over the 3B. Round 5
(7B) improved within-one by 4 points over Round 4 (3B) and left
exact agreement unchanged. Round 6 (7B, further rubric edits)
made everything worse. The 3B model is retained for the judge
role; the 7B model is not worth the resource cost.

### Known limitations

The Round 8 calibration found three examples off by two points.
All three share a shape, and the two shapes are different:

**The floor effect — price-05 and return-05.**
Both responses answer a different question than the one asked.
The rubric says they score 1 (no concrete answer, no redirect,
no next step). The judge scores them 3. The judge does not
reliably penalize "coherent but off-topic." It reads coherence
as partial credit.

**The redirect over-score — shipping-04.**
A response that says "enter your ZIP code at checkout to see
the delivery date" is a redirect in the human's reading, but
the judge reads it as a concrete answer and scores 5 instead
of 3. The customer does not yet have the delivery date, so the
human label is 3. The judge sees a path to the answer and
treats that path as the answer itself.

Neither is a specification gap. Further rubric iteration was
tested in Rounds 5 and 6 and made the judge worse. The remaining
disagreements are the model's interpretation of coherence and
of what counts as an answer, and no rubric wording changes that.

<details>
<summary><strong>View round 8 calibration output</strong></summary>

```console
npx tsx src/judge/calibrate.cli.ts
npm notice run llm-test-harness@0.1.0 npx
npm notice run 'tsx' src/judge/calibrate.cli.ts

=== Calibration report ===

✓ bulb-01        human=5 judge=5 diff=0
  rationale: The response provides a specific fact about the bulb included with the lamp.
~ bulb-02        human=4 judge=5 diff=1
  rationale: The response provides a concrete answer that directly addresses the question.
✓ bulb-03        human=3 judge=3 diff=0
  rationale: The response does not provide a concrete answer to the question.
~ bulb-04        human=2 judge=1 diff=1
  rationale: The response does not contain a concrete answer to the question.
✓ bulb-05        human=1 judge=1 diff=0
  rationale: The response does not provide a concrete answer to the question.
✓ price-01       human=5 judge=5 diff=0
  rationale: The response provides a concrete answer to the question and stays on topic.
~ price-02       human=4 judge=5 diff=1
  rationale: The response provides a specific price and stays on topic.
~ price-03       human=2 judge=3 diff=1
  rationale: The response does not provide a concrete answer to the customer's question.
✓ price-04       human=3 judge=3 diff=0
  rationale: The response does not provide a concrete answer to the question.
✗ price-05       human=1 judge=3 diff=2
  rationale: The response does not provide a concrete answer to the customer's question.
✓ return-01      human=5 judge=5 diff=0
  rationale: The response provides a clear and specific return policy, addresses the original question, and does not pivot to promote another product.
~ return-02      human=4 judge=5 diff=1
  rationale: The response provides a clear and specific answer to the question.
~ return-03      human=2 judge=3 diff=1
  rationale: The response does not provide a concrete answer to the question.
✓ return-04      human=3 judge=3 diff=0
  rationale: The response does not provide a concrete answer to the question.
✗ return-05      human=1 judge=3 diff=2
  rationale: The response does not provide a concrete answer to the customer's question.
✓ shipping-01    human=5 judge=5 diff=0
  rationale: The response provides a clear and specific answer to the question, addresses the actual question asked, and does not require the customer to ask again for the same information.
~ shipping-02    human=4 judge=5 diff=1
  rationale: The response provides a specific time frame for standard shipping.
~ shipping-03    human=2 judge=1 diff=1
  rationale: The response does not provide a concrete answer to the question.
✗ shipping-04    human=3 judge=5 diff=2
  rationale: The response provides a specific answer and redirects the customer to the checkout page where the exact delivery date will be shown.
✓ shipping-05    human=1 judge=1 diff=0
  rationale: The response does not provide a concrete answer to the question about shipping time.
✓ warranty-01    human=5 judge=5 diff=0
  rationale: The response provides a clear and specific answer to the question, including details on what is covered and what is not.
~ warranty-02    human=4 judge=5 diff=1
  rationale: The response provides a specific fact (the warranty duration) that addresses the customer's question directly.
~ warranty-03    human=2 judge=3 diff=1
  rationale: The response does not provide a concrete answer to the question.
✓ warranty-04    human=3 judge=3 diff=0
  rationale: The response does not provide a concrete answer to the question.
✓ warranty-05    human=1 judge=1 diff=0
  rationale: The response does not contain a concrete answer to the customer's question.

=== Summary ===

Total examples:        25
Exact agreement:       12/25 (48.0%)
Within-one agreement:  22/25 (88.0%)
Mean absolute error:   0.64
```

</details>

### What changed between calibration and integration

The original Week 2 finding was "the judge scores all redirects
as 1." That was true under the initial rubric. After the rubric
was iterated (criteria E and F added, "redirect is sufficient
for 3" clarified), four of the five redirect examples from the
dataset now score 3 — matching the human labels.

The blind spot did not get fixed. It changed shape. It is now
a narrower disagreement about one specific class of redirect
(those that describe a specific next action), not a general
disagreement about all redirects.

The lesson: calibration numbers are specific to the rubric
version they were collected against. Every rubric change moves
the disagreement rather than eliminating it.

### Decision

The judge is used in the test suite for regression detection on
direct answers. It is reliable within one point 88% of the time
and has a mean absolute error of 0.64 on a 1–5 scale. A two-point
shift on the same input is a signal; a one-point shift is noise.

### What I would do differently

Stop calibrating when the metric stops improving. Round 4 was
the last round where a rubric change helped. Rounds 5 and 6
were guesses. Writing down the plateau as a finding is the work;
continuing to add rubric clauses is fitting the rubric to the
dataset.

---

[← Back to notes index](./README.md)
