export type StreamState = "connected" | "streaming" | "completed" | "errored";

export interface StreamEvent {
  token: string;
  receivedAt: number;
}

export interface StreamResult {
  finalState: StreamState;
  tokens: string[];
  firstTokenAt?: number;
  completedAt?: number;
  error?: string;
}
