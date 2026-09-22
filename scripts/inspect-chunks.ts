import { ingestDoc } from "@rag/ingest";
import { clearCollection } from "@rag/store";
import { readFileSync } from "node:fs";

async function main() {
  await clearCollection();
  const text = readFileSync("tests/fixtures/hr-policy.txt", "utf-8");
  const result = await ingestDoc({ id: "hr-policy", text }, { overlap: 0 });
  console.log(`Ingested ${result.chunksIngested} chunks:\n`);
  for (const [id, chunkText] of result.chunks) {
    console.log(`── ${id} ──`);
    console.log(chunkText);
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
