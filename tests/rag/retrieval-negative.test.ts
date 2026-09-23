import { label, noteWithLink } from "@allure/helpers";
import { ingestDoc } from "@rag/ingest";
import { contextPrecision } from "@rag/precision";
import { contextRecall } from "@rag/recall";
import { retrieve } from "@rag/retriever";
import { clearCollection } from "@rag/store";
import * as allure from "allure-js-commons";
import { Severity } from "allure-js-commons";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const COLLECTION = "hr-policy-negative";
const FIXTURE_PATH = join(__dirname, "..", "fixtures", "hr-policy.txt");

describe("RAG: retrieval — negative scenarios", () => {
  beforeAll(async () => {
    await clearCollection(COLLECTION);
    const text = readFileSync(FIXTURE_PATH, "utf-8");
    await ingestDoc({ id: "hr-policy", text }, { collection: COLLECTION });
  }, 60_000);

  describe("Degenerate input", () => {
    it("throws on an empty question", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Retrieval",
        story: "Degenerate input — empty question",
        severity: Severity.NORMAL,
        tags: ["week-5", "rag", "retrieval", "negative"],
      });
      await noteWithLink(
        5,
        "retrieval--negative-scenarios",
        "retrieve() rejects an empty question with an explicit error. " +
          "Without the guard, embed('') would produce a vector for an " +
          "empty string — technically valid, semantically meaningless. " +
          "Every chunk would score roughly the same and the metric " +
          "would report a plausible but wrong number.",
      );
      await expect(retrieve("")).rejects.toThrow(/empty question/i);
    });

    it("throws on a whitespace-only question", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Retrieval",
        story: "Degenerate input — whitespace-only question",
        severity: Severity.MINOR,
        tags: ["week-5", "rag", "retrieval", "negative"],
      });
      await noteWithLink(
        5,
        "retrieval--negative-scenarios",
        "The guard uses question.trim().length === 0, so whitespace " +
          "is treated the same as empty. Pinned here because a future " +
          "refactor might drop the .trim() and let '   ' through.",
      );
      await expect(retrieve("   ")).rejects.toThrow(/empty question/i);
    });
  });

  describe("Question the corpus cannot answer", () => {
    it("returns chunks anyway, but none of them relevant", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Retrieval",
        story: "No matching answer",
        severity: Severity.CRITICAL,
        tags: ["week-5", "rag", "retrieval", "negative", "known-limitation"],
      });
      const question = "What is the parental leave policy?";
      const retrieved = await retrieve(question, {
        k: 3,
        collection: COLLECTION,
      });
      await allure.parameter("question", question);
      await allure.attachment(
        "Retrieved chunks",
        JSON.stringify(
          retrieved.map((c) => ({
            id: c.readableId,
            score: c.score,
            preview: c.text.slice(0, 120),
          })),
          null,
          2,
        ),
        allure.ContentType.JSON,
      );
      await noteWithLink(
        5,
        "retrieval--negative-scenarios",
        "The corpus has no parental-leave content. The retriever " +
          "still returns k chunks — Qdrant returns the nearest " +
          "vectors regardless of whether they are close. The " +
          "generator would receive irrelevant context and be " +
          "instructed to answer from it. This is a structural " +
          "limit of similarity search, not a bug: the retriever has " +
          "no way to say 'I don't know.' Fixing it needs a " +
          "relevance threshold or a reranker, neither of which is " +
          "in scope for a baseline retriever.",
      );
      expect(retrieved.length).toBe(3);
      const recall = contextRecall({
        retrieved,
        relevantChunkIds: [],
      });
      expect(recall.score).toBe(0);
    });
  });

  describe("Distractor — topic present, answer absent", () => {
    it("returns the topically similar chunk that does not answer the question", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Retrieval",
        story: "Distractor — close but wrong",
        severity: Severity.CRITICAL,
        tags: ["week-5", "rag", "retrieval", "negative", "known-limitation"],
      });
      // The vacation chunk mentions "requests" and "vacation". The
      // question is about the request process, which the document
      // does not describe.
      const question = "How do I submit a vacation request?";
      const retrieved = await retrieve(question, {
        k: 3,
        collection: COLLECTION,
      });
      const precision = contextPrecision({
        retrieved,
        relevantChunkIds: [],
      });
      await allure.parameter("question", question);
      await allure.parameter("precision", precision.score.toFixed(2));
      await allure.attachment(
        "Retrieved chunks",
        JSON.stringify(
          retrieved.map((c) => ({
            id: c.readableId,
            score: c.score,
            preview: c.text.slice(0, 120),
          })),
          null,
          2,
        ),
        allure.ContentType.JSON,
      );
      await allure.attachment(
        "Precision rationale",
        precision.rationale,
        allure.ContentType.TEXT,
      );
      await noteWithLink(
        5,
        "retrieval--negative-scenarios",
        "The vacation chunk contains the words 'requests' and " +
          "'vacation', so it ranks high for a question about the " +
          "request process. But the document does not describe that " +
          "process — it only says requests must be submitted two " +
          "weeks in advance. The chunk is topically close and " +
          "answer-empty. This is the case similarity search cannot " +
          "distinguish from a real match, and the case that would " +
          "need a reranker to fix.",
      );
      expect(retrieved.length).toBe(3);
      expect(precision.score).toBe(0);
    });
  });

  describe("Idempotent ingest", () => {
    it("does not duplicate chunks when the same document is ingested twice", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Retrieval",
        story: "Idempotent ingest",
        severity: Severity.CRITICAL,
        tags: ["week-5", "rag", "retrieval", "negative"],
      });
      const text = readFileSync(FIXTURE_PATH, "utf-8");
      const question = "How many vacation days do full-time employees get?";
      const before = await retrieve(question, {
        k: 10,
        collection: COLLECTION,
      });
      const idsBefore = before.map((c) => c.readableId).sort();
      await ingestDoc({ id: "hr-policy", text }, { collection: COLLECTION });
      const after = await retrieve(question, { k: 10, collection: COLLECTION });
      const idsAfter = after.map((c) => c.readableId).sort();
      await allure.parameter("chunksBeforeReingest", String(idsBefore.length));
      await allure.parameter("chunksAfterReingest", String(idsAfter.length));
      await allure.attachment(
        "IDs before",
        JSON.stringify(idsBefore, null, 2),
        allure.ContentType.JSON,
      );
      await allure.attachment(
        "IDs after",
        JSON.stringify(idsAfter, null, 2),
        allure.ContentType.JSON,
      );
      await noteWithLink(
        5,
        "retrieval--negative-scenarios",
        "Re-ingesting a document must not duplicate its chunks. " +
          "ingestDoc() calls deleteByDocId before upsert, so the " +
          "second ingest replaces the first. If that delete were " +
          "ever dropped or broken, every retrieval would return " +
          "each chunk twice — which would double the noise in " +
          "precision and quietly corrupt every metric. The chunk " +
          "IDs must also be stable: same document, same IDs, same " +
          "content. (IDs are UUIDs in Qdrant and readable IDs in " +
          "the payload, so this comparison is against the readable " +
          "form.)",
      );
      expect(idsAfter.length).toBe(idsBefore.length);
      expect(idsAfter).toEqual(idsBefore);
    });

    it("returns an empty result set when the collection is empty", async () => {
      await label({
        epic: "LLM Testing",
        feature: "RAG Retrieval",
        story: "Empty collection",
        severity: Severity.NORMAL,
        tags: ["week-5", "rag", "retrieval", "negative"],
      });
      await clearCollection(COLLECTION);
      const retrieved = await retrieve(
        "How many vacation days do full-time employees get?",
        { k: 3, collection: COLLECTION },
      );
      await allure.parameter("retrievedCount", String(retrieved.length));
      await noteWithLink(
        5,
        "retrieval--negative-scenarios",
        "Against an empty collection, the retriever returns an empty " +
          "array — no error. The metric functions handle this " +
          "explicitly: both return score 0 with a rationale that " +
          "says the value is undefined rather than zero-in-the-" +
          "usual-sense. That distinction matters — a test that " +
          "asserted 'precision = 0' on an empty collection would be " +
          "asserting the wrong thing.",
      );
      expect(retrieved).toEqual([]);
      const precision = contextPrecision({
        retrieved,
        relevantChunkIds: ["hr-policy:0"],
      });
      expect(precision.score).toBe(0);
      expect(precision.rationale).toMatch(/no chunks were retrieved/i);
      const recall = contextRecall({
        retrieved,
        relevantChunkIds: ["hr-policy:0"],
      });
      expect(recall.score).toBe(0);
      expect(recall.rationale).toMatch(/recall = 0\/1/i);
      const text = readFileSync(FIXTURE_PATH, "utf-8");
      await ingestDoc({ id: "hr-policy", text }, { collection: COLLECTION });
    }, 30_000);
  });
});
