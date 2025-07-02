// src/services/routing-strategy.service.ts
import { Strategy } from "@/types/ai-router.types";
import { 
  getStrategyOrder, 
  calculateProviderCost, 
  PROVIDER_COSTS_DETAILED 
} from "@/config/ai-providers.config";

export class RoutingStrategyService {
  /**
   * Get optimized provider order based on strategy
   */
  getOptimizedProviderOrder(strategy: Strategy): string[] {
    const baseOrder = getStrategyOrder(strategy);
    
    if (strategy === 'cheap') {
      return baseOrder.sort((a, b) => {
        const costOrder = ['groq', 'openai', 'anthropic', 'google'];
        return costOrder.indexOf(a) - costOrder.indexOf(b);
      });
    }
    
    if (strategy === 'balanced') {
      return baseOrder.sort((a, b) => {
        const balancedOrder = ['openai', 'groq', 'anthropic', 'google'];
        return balancedOrder.indexOf(a) - balancedOrder.indexOf(b);
      });
    }
    
    return baseOrder;
  }

  /**
   * Get optimized output token limits
   */
  getOptimizedOutputTokens(strategy: Strategy, inputTokens: number): number {
    switch (strategy) {
      case 'cheap':
        return Math.min(inputTokens * 1.5, 150);
      case 'balanced':
        return Math.min(inputTokens * 2, 250);
      case 'quality':
        return inputTokens * 3;
      default:
        return inputTokens * 2;
    }
  }

  /**
   * Estimate cost for a given prompt and strategy
   */
  async estimateCost(
    prompt: string,
    strategy: Strategy,
    expectedOutputRatio: number = 2,
  ): Promise<{ provider: string; estimatedCost: number; model: string; cached?: boolean; instantResponse?: boolean }[]> {
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

  /**
   * Get provider status information
   */
  getProviderStatus(): Array<{
    provider: string;
    available: boolean;
    model: string;
    inputCostPer1M: number;
    outputCostPer1M: number;
  }> {
    const availableProviders = getStrategyOrder("balanced");

    return Object.entries(PROVIDER_COSTS_DETAILED).map(
      ([provider, config]) => ({
        provider,
        available: availableProviders.includes(provider),
        model: (config as any).model,
        inputCostPer1M: (config as any).input,
        outputCostPer1M: (config as any).output,
      }),
    );
  }

  /**
   * Calculate actual cost for a completed request
   */
  calculateActualCost(
    providerName: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    return calculateProviderCost(
      providerName as keyof typeof PROVIDER_COSTS_DETAILED,
      inputTokens,
      outputTokens,
    );
  }
}