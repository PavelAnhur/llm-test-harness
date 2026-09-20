import { createServer, type Server, type ServerResponse } from "node:http";

export interface MockServerConfig {
  delayBeforeFirstToken: number;
  delayBetweenTokens: number;
  tokens: string[];
  /** If set, stop sending after this many tokens. */
  disconnectAfterTokens?: number;
  /**
   * How to cut the stream short. Only used when disconnectAfterTokens
   * is set.
   * - 'destroy': close the TCP socket abruptly (client sees a network error)
   * - 'end': end the response cleanly without sending [DONE]
   */
  disconnectMode?: "destroy" | "end";
  /** If true, do not call res.end() after sending [DONE]. */
  keepAliveAfterDone?: boolean;
}

export class MockStreamServer {
  private server: Server | undefined;
  private port = 0;

  constructor(private readonly config: MockServerConfig) {}

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        if (req.method !== "GET" || req.url !== "/stream") {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        // The client may disconnect mid-write. Swallow the error so
        // the test process does not crash.
        res.on("error", () => {});
        void this.handleStream(res);
      });

      this.server = server;

      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address && typeof address === "object") {
          this.port = address.port;
          resolve(this.url());
        } else {
          reject(new Error("Failed to resolve server port"));
        }
      });
    });
  }

  private async handleStream(res: ServerResponse): Promise<void> {
    const {
      delayBeforeFirstToken,
      delayBetweenTokens,
      tokens,
      disconnectAfterTokens,
      disconnectMode = "destroy",
      keepAliveAfterDone,
    } = this.config;
    try {
      if (disconnectAfterTokens === 0) {
        if (disconnectMode === "end") res.end();
        else res.destroy();
        return;
      }
      for (let i = 0; i < tokens.length; i++) {
        const delay = i === 0 ? delayBeforeFirstToken : delayBetweenTokens;
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
        res.write(`data: ${JSON.stringify({ token: tokens[i] })}\n\n`);
        if (
          disconnectAfterTokens !== undefined &&
          i + 1 >= disconnectAfterTokens
        ) {
          if (disconnectMode === "end") {
            res.end();
          } else {
            res.destroy();
          }
          return;
        }
      }
      res.write("data: [DONE]\n\n");
      if (!keepAliveAfterDone) {
        res.end();
      }
    } catch {
      // Client disconnected mid-write. The test asserts on the client side.
    }
  }

  url(): string {
    return `http://127.0.0.1:${this.port}/stream`;
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = this.server;
      if (!server) {
        resolve();
        return;
      }
      server.closeAllConnections();
      server.close((err) => {
        this.server = undefined;
        this.port = 0;
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
