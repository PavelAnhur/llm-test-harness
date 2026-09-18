## Week 3 — RAG metrics

Two metrics: faithfulness and relevance. One succeeded. One did not.
Both used the judge from Week 2.

### Setup

Mocked retriever. Each test provides its own chunks as a fixture,
as if the retriever had returned them. The LLM still runs against
those chunks, so the metrics measure the answer, not the retrieval.

Dataset: 19 entries, 3 questions (vacation, sick leave, remote work),
4 quadrants (grounded-and-relevant, grounded-but-irrelevant,
ungrounded-and-relevant, ungrounded-and-irrelevant). All labels
hand-written.

### Faithfulness — succeeded

Faithfulness measures whether every claim in the answer is
supported by the retrieved chunks.

| Iteration | Approach                | Exact | Within-0.2 | MAE  |
| --------- | ----------------------- | ----- | ---------- | ---- |
| 1         | whole-answer scoring    | 26%   | 37%        | 0.53 |
| 2         | per-claim decomposition | 68%   | 74%        | 0.19 |
| 3         | + splitter fixes        | 79%   | 100%       | 0.04 |

**The whole-answer approach failed.** Reading the rationales, the
judge marked every paraphrase as ungrounded: "accrue" vs "get",
"employees" vs "staff", "vacation days" vs "days off". The judge
was not doing semantic entailment — it was doing token matching.

This is not a rubric problem. It is a task the 3B model cannot
perform: comparing the meaning of a whole answer to the meaning
of a whole chunk set, while ignoring surface form.

**The fix was decomposition.** Instead of asking the judge to
score the whole answer, split the answer into individual claims
and ask the judge, one claim at a time, whether the claim is
supported by the chunks. Each call is a single-sentence
comparison. The model only has to hold one sentence in mind, and
it can do that.

Score = supported claims / total claims.

**The splitter mattered as much as the judge.** The first splitter
split only on `.`, `!`, `?`, `;`. A response like "20 days of
vacation and 10 sick days" was treated as one claim, and since
half of it was ungrounded, the whole claim failed. The splitter
was rewritten to also split on `,`, `and`, and `plus`, and to
strip leading conjunctions from fragments.

After the splitter fix, faithfulness agrees with the hand labels
within 0.2 on all 19 entries. Mean absolute error is 0.04.

### Relevance — did not succeed

Relevance measures whether the answer addresses the question that
was asked.

| Metric    | Exact | Within-0.2 | MAE  |
| --------- | ----- | ---------- | ---- |
| Relevance | 47%   | 47%        | 0.27 |

The failure pattern is consistent: **the judge names the wrong
population.** Given a question about full-time employees and an
answer about part-time employees, the judge writes in its
rationale that the answer "directly addresses the question about
full-time employees' vacation days." It hallucinates the
population name from the question and applies it to the answer.

This is not a rubric gap. The relevance rubric has an explicit
example for exactly this case, with a score of 0.1, and the judge
ignores it.

This is not a decomposition problem either. Relevance is a single
judgment on a single response; there is no compound structure to
split. The task is inherently one call, and the 3B model cannot
make it reliably when two similar populations are in play.

**Decision: document relevance as a limitation.** Three options
were considered:

1. Upgrade to a 7B model. This would work, but the resource cost
   was rejected in Week 2 and the same reasoning applies here.
2. Rewrite the dataset to remove the full-time/part-time contrast.
   This weakens the metric to fit the model, which is the wrong
   direction.
3. Document the limitation and defer.

Option 3 was chosen. The relevance metric as built is not usable
for regression detection on responses that distinguish similar
populations. That limitation is documented, and the metric is not
wired into the test suite.

### The finding

**Small models cannot do entailment in a single call, but they
can do it one claim at a time.**

The whole-answer faithfulness approach asked the 3B judge to
compare two long texts and produce a semantic judgment. It failed
at 26% exact agreement. The per-claim approach asked the same
model to compare one sentence to one chunk set, N times. It
succeeded at 79% exact and 100% within-tolerance.

This is a general lesson about using small models as judges:
**decompose the task until each call is a single comparison.**
The model's working memory is the constraint, not its reasoning.
Give it less to hold at once, and it performs.

The relevance metric did not have a natural decomposition, and it
did not succeed. That is the corollary: **when a task cannot be
decomposed, small models hit a hard ceiling.**

### What is not in Week 3

Context precision and context recall. These measure the retriever,
and the retriever is mocked. Building a real retriever is a
project of its own, and it was out of scope.

### What I would do differently

Test the whole-answer approach on one entry before building the
full calibration. A single hand-call would have shown that the
judge treats paraphrase as invention, and the decomposition would
have happened on day one instead of after a full calibration
round.
