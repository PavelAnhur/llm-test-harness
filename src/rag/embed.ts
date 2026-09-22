import "dotenv/config";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const EMBED_MODEL = process.env.EMBED_MODEL ?? "nomic-embed-text";

export const EMBED_DIM = Number(process.env.EMBED_DIM ?? 768);

/**
 * Embeds a single string using Ollama's embedding endpoint.
 * Throws on any non-200 response so a bad model name surfaces
 * immediately rather than producing a silent zero vector.
 */
export async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Embedding failed: ${response.status} ${response.statusText}` +
        (detail ? ` — ${detail}` : ""),
    );
  }
  const body = (await response.json()) as { embedding?: number[] };
  if (!Array.isArray(body.embedding) || body.embedding.length === 0) {
    throw new Error(
      `Embedding response missing vector. Is "${EMBED_MODEL}" pulled? ` +
        `Run: ollama pull ${EMBED_MODEL}`,
    );
  }
  if (body.embedding.length !== EMBED_DIM) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBED_DIM}, got ${body.embedding.length}. ` +
        `Update EMBED_DIM in .env to match the model.`,
    );
  }
  return body.embedding;
}

/**
 * Batch helper. Sequential by default — Ollama serializes
 * requests internally anyway, and a Promise.all flood just
 * queues them in memory.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (const text of texts) {
    vectors.push(await embed(text));
  }
  return vectors;
}
