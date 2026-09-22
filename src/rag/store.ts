import "dotenv/config";
import { randomUUID } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { EMBED_DIM } from "./embed";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
export const COLLECTION = process.env.QDRANT_COLLECTION ?? "hr-policy";

export interface ChunkPayload {
  [key: string]: unknown;
  text: string;
  docId: string;
  chunkIndex: number;
}

export interface Chunk {
  id: string;
  vector: number[];
  payload: ChunkPayload;
}

export interface RetrievedChunk {
  /** UUID as stored in Qdrant. Not the readable ID — see `readableId`. */
  id: string;
  /** `${docId}:${chunkIndex}` — the ID ground truth references. */
  readableId: string;
  text: string;
  score: number;
  docId: string;
  chunkIndex: number;
}

const client = new QdrantClient({ url: QDRANT_URL });

/**
 * The single entry point for constructing a Chunk. Generates the
 * UUID and validates the payload, so callers cannot pass a readable
 * ID by accident (Qdrant would reject it) or mismatch the field names.
 */
export function makeChunk(
  docId: string,
  chunkIndex: number,
  text: string,
  vector: number[],
): Chunk {
  return {
    id: randomUUID(),
    vector,
    payload: { text, docId, chunkIndex },
  };
}

/**
 * Idempotent: creates the collection if absent, no-ops if present.
 * Safe to call at the start of every test file.
 */
export async function ensureCollection(name = COLLECTION): Promise<void> {
  const { collections } = await client.getCollections();
  if (collections.some((c) => c.name === name)) return;
  await client.createCollection(name, {
    vectors: { size: EMBED_DIM, distance: "Cosine" },
  });
}

export async function upsertChunks(
  chunks: Chunk[],
  collection = COLLECTION,
): Promise<void> {
  if (chunks.length === 0) return;
  await client.upsert(collection, {
    wait: true,
    points: chunks.map((c) => ({
      id: c.id,
      vector: c.vector,
      payload: c.payload,
    })),
  });
}

export async function search(
  queryVector: number[],
  k: number,
  collection = COLLECTION,
): Promise<RetrievedChunk[]> {
  const response = await client.query(collection, {
    query: queryVector,
    limit: k,
    with_payload: true,
  });
  return response.points.map((r) => {
    const payload = (r.payload ?? {}) as Record<string, unknown>;
    const docId = String(payload.docId ?? "");
    const chunkIndex = Number(payload.chunkIndex ?? -1);
    return {
      id: String(r.id),
      readableId: `${docId}:${chunkIndex}`,
      text: String(payload.text ?? ""),
      score: r.score,
      docId,
      chunkIndex,
    };
  });
}

/**
 * Test utility: wipes the collection so a test can re-ingest
 * from a known-empty state. Not used in production flows.
 */
export async function clearCollection(collection = COLLECTION): Promise<void> {
  await client.deleteCollection(collection);
  await ensureCollection(collection);
}

/**
 * Test utility: deletes only chunks whose payload.docId matches.
 * Lets a test re-ingest one document without touching the rest.
 */
export async function deleteByDocId(
  docId: string,
  collection = COLLECTION,
): Promise<void> {
  await client.delete(collection, {
    wait: true,
    filter: {
      must: [{ key: "docId", match: { value: docId } }],
    },
  });
}
