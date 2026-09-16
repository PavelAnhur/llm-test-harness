## Week 2 — LLM-as-a-Judge calibration

Six calibration rounds, all with the same 25-example hand-labeled
dataset. The rubric was rewritten four times. The judge model was
upgraded from llama3.2:3b to qwen2.5:7b. The results:

| Round | Model | Rubric change              | Exact | Within-one | MAE  |
| ----- | ----- | -------------------------- | ----- | ---------- | ---- |
| 1     | 3B    | initial (lamp-specific)    | 32%   | 60%        | 1.28 |
| 2     | 3B    | generic A–D criteria       | 40%   | 80%        | 0.80 |
| 3     | 3B    | + E (next step)            | 48%   | 80%        | 0.72 |
| 4     | 3B    | + E/F split                | 44%   | 84%        | 0.72 |
| 5     | 7B    | same rubric                | 44%   | 88%        | 0.68 |
| 6     | 7B    | + "redirect is sufficient" | 40%   | 84%        | 0.76 |

The plateau is real. After round 5, additional rubric clauses made
the judge worse, not better.

**Model size did not meaningfully improve agreement.** The 7B model
moved within-one agreement by 4 percentage points and left exact
agreement unchanged. The residual disagreement is a value question
(do redirects count as helpful?), not a capability question. The
3B model is retained for the judge role; the 7B model is not worth
the resource cost.

### The residual disagreement

Four examples remain off by two points. All four have the same
shape: a response that refuses to answer but redirects the customer
to a resource where the answer can be found. I score these 3. The
judge scores 1.

The judge sees the redirect. Its rationale names it. It scores 1
anyway. The judge believes a redirect is a deflection. I believe a
redirect is partial help. No rubric clause resolves this, because
the two of us are answering different questions about what
"helpful" means for this class of response.

### The finding

A judge calibrated to 44% exact agreement and 88% within-one
agreement is not a general-purpose evaluator. It is a **specific**
one. It is reliable for direct answers and clearly off-topic
responses. It is unreliable for redirects.

The correct use of this judge is:

- Run it on responses.
- Treat exact agreement as a signal, not ground truth.
- Flag any response the judge scores 1 for human review, because
  some of those will be redirects that a human would score 3.

The correct write-up is not "the judge works." It is "the judge
works within these bounds, and I measured the bounds."

### What I would do differently

Stop calibrating when the metric stops improving. Round 4 was the
last round where a rubric change helped. Rounds 5 and 6 were
guesses. Writing down the plateau as a finding is the work;
continuing to add rubric clauses is fitting the rubric to the
dataset.

---

[← Back to notes index](./README.md)
