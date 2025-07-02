// src/services/ai-router.service.ts - Refactored with proper separation of concerns
import { AIRouterResponse, Strategy } from "@/types/ai-router.types";
import { LoggerService } from "./logger.service";
import { ProviderFactory } from "./providers/provider-factory.service";
import { CacheService } from "./cache.service";
import { ConferenceDataService } from "./conference-data.service";
import { LocationService } from "./location.service";
import { PromptEnhancementService } from "./prompt-enhancement.service";
import { RoutingStrategyService } from "./routing-strategy.service";
import { ResponseCacheService } from "./response-cache.service";

export class AIRouterService {
  private logger: LoggerService;
  private conferenceService: ConferenceDataService;
  private locationService: LocationService;
  private promptEnhancer: PromptEnhancementService;
  private routingStrategy: RoutingStrategyService;
  private responseCacheService: ResponseCacheService;

  constructor() {
    this.logger = new LoggerService();
    this.conferenceService = new ConferenceDataService();
    this.locationService = new LocationService();
    this.promptEnhancer = new PromptEnhancementService(this.conferenceService, this.locationService);
    this.routingStrategy = new RoutingStrategyService();
    this.responseCacheService = new ResponseCacheService(this.conferenceService, this.locationService);
  }

  async routeRequest(
    prompt: string,
    strategy: Strategy,
  ): Promise<AIRouterResponse> {
    console.log(`[AI Router] Strategy: ${strategy}, Prompt: ${prompt.substring(0, 50)}...`);
    const startTime = Date.now();

    // Check for instant responses first
    const instantResponse = CacheService.getInstantResponse(prompt);
    if (instantResponse) {
      const duration = Date.now() - startTime;
      console.log(`⚡ INSTANT RESPONSE TIME: ${duration}ms`);
      
      this.logger.addSuccessLog(
        'instant-cache',
        duration,
        0,
        strategy
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

    // Check response cache (but skip for location queries to ensure fresh data)
    const locationIntent = this.locationService.detectLocationIntent(prompt);
    const isLocationQuery = locationIntent?.hasLocationIntent;
    
    const cachedResult = CacheService.getCachedResponse(prompt, strategy);
    if (cachedResult && !isLocationQuery) {
      const duration = Date.now() - startTime;
      const cacheAge = Math.round((Date.now() - cachedResult.timestamp) / 1000);
      console.log(`🚀 CACHE HIT! Response time: ${duration}ms, Age: ${cacheAge}s`);
      
      this.logger.addSuccessLog(
        `${cachedResult.provider}-cached`,
        duration,
        cachedResult.cost ? (cachedResult.cost * 1000) : 0,
        strategy
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
    
    if (isLocationQuery && cachedResult) {
      console.log(`🗺️ Skipping cache for location query to ensure fresh Google Maps data`);
    }

    // Get optimized provider order
    const providerOrder = this.routingStrategy.getOptimizedProviderOrder(strategy);
    console.log(`[AI Router] Provider order for ${strategy}:`, providerOrder);

    // Create enhanced prompt with conference and location data
    const enhancedPrompt = await this.promptEnhancer.createEnhancedPrompt(prompt);
    const hasEnhancements = enhancedPrompt !== prompt;
    const hasLocationData = this.locationService.detectLocationIntent(prompt)?.hasLocationIntent;

    // Debug: Log the enhanced prompt for conference questions
    if (prompt.toLowerCase().includes('schedule') || prompt.toLowerCase().includes('session')) {
      console.log('🔍 ENHANCED PROMPT FOR SCHEDULE QUESTION:');
      console.log('Original:', prompt);
      console.log('Enhanced:', enhancedPrompt.substring(0, 500) + '...');
      console.log('Has enhancements:', hasEnhancements);
      console.log('Speakers loaded:', this.conferenceService.getSpeakerCount());
      console.log('Sessions loaded:', this.conferenceService.getSessionCount());
    }
    
    // Debug: Log the enhanced prompt for location questions
    if (hasLocationData) {
      console.log('🗺️ ENHANCED PROMPT FOR LOCATION QUESTION:');
      console.log('Original:', prompt);
      console.log('Enhanced (FULL):', enhancedPrompt);
      console.log('Has location data:', hasLocationData);
      console.log('Location intent:', locationIntent);
    }

    // Estimate tokens
    const estimatedInputTokens = Math.ceil(enhancedPrompt.length / 4);
    const estimatedOutputTokens = this.routingStrategy.getOptimizedOutputTokens(strategy, estimatedInputTokens);

    const failedProviders: string[] = [];
    const optimizations: string[] = [];

    // Track optimizations
    if (hasEnhancements) {
      optimizations.push('data-enhanced');
    }
    if (hasLocationData) {
      optimizations.push('google-maps-data');
    }

    // Try providers in order
    for (const providerName of providerOrder) {
      try {
        console.log(`[AI Router] Trying provider: ${providerName}`);
        
        const provider = ProviderFactory.getProvider(providerName);
        
        // Optimize prompt for strategy
        const optimizedPrompt = this.promptEnhancer.optimizePromptForStrategy(enhancedPrompt, strategy);
        if (optimizedPrompt !== enhancedPrompt) {
          optimizations.push('prompt-optimized');
        }

        const result = await provider.execute(optimizedPrompt);

        if (result.success && result.data) {
          const duration = Date.now() - startTime;

          const actualInputTokens = result.inputTokens || estimatedInputTokens;
          const actualOutputTokens = result.outputTokens || estimatedOutputTokens;
          const actualCost = this.routingStrategy.calculateActualCost(
            providerName,
            actualInputTokens,
            actualOutputTokens,
          );

          this.logger.addSuccessLog(
            provider.getName(),
            duration,
            actualCost,
            strategy
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

          // Cache successful responses
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
        }
      } catch (error) {
        failedProviders.push(providerName);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.logger.addErrorLog(providerName, errorMessage, strategy);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`❌ All providers failed after ${duration}ms`);

    return {
      logs: this.logger.getLogs(),
      strategy,
      error: `All providers failed. Tried: ${failedProviders.join(', ')}`,
      responseTime: duration
    };
  }

  // Utility methods that delegate to the appropriate services
  async estimateCost(
    prompt: string,
    strategy: Strategy,
    expectedOutputRatio: number = 2,
  ): Promise<{ provider: string; estimatedCost: number; model: string; cached?: boolean; instantResponse?: boolean }[]> {
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

    const enhancedPrompt = await this.promptEnhancer.createEnhancedPrompt(prompt);
    return this.routingStrategy.estimateCost(enhancedPrompt, strategy, expectedOutputRatio);
  }

  getProviderStatus(): Array<{
    provider: string;
    available: boolean;
    model: string;
    inputCostPer1M: number;
    outputCostPer1M: number;
    cacheStats?: any;
  }> {
    const providers = this.routingStrategy.getProviderStatus();
    const cacheStats = this.responseCacheService.getCacheStats();

    const cacheSystemEntry = {
      provider: 'cache-system',
      available: true,
      model: 'instant + 5min cache',
      inputCostPer1M: 0,
      outputCostPer1M: 0,
      cacheStats
    } as any;

    providers.unshift(cacheSystemEntry);
    return providers;
  }

  clearCache(): void {
    this.responseCacheService.clearCache();
  }

  getCacheStats() {
    return this.responseCacheService.getCacheStats();
  }

  getPerformanceMetrics() {
    return this.responseCacheService.getPerformanceMetrics();
  }

  getConferenceDataStatus() {
    const conferenceStatus = this.conferenceService.getDataStatus();
    const venue = this.locationService.getConferenceVenue();
    const hotel = this.locationService.getHostHotel();
    
    return {
      ...conferenceStatus,
      googleMapsEnabled: !!process.env.GOOGLE_MAPS_API_KEY,
      venueLocation: venue,
      hotelLocation: hotel
    };
  }

  async refreshConferenceData(): Promise<void> {
    await this.conferenceService.refreshConferenceData();
  }

  async preloadCommonResponses(): Promise<void> {
    await this.responseCacheService.preloadCommonResponses();
  }
}