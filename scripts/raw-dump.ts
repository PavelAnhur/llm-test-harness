import { readFileSync } from "node:fs";

const raw = readFileSync("tests/fixtures/hr-policy.txt", "utf-8");

console.log("Length:", raw.length);
console.log("Index of 'timeduring':", raw.indexOf("timeduring"));
console.log("Index of 'time during':", raw.indexOf("time during"));

const idx = raw.indexOf("time during");
if (idx >= 0) {
  const snippet = raw.slice(idx - 5, idx + 20);
  console.log("Raw snippet:", JSON.stringify(snippet));
  console.log(
    "Char codes:",
    [...snippet].map((c) => c.charCodeAt(0)),
  );
}

const paragraphs = raw
  .replace(/\r\n/g, "\n")
  .split(/\n\s*\n/)
  .map((p) => p.trim())
  .filter((p) => p.length > 0);

const p0 = paragraphs[0];
console.log("\nParagraph 0 length:", p0?.length);
console.log("Paragraph 0 has 'time during':", p0?.includes("time during"));
console.log("Paragraph 0 has 'timeduring':", p0?.includes("timeduring"));

const idx2 = p0?.indexOf("time") ?? -1;
if (idx2 >= 0) {
  const snippet = p0!.slice(idx2 - 5, idx2 + 20);
  console.log("Paragraph 0 snippet:", JSON.stringify(snippet));
  console.log(
    "Char codes:",
    [...snippet].map((c) => c.charCodeAt(0)),
  );
}
