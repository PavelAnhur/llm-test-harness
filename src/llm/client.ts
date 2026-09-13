import "dotenv/config";
import OpenAI from "openai";

export interface LlmResponse {
  /** Raw text returned by the model. */
  text: string;
  /** Model identifier, for logging and Allure parameters. */
  model: string;
  /** Wall-clock duration of the request in milliseconds. */
  durationMs: number;
  /** Provider-reported token usage when available. */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GenerateOptions {
  /** Optional system instruction prepended to the conversation. */
  system?: string;
  /** Sampling temperature. Set to 0 for maximum determinism (still not perfect). */
  temperature?: number;
  /** Maximum tokens to generate. */
  maxTokens?: number;
  /** Optional abort signal for timeouts and cancellation tests. */
  signal?: AbortSignal;
}

const PROVIDER = process.env.LLM_PROVIDER ?? "openai";
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: Number(process.env.LLM_TEST_TIMEOUT_MS ?? 30_000),
});

/**
 * Sends a single prompt to the configured LLM provider and returns a
 * normalised response. The shape is stable across providers so tests
 * do not need to know which backend is in use.
 */
export async function generate(
  prompt: string,
  options: GenerateOptions = {},
): Promise<LlmResponse> {
  if (PROVIDER === "ollama") {
    return generateWithOllama(prompt, options);
  }
  return generateWithOpenAI(prompt, options);
}

async function generateWithOpenAI(
  prompt: string,
  options: GenerateOptions,
): Promise<LlmResponse> {
  const startedAt = Date.now();
  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      ...(options.system
        ? [{ role: "system" as const, content: options.system }]
        : []),
      { role: "user" as const, content: prompt },
    ],
    temperature: options.temperature ?? 0,
    ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return {
    text,
    model: completion.model,
    durationMs: Date.now() - startedAt,
    ...(completion.usage && {
      usage: {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      },
    }),
  };
}

async function generateWithOllama(
  prompt: string,
  options: GenerateOptions,
): Promise<LlmResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.1";
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: options.temperature ?? 0 },
      messages: [
        ...(options.system
          ? [{ role: "system", content: options.system }]
          : []),
        { role: "user", content: prompt },
      ],
    }),
    ...(options.signal && { signal: options.signal }),
  });
  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`,
    );
  }
  const body = (await response.json()) as {
    message: { content: string };
    prompt_eval_count?: number;
    eval_count?: number;
  };
  const promptTokens = body.prompt_eval_count ?? 0;
  const completionTokens = body.eval_count ?? 0;
  return {
    text: body.message.content,
    model,
    durationMs: Date.now() - startedAt,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

/**
 * Convenience for tests that only care about the text.
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {},
): Promise<string> {
  const response = await generate(prompt, options);
  return response.text;
}
