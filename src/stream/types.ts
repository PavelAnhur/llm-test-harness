export type StreamState =
  | "connected"
  | "streaming"
  | "completed" //[DONE] received
  | "errored" // clean EOF, no [DONE]
  | "truncated"; //socket destroyed / fetch failed

export interface StreamEvent {
  token: string;
  receivedAt: number;
}

export interface StreamResult {
  finalState: StreamState;
  tokens: string[];
  events: StreamEvent[];
  firstTokenAt?: number;
  completedAt?: number;
  error?: string;
  startedAt: number;
  receivedDoneMarker: boolean;
}
