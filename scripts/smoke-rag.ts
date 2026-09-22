import { embed } from "@rag/embed";
import {
  COLLECTION,
  clearCollection,
  makeChunk,
  search,
  upsertChunks,
} from "@rag/store";
import process from "node:process";

async function main() {
  await clearCollection();
  console.log(`Collection ready (empty): ${COLLECTION}`);
  const texts = [
    "Full-time employees accrue 20 days of paid vacation per year.",
    "Part-time employees accrue vacation proportional to hours worked.",
    "Remote work is permitted up to three days per week.",
  ];
  const chunks = [];
  for (const [i, text] of texts.entries()) {
    const vector = await embed(text);
    chunks.push(makeChunk("smoke-doc", i, text, vector));
  }
  await upsertChunks(chunks);
  console.log(`Upserted ${chunks.length} chunks`);
  const queryVec = await embed(
    "How many vacation days do full-time employees get?",
  );
  const results = await search(queryVec, 3);
  console.log("\nTop 3 results:");
  for (const r of results) {
    console.log(`  [${r.score.toFixed(4)}] ${r.readableId} — ${r.text}`);
  }
  const top = results[0];
  if (!top) {
    throw new Error(
      "Search returned no results — is the collection populated?",
    );
  }
  if (!top.text.includes("20 days")) {
    throw new Error(`Expected the vacation chunk first, got: "${top.text}"`);
  }
  console.log("\nSmoke passed: retrieval is semantically meaningful.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
