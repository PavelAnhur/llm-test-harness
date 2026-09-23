## Week 5 — A real retriever

Weeks 1–4 tested the _model_. Week 3 added faithfulness and
answer relevance, but both of those score the **answer** the
model produced. Neither of them looks at where the answer came
from.

That was the gap. To test retrieval — the half of RAG that
decides what the model is allowed to see — I needed a retriever
that actually retrieves. Not a stub, not a fixture. A real one.

So this week I built one, and then tested it.

### What "real" means here

The retriever stack, end to end:

| Layer           | Choice                             | Why                                                              |
| --------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Vector database | Qdrant (Docker)                    | Real server, real API, real persistence. Not an in-memory array. |
| Embeddings      | `nomic-embed-text` via Ollama      | Real embedding model, 768 dimensions. Not a mock.                |
| Chunking        | Paragraph-first, sentence-fallback | Deterministic IDs, readable in the dataset.                      |
| Generation      | `llama3.2:3b` via Ollama           | The same model the rest of the suite uses.                       |

The only thing not built is a reranker and hybrid search.
Those are follow-ups, not omissions, and they're named as such
in the roadmap.

### The four RAG metrics, and which half each one watches

RAG has two halves, and they fail differently.

| Metric            | Half       | What it needs                                        |
| ----------------- | ---------- | ---------------------------------------------------- |
| Faithfulness      | Generation | answer + retrieved chunks                            |
| Answer relevance  | Generation | answer + question                                    |
| Context precision | Retrieval  | question + retrieved chunks + ground-truth chunk IDs |
| Context recall    | Retrieval  | question + retrieved chunks + ground-truth chunk IDs |

Precision and recall are the two new ones, and they're
**deterministic** — no LLM judge. Both are set arithmetic
against hand-labeled ground truth:

    precision = |retrieved ∩ relevant| / |retrieved|
    recall    = |retrieved ∩ relevant| / |relevant|

Precision answers "of the chunks the retriever returned, how
many were actually relevant?" Recall answers "of the chunks
needed to answer, how many did the retriever return?"

The distinction is the whole point. Low precision means the
generator is drowning in noise. Low recall means the answer was
unreachable no matter how good the generator is. Those are
different bugs with different fixes, and a single "relevance"
score would hide the difference.

### Ground truth is the hard part

The metrics are set arithmetic, which means they need a set to
compare against. That set has to be built by hand.

The workflow:

1. Write the source document (`tests/fixtures/hr-policy.txt`)
2. Ingest it, and read every chunk the chunker produced
3. Decide, by hand, which chunks contain the answer to each question
4. Only then can precision and recall mean anything

That step 3 is where the project stops being code and starts
being judgment. Every metric is a measurement of _something_,
and if the reference set is wrong, the numbers are wrong in a
way no assertion will catch.

### The chunking decision, with numbers

Chunking is the choice that quietly determines everything
downstream. Too small, and a chunk loses the context that makes
it meaningful. Too large, and one chunk spans several topics,
which makes ground-truth labeling ambiguous.

The first version of the chunker used a 64-character overlap —
a common default, on the theory that if an answer straddles a
chunk boundary, both chunks should contain the relevant text.

The first run produced four chunks. It also produced one
thing worth looking at: **chunk 1 started with the last 64
characters of chunk 0.** Every chunk after the first opened
with a sentence fragment that belonged to the previous topic.

That's what overlap does. The question is whether it earns its
place.

So I ran the retrieval tests twice — once at overlap 64, once
at overlap 0 — and compared.

| Question    | Overlap 64 | Overlap 0  |
| ----------- | ---------- | ---------- |
| vacation    | 0.33 / 1.0 | 0.33 / 1.0 |
| sick leave  | 0.33 / 1.0 | 0.33 / 1.0 |
| remote      | 0.33 / 1.0 | 0.33 / 1.0 |
| expenses    | 0.33 / 1.0 | 0.33 / 1.0 |
| cross-chunk | 0.67 / 1.0 | 0.67 / 1.0 |

Precision and recall, at k=3, before and after. **Identical.**

Overlap changed nothing on this corpus. And there's a specific
reason why: every paragraph is shorter than the 512-character
chunk size, so every paragraph becomes exactly one chunk. The
chunk boundaries fall at paragraph breaks, which are natural
semantic boundaries. There are no answers straddling a cut,
because there are no cuts inside a paragraph.

Overlap is a solution to a problem this corpus does not have.
Keeping it means paying for it anyway — 65 characters of
duplicate text per chunk, a fragment at the head of every chunk
after the first, and a ground-truth labeling question that has
no clean answer ("chunk 1 contains vacation content, but is it
relevant to a vacation question?").

So overlap stays at 0. Not because 64 was wrong in general, but
because on this corpus it was measurably pure cost.

The finding is the measurement, not the number. If I later add
long documents where a paragraph must be split, I'll re-run the
comparison, and I expect overlap to matter there. That
expectation is now testable, which is the point.

### What the metrics found

With the retriever in place and overlap at 0, five questions,
k=3:

| Question              | precision@k | precision@1 | recall |
| --------------------- | ----------- | ----------- | ------ |
| vacation              | 0.33        | 1           | 1.0    |
| sick leave            | 0.33        | 1           | 1.0    |
| remote                | 0.33        | 1           | 1.0    |
| expenses              | 0.33        | 1           | 1.0    |
| vacation + sick leave | 0.67        | 1           | 1.0    |

Three things worth reading off this table.

**Recall is 1.0 for every question.** The retriever always
found the chunk that contained the answer. That's the
floor — if recall were below 1.0 on a single-topic question,
the retriever would be broken, not imperfect.

**Precision@1 is 1 for every question.** The _top-ranked_
chunk was always relevant. This is the sharper signal:
it says the ranking works, not just the search.

**Precision@3 is 0.33 for single-chunk questions and 0.67 for
the cross-chunk one.** At k=3 with one relevant chunk, 1/3 is
the maximum possible — the other two results are, by
construction, not in the reference set. The cross-chunk
question needs two chunks, and the retriever returned both, so
2/3 of the top-3 are relevant.

The cross-chunk question is the only case in the table where
precision and recall say _different_ things. Without it, every
row would be identical and the metrics would be measuring
nothing more interesting than "did search work." With it, the
table shows the actual shape of the tradeoff: more relevant
chunks needed → higher precision at the same k → recall stays
at 1.0 because the retriever found them all.

### What precision@k is and isn't

A precision of 0.33 looks bad. It isn't. It's arithmetic.

k=3 and one relevant chunk means the maximum precision is 1/3,
unless the retriever stops returning irrelevant chunks, which
it can't — the ground truth says only one chunk is relevant, and
the retriever is asked for three. Precision@3 on a single-answer
question is diluted by design.

This is why precision@1 was added alongside it. Precision@1 has
no dilution: the top result is either relevant or it isn't. A
regression that reordered the results would show up in
precision@1 immediately, whereas it might hide in precision@3,
where two irrelevant chunks mask a ranking failure.

Both metrics are in the test. They answer different questions:

- **precision@1** — did the retriever rank the right chunk first?
- **precision@k** — of the context the generator receives, how much is usable?

### A bug worth writing down

The chunker had a real bug during development, and it's the
kind that would have silently corrupted the metrics rather than
crashing.

With overlap set to 0, the chunker produced **cumulative**
chunks — each chunk contained all the text of every previous
chunk. Chunk 5 contained chunk 0, chunk 1, chunk 2, and so on.

The cause was one line:

    current = overlap > 0 ? current.slice(-overlap) : "";

except the guard wasn't there yet. The original was:

    current = current.slice(-overlap);

And `slice(-0)` is `slice(0)`, which returns the entire string,
not an empty one. So with `overlap = 0`, every flush reset the
buffer to _the full text it had just emitted_, and the next
paragraph was appended to that.

The bug is worth noting for two reasons. First, it's a real
JavaScript trap — `slice(-0)` is not the empty slice, and
nothing in the code reads as wrong until you know that. Second,
it's a bug a test suite would have caught _only if the test
looked at the right thing_. Retrieval scores with cumulative
chunks would have been plausible but wrong: every chunk
containing the vacation policy means every vacation question
scores high, for the wrong reason. It would have inflated
precision and recall and looked like a working system.

It was caught by inspecting the chunk output, not by a metric.
That's the honest lesson: metrics measure the thing you point
them at, and nothing more.

### What this week does not claim

- The corpus is four paragraphs of HR policy. It is not a
  realistic document collection, and the numbers don't
  generalize to one.
- The retriever is a baseline: top-K cosine similarity. No
  reranking, no hybrid search, no query expansion.
- Precision and recall are deterministic because the ground
  truth is exact chunk IDs. A retriever whose chunking you don't
  control would need an LLM-judged version, which would need its
  own calibration, which would have its own limitations. That's
  a week 6 problem if it ever becomes one.

### The lesson

A mock proves the client is correct. A live system proves it's
connected to reality. Week 4 added a live model. Week 5 added a
live retriever — and found that the interesting decisions
weren't in the code at all. They were in the chunking parameters
and the ground-truth labels, and they could only be decided by
running the numbers and reading them.

Testing a RAG is not testing whether the answer is right. It's
testing whether the right question reached the right context,
which is a question about _what the model was allowed to see_.
That's what precision and recall measure, and that's the half of
RAG that had no coverage before this week.

### What the negative tests found

The happy-path tests prove the retriever works when there's a
right answer to find. The negative tests prove what happens
when there isn't.

Two findings worth separating:

**Similarity search always returns something.** Ask a question
the corpus cannot answer — "What is the parental leave policy?"
against an HR document with no parental leave content — and
Qdrant still returns k chunks. It returns the nearest vectors,
because that's what nearest-neighbour search does. The retriever
has no mechanism to say "none of these is close enough." The
generator then receives irrelevant context and is instructed to
answer from it. This is not a bug in the retriever; it's a
property of the approach. Fixing it needs a relevance threshold
or a reranker, and neither is in scope.

**Topical closeness is not the same as an answer.** The
distractor test asks "How do I submit a vacation request?"
against a document that mentions requests and vacation but
never describes the submission process. The vacation chunk
ranks high because it's semantically close, and it's also
answer-empty. Precision catches this — the chunk isn't in the
reference set. But the retriever cannot distinguish "close" from
"correct," and no amount of tuning fixes that without adding a
re-ranking step.

Both findings point at the same structural limit: a retriever
that ranks by similarity will always produce a ranked list, and
a ranked list implies every entry is more relevant than the one
below it. For an unanswerable question, that's a lie the system
tells confidently.

---

[← Back to notes index](./README.md)
