import { embed } from "@rag/embed";
import { COLLECTION, search, type RetrievedChunk } from "@rag/store";

export interface RetrieveOptions {
  /** Number of chunks to return. Defaults to 3. */
  k?: number;
  /** Override collection — used by tests that need an isolated namespace. */
  collection?: string;
}

export const DEFAULT_K = 3;

/**
 * Turns a question into the top-K chunks most likely to answer it.
 *
 * This is the seam between "text in" and "ranked chunks out." Every
 * retrieval metric consumes the result of this function, and every
 * test calls this rather than `embed` + `search` directly — so the
 * retrieval strategy (top-K, reranking, hybrid search) can change
 * without touching the metric layer or the tests.
 */
export async function retrieve(
  question: string,
  options: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const k = options.k ?? DEFAULT_K;
  const collection = options.collection ?? COLLECTION;
  if (question.trim().length === 0) {
    throw new Error("retrieve() called with an empty question");
  }
  const queryVector = await embed(question);
  return search(queryVector, k, collection);
}

/**
 * Retrieve and return only the readable IDs, in rank order.
 * Convenience for metric code that only compares identifiers.
 */
export async function retrieveIds(
  question: string,
  options: RetrieveOptions = {},
): Promise<string[]> {
  const chunks = await retrieve(question, options);
  return chunks.map((c) => c.readableId);
}
