import type { StreamEvent, StreamResult, StreamState } from "./types";

export class StreamingClient {
  private state: StreamState = "connected";
  private tokens: string[] = [];
  private firstTokenAt?: number;
  private completedAt?: number;
  private error?: string;
  private events: StreamEvent[] = [];
  private startedAt: number = 0;
  private receivedDoneMarker = false;

  constructor(private readonly url: string) {}

  async start(): Promise<StreamResult> {
    this.startedAt = Date.now();
    try {
      const response = await fetch(this.url, {
        headers: { Accept: "text/event-stream" },
      });

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
   * Processes one SSE line. Returns true if the line was the DONE
   * marker, signaling the caller to stop reading.
   */
  private processLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return false;
    if (!trimmed.startsWith("data:")) return false;
    const dataStr = trimmed.slice(5).trim();
    if (dataStr === "[DONE]") {
      this.receivedDoneMarker = true;
      return true;
    }
    const token = this.extractToken(dataStr);
    const now = Date.now();
    if (this.firstTokenAt === undefined) {
      this.firstTokenAt = now;
      this.state = "streaming";
    }
    this.tokens.push(token);
    this.events.push({ token, receivedAt: now });
    return false;
  }

  private extractToken(dataStr: string): string {
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
      receivedDoneMarker: this.receivedDoneMarker,
      ...(this.firstTokenAt !== undefined && {
        firstTokenAt: this.firstTokenAt,
      }),
      ...(this.completedAt !== undefined && { completedAt: this.completedAt }),
      ...(this.error !== undefined && { error: this.error }),
    };
  }
}
