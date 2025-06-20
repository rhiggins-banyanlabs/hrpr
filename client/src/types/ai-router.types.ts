// src/types/ai-router.types.ts - ENHANCED VERSION
export interface LogEntry {
  provider: string;
  duration?: number;
  costPer1K?: number;
  error?: string;
  timestamp: string;
  strategy: string;
  
  // NEW: Enhanced logging fields
  actualCost?: number;        // Actual cost in dollars (not per 1K)
  tokensUsed?: number;        // Total tokens used for this attempt
  cached?: boolean;           // Whether this was a cache hit
  optimization?: string;      // What optimization was applied
}

export interface AIRouterResponse {
  provider?: string;
  response?: string;
  logs: LogEntry[];
  strategy: string;
  error?: string;
  cost?: number;              // Your existing field
  tokensUsed?: {              // Your existing field
    input: number;
    output: number;
    total: number;
  };
  
  // NEW: Performance and caching fields
  cached?: boolean;           // True if response came from cache
  responseTime?: number;      // Total response time in milliseconds
  cacheHit?: boolean;         // More specific cache hit indicator
  cacheAge?: number;          // Age of cached response in seconds
  instantResponse?: boolean;  // True if this was an instant keyword response
  optimizations?: string[];   // List of optimizations applied ("cache", "instant", etc.)
}

export type Strategy = "cheap" | "quality" | "balanced" | "fast"; // Added "fast" strategy

export interface AIRouterRequest {
  prompt: string;
  strategy?: Strategy;
  
  // NEW: Cache control options
  useCache?: boolean;         // Allow disabling cache for specific requests (default: true)
  bypassInstantResponse?: boolean; // Skip instant responses (default: false)
  cacheOnly?: boolean;        // Only return cached responses, fail if not cached (for testing)
  maxTokens?: number;         // Override default token limits
  temperature?: number;       // Override default temperature
}

export interface ProviderResponse {
  success: boolean;
  data?: string;
  error?: string;
  inputTokens?: number;       // Your existing field
  outputTokens?: number;      // Your existing field
  
  // NEW: Enhanced provider response fields
  executionTime?: number;     // Time taken by this specific provider
  model?: string;             // Model name used by the provider
  rateLimited?: boolean;      // Was this request rate limited?
  retryAfter?: number;        // Retry after X seconds if rate limited
}

// NEW: Cache-specific interfaces
export interface CacheEntry {
  response: string;
  timestamp: number;
  provider: string;
  strategy: string;
  cost?: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  originalDuration?: number;  // How long the original API call took
}

export interface CacheStats {
  size: number;               // Current number of cached entries
  maxSize: number;            // Maximum cache size
  instantResponsesCount: number; // Number of instant responses available
  oldestEntry?: string;       // Age of oldest cache entry
  newestEntry?: string;       // Age of newest cache entry
  totalCostSaved?: number;    // Total cost saved by caching (in dollars)
  hitCount?: number;          // Total cache hits since startup
  missCount?: number;         // Total cache misses since startup
  hitRate?: number;           // Cache hit rate percentage
}

// NEW: Cost estimation interface
export interface CostEstimate {
  provider: string;
  estimatedCost: number;
  model: string;
  tokensEstimate: {
    input: number;
    output: number;
    total: number;
  };
  cached?: boolean;           // Will this likely come from cache?
  instantResponse?: boolean;  // Will this be an instant response?
  estimatedTime?: number;     // Estimated response time in ms
}

// NEW: Provider status interface (enhanced from your existing)
export interface ProviderStatus {
  provider: string;
  available: boolean;
  model: string;
  inputCostPer1M: number;     // Your existing cost tracking
  outputCostPer1M: number;    // Your existing cost tracking
  
  // NEW: Performance metrics
  avgResponseTime?: number;    // Average response time in ms
  successRate?: number;        // Success rate percentage (0-100)
  lastUsed?: number;          // Timestamp of last successful use
  totalRequests?: number;      // Total requests made to this provider
  totalCost?: number;         // Total cost accumulated for this provider
  errorCount?: number;        // Number of errors from this provider
}

// NEW: Detailed response for admin/monitoring endpoints
export interface AIRouterDetailedResponse extends AIRouterResponse {
  metadata: {
    requestId: string;
    timestamp: number;
    cacheStats: CacheStats;
    providerOrder: string[];        // Order providers were tried
    failedProviders: string[];      // Providers that failed
    totalProviderTries: number;     // How many providers were attempted
    firstProviderTime?: number;     // Time to first provider response
    fallbackUsed?: boolean;         // Whether fallback logic was used
  };
}

// NEW: Router configuration interface
export interface RouterConfig {
  cacheEnabled: boolean;
  instantResponsesEnabled: boolean;
  maxCacheSize: number;
  cacheDuration: number;          // in milliseconds
  defaultTimeout: number;         // in milliseconds
  retryAttempts: number;
  strategies: {
    [K in Strategy]: {
      preferredProviders: string[];
      maxTokens: number;
      temperature: number;
      timeout: number;
      costPriority: number;       // 0-1, how much to prioritize cost vs quality
    };
  };
}

// NEW: Performance monitoring interface
export interface PerformanceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  instantResponses: number;
  avgResponseTime: number;
  totalCostSaved: number;
  providerPerformance: {
    [provider: string]: {
      requests: number;
      avgTime: number;
      successRate: number;
      totalCost: number;
    };
  };
  strategyUsage: {
    [strategy: string]: number;
  };
}