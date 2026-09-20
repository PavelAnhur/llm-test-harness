import type { StreamEvent, StreamResult, StreamState } from "./types";

export type StreamProtocol = "sse" | "ollama-ndjson";

export interface StreamingClientOptions {
  protocol?: StreamProtocol;
  /** Body to POST. Required for ollama-ndjson. */
  body?: unknown;
  /** Model name for Ollama. Ignored for sse. */
  model?: string;
}

export class StreamingClient {
  private state: StreamState = "connected";
  private tokens: string[] = [];
  private firstTokenAt?: number;
  private completedAt?: number;
  private error?: string;
  private events: StreamEvent[] = [];
  private startedAt: number = 0;
  private receivedDoneMarker = false;
  private readonly protocol: StreamProtocol;

  constructor(
    private readonly url: string,
    private readonly options: StreamingClientOptions = {},
  ) {
    this.protocol = options.protocol ?? "sse";
  }

  async start(): Promise<StreamResult> {
    this.startedAt = Date.now();
    try {
      const init: RequestInit =
        this.protocol === "sse"
          ? { headers: { Accept: "text/event-stream" } }
          : {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/x-ndjson",
              },
              body: JSON.stringify(this.options.body ?? {}),
            };
      const response = await fetch(this.url, init);
      if (!response.ok || !response.body) {
        this.state = "errored";
        this.error = `HTTP error ${response.status}: ${response.statusText}`;
        return this.buildResult();
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      while (!this.receivedDoneMarker) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (this.processLine(line)) break;
        }
      }
      if (buffer.trim().length > 0) {
        this.processLine(buffer);
      }
      this.completedAt = Date.now();
      this.state = this.receivedDoneMarker ? "completed" : "truncated";
    } catch (err) {
      this.state = "errored";
      this.error =
        err instanceof Error ? err.message : "Stream connection failed";
    }
    return this.buildResult();
  }

  getState(): StreamState {
    return this.state;
  }

  /**
   * Processes one line. Returns true if the line carried the
   * protocol's terminal marker.
   */
  private processLine(line: string): boolean {
    return this.protocol === "sse"
      ? this.processSseLine(line)
      : this.processNdjsonLine(line);
  }

  /**
   * Processes one SSE line. Returns true if the line was the DONE
   * marker, signaling the caller to stop reading.
   */
  private processSseLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return false;
    if (!trimmed.startsWith("data:")) return false;
    const dataStr = trimmed.slice(5).trim();
    if (dataStr === "[DONE]") {
      this.receivedDoneMarker = true;
      return true;
    }
    const token = this.extractSseToken(dataStr);
    this.recordToken(token);
    return false;
  }

  private processNdjsonLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    let parsed: {
      message?: { content?: string };
      response?: string;
      done?: boolean;
      error?: string;
    };
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return false;
    }
    if (parsed.error) {
      this.state = "errored";
      this.error = parsed.error;
      return true;
    }
    if (parsed.done === true) {
      this.receivedDoneMarker = true;
      return true;
    }
    const token = parsed.message?.content ?? parsed.response;
    if (typeof token === "string" && token.length > 0) {
      this.recordToken(token);
    }
    return false;
  }

  private recordToken(token: string): void {
    const now = Date.now();
    if (this.firstTokenAt === undefined) {
      this.firstTokenAt = now;
      this.state = "streaming";
    }
    this.tokens.push(token);
    this.events.push({ token, receivedAt: now });
  }

  private extractSseToken(dataStr: string): string {
    try {
      const parsed = JSON.parse(dataStr) as { token?: string };
      if (typeof parsed.token === "string") return parsed.token;
    } catch {
      // Not JSON — treat the payload as a plain-text token.
    }
    return dataStr;
  }

  private buildResult(): StreamResult {
    return {
      startedAt: this.startedAt,
      finalState: this.state,
      tokens: this.tokens,
      events: this.events,
      receivedDoneMarker: this.receivedDoneMarker,
      ...(this.firstTokenAt !== undefined && {
        firstTokenAt: this.firstTokenAt,
      }),
      ...(this.completedAt !== undefined && { completedAt: this.completedAt }),
      ...(this.error !== undefined && { error: this.error }),
    };
  }
}
