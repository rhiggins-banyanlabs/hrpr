// src/services/ai-router.service.ts - ENHANCED VERSION WITH YOUR TYPES
import { AIRouterResponse, Strategy, LogEntry } from "@/types/ai-router.types";
import { LoggerService } from "./logger.service";
import { ProviderFactory } from "./providers/provider-factory.service";
import { CacheService } from "./cache.service"; // NEW: Add cache service
import {
  getStrategyOrder,
  calculateProviderCost,
  PROVIDER_COSTS_DETAILED,
} from "@/config/ai-providers.config";

export class AIRouterService {
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
  }

  async routeRequest(
    prompt: string,
    strategy: Strategy,
  ): Promise<AIRouterResponse> {
    console.log(`[AI Router] Strategy: ${strategy}, Prompt: ${prompt.substring(0, 50)}...`);
    const startTime = Date.now();

    // OPTIMIZATION 1: Check for instant responses first (5-50ms)
    const instantResponse = CacheService.getInstantResponse(prompt);
    if (instantResponse) {
      const duration = Date.now() - startTime;
      console.log(`⚡ INSTANT RESPONSE TIME: ${duration}ms`);
      
      // Add instant response log using your LogEntry format
      this.logger.addSuccessLog(
        'instant-cache',
        duration,
        0, // No cost for instant responses
        strategy,
        0, // No input tokens
        0  // No output tokens
      );

      return {
        provider: 'instant-cache',
        response: instantResponse,
        logs: this.logger.getLogs(),
        strategy,
        cost: 0,
        tokensUsed: {
          input: 0,
          output: 0,
          total: 0,
        },
        cached: true,
        instantResponse: true,
        responseTime: duration,
        optimizations: ['instant-response']
      };
    }

    // OPTIMIZATION 2: Check response cache (50-200ms)
    const cachedResult = CacheService.getCachedResponse(prompt, strategy);
    if (cachedResult) {
      const duration = Date.now() - startTime;
      const cacheAge = Math.round((Date.now() - cachedResult.timestamp) / 1000);
      console.log(`🚀 CACHE HIT! Response time: ${duration}ms, Age: ${cacheAge}s`);
      
      // Add cache hit log using your LogEntry format
      this.logger.addSuccessLog(
        `${cachedResult.provider}-cached`,
        duration,
        cachedResult.cost ? (cachedResult.cost * 1000) : 0, // Convert back to per-1K format for your logger
        strategy,
        cachedResult.tokensUsed?.input || 0,
        cachedResult.tokensUsed?.output || 0
      );

      return {
        provider: `${cachedResult.provider}-cached`,
        response: cachedResult.response,
        logs: this.logger.getLogs(),
        strategy,
        cost: cachedResult.cost || 0,
        tokensUsed: cachedResult.tokensUsed || {
          input: 0,
          output: 0,
          total: 0,
        },
        cached: true,
        cacheHit: true,
        cacheAge,
        responseTime: duration,
        optimizations: ['response-cache']
      };
    }

    // OPTIMIZATION 3: Get optimized provider order based on strategy
    const providerOrder = this.getOptimizedProviderOrder(strategy);
    console.log(`[AI Router] Optimized provider order for ${strategy}:`, providerOrder);

    // Estimate token usage for cost calculation
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = this.getOptimizedOutputTokens(strategy, estimatedInputTokens);

    const failedProviders: string[] = [];
    const optimizations: string[] = [];

    for (const providerName of providerOrder) {
      try {
        console.log(`[AI Router] Trying provider: ${providerName}`);
        
        const provider = ProviderFactory.getProvider(providerName);
        
        // OPTIMIZATION 4: Create optimized prompt and options based on strategy
        const optimizedPrompt = this.optimizePromptForStrategy(prompt, strategy);
        if (optimizedPrompt !== prompt) {
          optimizations.push('prompt-optimization');
        }

        const result = await provider.execute(optimizedPrompt);

        if (result.success && result.data) {
          const duration = Date.now() - startTime;

          // Calculate actual cost using your existing logic
          const actualInputTokens = result.inputTokens || estimatedInputTokens;
          const actualOutputTokens = result.outputTokens || estimatedOutputTokens;
          const actualCost = calculateProviderCost(
            providerName as keyof typeof PROVIDER_COSTS_DETAILED,
            actualInputTokens,
            actualOutputTokens,
          );

          // Add success log using your existing logger
          this.logger.addSuccessLog(
            provider.getName(),
            duration,
            actualCost,
            strategy,
            actualInputTokens,
            actualOutputTokens,
          );

          const response: AIRouterResponse = {
            provider: provider.getName(),
            response: result.data,
            logs: this.logger.getLogs(),
            strategy,
            cost: actualCost,
            tokensUsed: {
              input: actualInputTokens,
              output: actualOutputTokens,
              total: actualInputTokens + actualOutputTokens,
            },
            responseTime: duration,
            optimizations: optimizations.length > 0 ? optimizations : undefined
          };

          // OPTIMIZATION 5: Cache successful responses for future use
          if (result.data && actualCost > 0) {
            CacheService.setCachedResponse(
              prompt,
              strategy,
              result.data,
              provider.getName(),
              actualCost,
              {
                input: actualInputTokens,
                output: actualOutputTokens,
                total: actualInputTokens + actualOutputTokens,
              },
              duration
            );
            optimizations.push('response-cached');
          }

          console.log(`✅ Success with ${provider.getName()} in ${duration}ms`);
          return response;
        } else {
          failedProviders.push(providerName);
          this.logger.addErrorLog(
            provider.getName(),
            result.error || "Unknown error",
            strategy,
          );
          console.log(`❌ ${provider.getName()} failed: ${result.error}`);
        }
      } catch (error) {
        failedProviders.push(providerName);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.logger.addErrorLog(providerName, errorMessage, strategy);
        console.log(`❌ ${providerName} threw error: ${errorMessage}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`❌ All providers failed after ${duration}ms. Failed: ${failedProviders.join(', ')}`);

    return {
      logs: this.logger.getLogs(),
      strategy,
      error: `All providers failed. Tried: ${failedProviders.join(', ')}`,
      responseTime: duration
    };
  }

  /**
   * OPTIMIZATION: Get provider order optimized for speed based on strategy
   */
  private getOptimizedProviderOrder(strategy: Strategy): string[] {
    const baseOrder = getStrategyOrder(strategy);
    
    // For cheap strategy, prioritize cost-effective providers
    if (strategy === 'cheap') {
      return baseOrder.sort((a, b) => {
        const costOrder = ['groq', 'openai', 'anthropic', 'google'];
        return costOrder.indexOf(a) - costOrder.indexOf(b);
      });
    }
    
    // For balanced, balance speed and cost
    if (strategy === 'balanced') {
      return baseOrder.sort((a, b) => {
        const balancedOrder = ['openai', 'groq', 'anthropic', 'google'];
        return balancedOrder.indexOf(a) - balancedOrder.indexOf(b);
      });
    }
    
    // For quality, use your existing order
    return baseOrder;
  }

  /**
   * OPTIMIZATION: Get optimized output token limits based on strategy
   */
  private getOptimizedOutputTokens(strategy: Strategy, inputTokens: number): number {
    switch (strategy) {
      case 'cheap':
        return Math.min(inputTokens * 1.5, 150); // Limit for cost savings
      case 'balanced':
        return Math.min(inputTokens * 2, 250); // Moderate limit
      case 'quality':
        return inputTokens * 3; // Allow longer responses
      default:
        return inputTokens * 2;
    }
  }

  /**
   * OPTIMIZATION: Create optimized prompts based on strategy
   */
  private optimizePromptForStrategy(prompt: string, strategy: Strategy): string {
    if (strategy === 'cheap') {
      // For cheap responses, add instruction to be brief
      return `${prompt}\n\nPlease provide a brief, direct response (under 200 characters).`;
    }
    
    if (strategy === 'balanced') {
      // For balanced, ask for concise but complete responses
      return `${prompt}\n\nPlease provide a helpful, concise response (under 300 characters).`;
    }
    
    // For quality, use original prompt
    return prompt;
  }

  // Enhanced cost estimation with caching consideration
  async estimateCost(
    prompt: string,
    strategy: Strategy,
    expectedOutputRatio: number = 2,
  ): Promise<{ provider: string; estimatedCost: number; model: string; cached?: boolean; instantResponse?: boolean }[]> {
    // Check if response might be cached or instant (cost = 0)
    const instantResponse = CacheService.getInstantResponse(prompt);
    const cachedResponse = CacheService.getCachedResponse(prompt, strategy);
    
    if (instantResponse) {
      return [{
        provider: 'instant-cache',
        estimatedCost: 0,
        model: 'keyword-matching',
        instantResponse: true
      }];
    }
    
    if (cachedResponse) {
      return [{
        provider: 'response-cache',
        estimatedCost: 0,
        model: 'cached-response',
        cached: true
      }];
    }

    // Use your existing cost estimation logic
    const providerOrder = getStrategyOrder(strategy);
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = this.getOptimizedOutputTokens(strategy, estimatedInputTokens);

    return providerOrder
      .map((providerName) => {
        const cost = calculateProviderCost(
          providerName as keyof typeof PROVIDER_COSTS_DETAILED,
          estimatedInputTokens,
          estimatedOutputTokens,
        );

        return {
          provider: providerName,
          estimatedCost: cost,
          model: PROVIDER_COSTS_DETAILED[
            providerName as keyof typeof PROVIDER_COSTS_DETAILED
          ].model,
          cached: false,
          instantResponse: false
        };
      })
      .sort((a, b) => a.estimatedCost - b.estimatedCost);
  }

  // Enhanced provider status with cache information
  getProviderStatus(): Array<{
    provider: string;
    available: boolean;
    model: string;
    inputCostPer1M: number;
    outputCostPer1M: number;
    cacheStats?: any;
  }> {
    const availableProviders = getStrategyOrder("balanced");
    const cacheStats = CacheService.getCacheStats();

    const providers = Object.entries(PROVIDER_COSTS_DETAILED).map(
      ([provider, config]) => ({
        provider,
        available: availableProviders.includes(provider),
        model: config.model,
        inputCostPer1M: config.input,
        outputCostPer1M: config.output,
      }),
    );

    // Add cache provider as virtual provider
    providers.unshift({
      provider: 'cache-system',
      available: true,
      model: 'instant + 5min cache',
      inputCostPer1M: 0,
      outputCostPer1M: 0,
      cacheStats
    });

    return providers;
  }

  /**
   * Clear cache manually (useful for testing or admin functions)
   */
  clearCache(): void {
    CacheService.clearCache();
    console.log('🗑️ AI Router cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return CacheService.getCacheStats();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return CacheService.getPerformanceMetrics();
  }

  /**
   * Add custom instant response (useful for admin interface)
   */
  addInstantResponse(keyword: string, response: string): void {
    CacheService.addInstantResponse(keyword, response);
    console.log(`⚡ Added instant response for: ${keyword}`);
  }

  /**
   * Remove instant response
   */
  removeInstantResponse(keyword: string): boolean {
    return CacheService.removeInstantResponse(keyword);
  }

  /**
   * Check if prompt would be handled by cache/instant response (for testing)
   */
  willUseCache(prompt: string, strategy: Strategy): { 
    instantResponse: boolean; 
    cachedResponse: boolean; 
    cacheAge?: number 
  } {
    const hasInstant = CacheService.hasInstantResponse(prompt);
    const hasCached = CacheService.hasCachedResponse(prompt, strategy);
    const cacheAge = CacheService.getCacheAge(prompt, strategy);

    return {
      instantResponse: hasInstant,
      cachedResponse: hasCached,
      cacheAge: cacheAge || undefined
    };
  }

  /**
   * Preload cache with common conference responses (useful for startup)
   */
  preloadCommonResponses(): void {
    console.log('🔥 Preloading common conference responses...');
    
    const commonQuestions = [
      { prompt: "What time is lunch?", strategy: "cheap" as Strategy },
      { prompt: "Where is the conference?", strategy: "cheap" as Strategy },
      { prompt: "What's the schedule?", strategy: "cheap" as Strategy },
      { prompt: "When is the keynote?", strategy: "cheap" as Strategy },
      { prompt: "Where can I park?", strategy: "cheap" as Strategy },
      { prompt: "What food options are available?", strategy: "cheap" as Strategy }
    ];

    let preloadedCount = 0;
    commonQuestions.forEach(({ prompt, strategy }) => {
      const instant = CacheService.getInstantResponse(prompt);
      if (instant) {
        CacheService.setCachedResponse(
          prompt, 
          strategy, 
          instant, 
          'preload', 
          0, 
          { input: 0, output: 0, total: 0 },
          0
        );
        preloadedCount++;
      }
    });

    console.log(`🔥 Preloaded ${preloadedCount} common responses into cache`);
  }
}