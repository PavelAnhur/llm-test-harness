export interface RagMetricInput {
  /** What the user asked. */
  question: string;
  /** The retrieved context, as fixed strings. */
  chunks: string[];
  /** The model's response to score. */
  answer: string;
}

export interface RagMetricResult {
  /** Score in [0, 1]. */
  score: number;
  /** One sentence explaining the score. */
  rationale: string;
  /** Full model output, for debugging. */
  raw: string;
}
