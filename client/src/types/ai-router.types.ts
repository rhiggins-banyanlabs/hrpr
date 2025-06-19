export interface LogEntry {
  provider: string;
  duration?: number;
  costPer1K?: number;
  error?: string;
  timestamp: string;
  strategy: string;
}

export interface AIRouterResponse {
  provider?: string;
  response?: string;
  logs: LogEntry[];
  strategy: string;
  error?: string;
  cost?: number; // ← Add this
  tokensUsed?: {
    // ← Add this
    input: number;
    output: number;
    total: number;
  };
}

export type Strategy = "cheap" | "quality" | "balanced";

export interface AIRouterRequest {
  prompt: string;
  strategy?: Strategy;
}

export interface ProviderResponse {
  success: boolean;
  data?: string;
  error?: string;
  inputTokens?: number; // ← Add this
  outputTokens?: number; // ← Add this
}
