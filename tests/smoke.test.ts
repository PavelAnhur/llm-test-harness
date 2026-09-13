import { generate } from '@llm/client';
import { describe, expect, it } from 'vitest';


interface PromptCase {
  readonly name: string;
  readonly prompt: string;
}

const PROMPT_CASES: readonly PromptCase[] = [
  {
    name: 'a single color',
    prompt: 'Name a color. Reply with one word only.',
  },
  {
    name: 'a random number between 1 and 100',
    prompt: 'Give me a random number between 1 and 100. Reply with the number only.',
  },
  {
    name: 'a single fruit',
    prompt: 'Name a fruit. Reply with one word only.',
  },
  {
    name: 'a two-line poem about autumn',
    prompt: 'Write a two-line poem about autumn.',
  },
];

const RUNS = 5;
const TEMPERATURE = 0.7;

describe.skip('Day 1: exact-match assertions against an LLM', () => {
  for (const { name, prompt } of PROMPT_CASES) {
    it(`fails to return the same answer for ${name}`, async () => {
      // Capture the first response as our "expected" value.
      // This is the trap: we assume the first run is the truth.
      const baseline = (await generate(prompt, { temperature: TEMPERATURE })).text;
      const responses: string[] = [baseline];
      for (let i = 1; i < RUNS; i++) {
        const run = await generate(prompt, { temperature: TEMPERATURE });
        responses.push(run.text);
      }
      const matches = responses.filter((r) => r === baseline).length;
      const distinct = new Set(responses).size;
      console.log(
        [
          `Prompt:    ${prompt}`,
          `Baseline:  "${baseline}"`,
          `Runs:      ${responses.map((r) => `"${r}"`).join(', ')}`,
          `Matches:   ${matches}/${RUNS} (baseline appeared ${matches} time(s))`,
          `Distinct:  ${distinct}`,
        ].join('\n')
      );
      // This assertion fails — that is the point of Day 1.
      // Every string must equal the first response.
      expect(
        responses.every((r) => r === baseline),
        `Expected all ${RUNS} runs to match the baseline. ` +
        `${distinct} distinct responses observed: ${[...new Set(responses)].join(', ')}`
      ).toBe(true);
    });
  }
});