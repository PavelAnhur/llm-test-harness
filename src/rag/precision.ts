import type { RetrievedChunk } from "@rag/store";

export interface RetrievalMetricInput {
  retrieved: RetrievedChunk[];
  relevantChunkIds: string[];
}

export interface RetrievalMetricResult {
  score: number;
  rationale: string;
}

/**
 * Context precision: of the chunks the retriever returned, how many
 * were actually relevant to the question?
 *
 *   precision = |retrieved ∩ relevant| / |retrieved|
 *
 * This is the deterministic form — no LLM judge. It requires exact
 * chunk-ID matching, which is meaningful only because the ground
 * truth references the same chunker that produced the retrieved IDs.
 * If you change the chunker, you must re-label. That tradeoff is
 * deliberate: deterministic, fast, free, and interpretable, at the
 * cost of being tied to a stable chunking scheme.
 */
export function contextPrecision(
  input: RetrievalMetricInput,
): RetrievalMetricResult {
  const { retrieved, relevantChunkIds } = input;
  if (retrieved.length === 0) {
    return {
      score: 0,
      rationale:
        "No chunks were retrieved; precision is undefined (reported as 0).",
    };
  }
  const relevantSet = new Set(relevantChunkIds);
  const hits = retrieved.filter((c) => relevantSet.has(c.readableId));
  const score = hits.length / retrieved.length;
  const rationale =
    `Retrieved ${retrieved.length} chunks: ` +
    `[${retrieved.map((c) => c.readableId).join(", ")}]. ` +
    `Relevant reference set: [${relevantChunkIds.join(", ")}]. ` +
    `Hits: ${hits.length} (${hits.map((c) => c.readableId).join(", ") || "none"}). ` +
    `Precision = ${hits.length}/${retrieved.length} = ${score.toFixed(2)}.`;
  return { score, rationale };
}
