import { expectLineCount } from "@assertions/forbidden";
import { expectIntegerInRange, expectSingleWord } from "@assertions/range";
import { expectValidJson, extractJson } from "@assertions/schema";
import { generate } from "@llm/client";
import { describe, it } from "vitest";
import z from "zod";

const RUNS = 5;
const TEMPERATURE = 0.7;

describe("Day 2: property-based assertion against an LLM", () => {
  it("always returns a single word when asked for a color.", async () => {
    const prompt = "Name a color. Reply only one word only.";
    for (let i = 0; i < RUNS; i++) {
      const { text } = await generate(prompt, { temperature: TEMPERATURE });
      console.log(`Run ${i + 1}: ${text}`);
      expectSingleWord(text);
    }
  });

  it("always return an integer in [1, 100] when asked for a number", async () => {
    const prompt =
      "Give me a random number between 1 and 100, with number only.";
    for (let i = 0; i < RUNS; i++) {
      const { text } = await generate(prompt, { temperature: TEMPERATURE });
      console.log(`Run ${i + 1}: ${text}`);
      expectIntegerInRange(text, 1, 100);
    }
  });

  it("always returns a single word when asked for a fruit", async () => {
    const prompt = "Name a fruit. Reply with only one word only.";
    for (let i = 0; i < RUNS; i++) {
      const { text } = await generate(prompt, { temperature: TEMPERATURE });
      console.log(`Run ${i + 1}: ${text}`);
      expectSingleWord(text);
    }
  });

  it("always returns exactly two non-empty lines when asked for a poem", async () => {
    const prompt =
      "Write a two-line poem about autumn. Without any intro. Just two lines.";

    for (let i = 0; i < RUNS; i++) {
      const { text } = await generate(prompt, { temperature: TEMPERATURE });
      console.log(`Run ${i + 1}:\n${text}\n---`);
      expectLineCount(text, 2);
    }
  });

  it("returns valid JSON when asked for a structured output", async () => {
    const prompt =
      'Return a valid JSON object with two fields: "color" (a color name) and "hex" (its hex code). Reply with JSON only, no prose.';
    const schema = z.object({
      color: z.string().min(1),
      hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    });
    for (let i = 0; i < RUNS; i++) {
      const { text } = await generate(prompt, { temperature: TEMPERATURE });
      console.log(`Run ${i + 1}: ${text}`);
      const json = extractJson(text);
      if (!json) {
        throw new Error(`No JSON object found in response, Raw text:\n${text}`);
      }
      expectValidJson(json, schema);
    }
  });
});
