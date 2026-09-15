import { expectIntegerInRange } from "@assertions/range";
import { expectValidJson, extractFirstJson } from "@assertions/schema";
import { expectLineCount, expectSingleWord } from "@assertions/shape";
import { formatResult, runNTimes } from "@harness/multi-run";
import { expectPassRate } from "@harness/thresholds";
import { describe, it } from "vitest";
import { z } from "zod";

const RUNS = 10;
const TEMPERATURE = 0.7;

describe("Day 3: multi-run harness with pass-rate thresholds", () => {
  it("return a single word (color) atleast 80% of the time", async () => {
    const result = await runNTimes(
      "Name a color. Reply with one word only.",
      expectSingleWord,
      { runs: RUNS, temperature: TEMPERATURE },
    );
    console.log(formatResult(result));
    expectPassRate(result);
  });

  it("returns an integer in [1, 100] at least 90% of the time", async () => {
    const result = await runNTimes(
      "Give me a random number between 1  and 100. Reply with the number only.",
      (response) => expectIntegerInRange(response, 1, 100),
      { runs: RUNS, temperature: TEMPERATURE, threshold: 0.9 },
    );
    console.log(formatResult(result));
    expectPassRate(result);
  });

  it("returns a single word (fruit) at least 80% of the time", async () => {
    const result = await runNTimes(
      "Name a fruit. Reply with one word only.",
      expectSingleWord,
      { runs: RUNS, temperature: TEMPERATURE },
    );
    console.log(formatResult(result));
    expectPassRate(result);
  });

  it("returns exactly two lines (poem) at least 70% of the time", async () => {
    const result = await runNTimes(
      "Write a two-line poem about autumn. Without any intro. Just two lines.",
      (response) => expectLineCount(response, 2),
      { runs: RUNS, temperature: TEMPERATURE, threshold: 0.7 },
    );
    console.log(formatResult(result));
    expectPassRate(result);
  });

  it("returns valid JSON (color + hex) at least 90% of the time", async () => {
    const schema = z.object({
      color: z.enum([
        "red",
        "blue",
        "green",
        "yellow",
        "orange",
        "purple",
        "pink",
        "brown",
        "black",
        "white",
        "gray",
        "grey",
        "cyan",
        "magenta",
        "teal",
        "navy",
        "maroon",
        "olive",
      ]),
      hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    });
    const result = await runNTimes(
      'Return exactly one JSON object. The object must have exactly two keys: "color" and "hex". "color" must be one of: red, blue, green, yellow, orange, purple, pink, brown, black, white. "hex" must be that color six-digit hex code, starting with #. Do not include any text before or after the JSON. Do not wrap the JSON in code fences. Reply with the JSON object only. The colon character (:) must appear between each key and its value. Do not use commas between a key and its value.',
      (response) => {
        const json = extractFirstJson(response);
        if (!json) {
          throw new Error(`No JSON found in response:\n${response}`);
        }
        expectValidJson(json, schema);
      },
      { runs: RUNS, temperature: TEMPERATURE, threshold: 0.9 },
    );
    console.log(formatResult(result));
    expectPassRate(result);
  });
});
