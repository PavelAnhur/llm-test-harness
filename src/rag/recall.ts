import type {
  RetrievalMetricInput,
  RetrievalMetricResult,
} from "@rag/precision";

/**
 * Context recall: of the chunks needed to answer the question, how
 * many did the retriever actually return?
 *
 *   recall = |retrieved ∩ relevant| / |relevant|
 *
 * Low recall means the answer was unreachable no matter how good the
 * generator is. This is the metric that catches "the RAG is fine but
 * the retriever never found the passage."
 */
export function contextRecall(
  input: RetrievalMetricInput,
): RetrievalMetricResult {
  const { retrieved, relevantChunkIds } = input;
  if (relevantChunkIds.length === 0) {
    return {
      score: 0,
      rationale:
        "No relevant chunks were labeled for this question; recall is undefined (reported as 0).",
    };
  }
  const retrievedSet = new Set(retrieved.map((c) => c.readableId));
  const hits = relevantChunkIds.filter((id) => retrievedSet.has(id));
  const score = hits.length / relevantChunkIds.length;
  const rationale =
    `Relevant reference set: [${relevantChunkIds.join(", ")}]. ` +
    `Retrieved: [${retrieved.map((c) => c.readableId).join(", ")}]. ` +
    `Hits: ${hits.length} (${hits.join(", ") || "none"}). ` +
    `Recall = ${hits.length}/${relevantChunkIds.length} = ${score.toFixed(2)}.`;
  return { score, rationale };
}
