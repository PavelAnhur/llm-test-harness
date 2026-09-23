import { embedBatch } from "@rag/embed";
import { COLLECTION, deleteByDocId, makeChunk, upsertChunks } from "@rag/store";

export interface SourceDoc {
  /** Readable slug, e.g. "hr-policy". Used as payload.docId. */
  id: string;
  text: string;
}

export interface ChunkOptions {
  /** Approximate target chunk size in characters. */
  size?: number;
  /** Character overlap between consecutive chunks. */
  overlap?: number;
}

const DEFAULT_SIZE = 512;
const DEFAULT_OVERLAP = 0;

/**
 * Splits a document on paragraph boundaries, then packs paragraphs
 * into chunks up to `size` characters. Overlap is achieved by
 * repeating the tail of the previous chunk at the head of the next.
 *
 * Deliberately simple: no token counting, no sentence splitting.
 * The whole point is that a reviewer can read it and predict
 * exactly where the cuts land.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const size = options.size ?? DEFAULT_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const chunks: string[] = [];
  let current = "";
  const flush = () => {
    if (current.trim().length === 0) return;
    chunks.push(current.trim());
    current = overlap > 0 ? current.slice(-overlap) : "";
  };
  for (const paragraph of paragraphs) {
    const pieces =
      paragraph.length > size
        ? splitLongParagraph(paragraph, size)
        : [paragraph];
    for (const piece of pieces) {
      if (current.length + piece.length + 1 > size && current.length > 0) {
        flush();
      }
      current += (current.length > 0 ? "\n" : "") + piece;
    }
  }
  flush();
  return chunks;
}

function splitLongParagraph(paragraph: string, size: number): string[] {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const pieces: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > size && current.length > 0) {
      pieces.push(current.trim());
      current = "";
    }
    current += (current.length > 0 ? " " : "") + sentence;
  }
  if (current.trim().length > 0) pieces.push(current.trim());
  return pieces;
}

export interface IngestResult {
  docId: string;
  chunksIngested: number;
  /** readableId → text, so tests can map back without a search round-trip. */
  chunks: Map<string, string>;
}

export interface IngestOptions extends ChunkOptions {
  collection?: string;
}

/**
 * Ingests one document: deletes any prior chunks for the same docId,
 * chunks the text, embeds each chunk, and upserts.
 *
 * Idempotent. Running twice produces the same DB state.
 */
export async function ingestDoc(
  doc: SourceDoc,
  options: IngestOptions = {},
): Promise<IngestResult> {
  const collection = options.collection ?? COLLECTION;
  await deleteByDocId(doc.id, collection);
  const chunkTexts = chunkText(doc.text, options);
  if (chunkTexts.length === 0) {
    return { docId: doc.id, chunksIngested: 0, chunks: new Map() };
  }
  const vectors = await embedBatch(chunkTexts);
  if (vectors.length !== chunkTexts.length) {
    throw new Error(
      `Embedding count mismatch: ${chunkTexts.length} chunks, ${vectors.length} vectors`,
    );
  }
  const chunks = chunkTexts.map((text, i) => {
    const vector = vectors[i];
    if (!vector) {
      throw new Error(`Missing embedding for chunk ${i}`);
    }
    return makeChunk(doc.id, i, text, vector);
  });
  await upsertChunks(chunks, collection);
  const map = new Map<string, string>();
  chunks.forEach((c) => {
    map.set(`${c.payload.docId}:${c.payload.chunkIndex}`, c.payload.text);
  });
  return {
    docId: doc.id,
    chunksIngested: chunks.length,
    chunks: map,
  };
}
