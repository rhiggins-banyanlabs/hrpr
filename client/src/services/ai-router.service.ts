// src/services/ai-router.service.ts
import { AIRouterResponse, Strategy } from "@/types/ai-router.types";
import { LoggerService } from "./logger.service";
import { ProviderFactory } from "./providers/provider-factory.service";
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
    console.log(`[AI Router] Strategy: ${strategy}`);

    const startTime = Date.now();
    // Use the new function that filters by available providers
    const providerOrder = getStrategyOrder(strategy);

    // Estimate token usage for cost calculation (rough estimates)
    const estimatedInputTokens = Math.ceil(prompt.length / 4); // ~4 chars per token
    const estimatedOutputTokens = estimatedInputTokens * 2; // Assume 2x output

    for (const providerName of providerOrder) {
      try {
        const provider = ProviderFactory.getProvider(providerName);
        const result = await provider.execute(prompt);

        if (result.success && result.data) {
          const duration = Date.now() - startTime;

          // Calculate actual cost using the new detailed pricing
          const actualInputTokens = result.inputTokens || estimatedInputTokens;
          const actualOutputTokens =
            result.outputTokens || estimatedOutputTokens;
          const actualCost = calculateProviderCost(
            providerName as keyof typeof PROVIDER_COSTS_DETAILED,
            actualInputTokens,
            actualOutputTokens,
          );

          this.logger.addSuccessLog(
            provider.getName(),
            duration,
            actualCost, // Use calculated cost instead of getCostPer1K
            strategy,
            actualInputTokens,
            actualOutputTokens,
          );

          return {
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
          };
        } else {
          this.logger.addErrorLog(
            provider.getName(),
            result.error || "Unknown error",
            strategy,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.addErrorLog(providerName, errorMessage, strategy);
      }
    }

    return {
      logs: this.logger.getLogs(),
      strategy,
      error: "All providers failed",
    };
  }

  // New helper method to get cost estimate before making request
  async estimateCost(
    prompt: string,
    strategy: Strategy,
    expectedOutputRatio: number = 2,
  ): Promise<{ provider: string; estimatedCost: number; model: string }[]> {
    const providerOrder = getStrategyOrder(strategy);
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = estimatedInputTokens * expectedOutputRatio;

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
          model:
            PROVIDER_COSTS_DETAILED[
              providerName as keyof typeof PROVIDER_COSTS_DETAILED
            ].model,
        };
      })
      .sort((a, b) => a.estimatedCost - b.estimatedCost);
  }

  // Get available providers with their cost info
  getProviderStatus(): Array<{
    provider: string;
    available: boolean;
    model: string;
    inputCostPer1M: number;
    outputCostPer1M: number;
  }> {
    const availableProviders = getStrategyOrder("balanced"); // Gets all available providers

    return Object.entries(PROVIDER_COSTS_DETAILED).map(
      ([provider, config]) => ({
        provider,
        available: availableProviders.includes(provider),
        model: config.model,
        inputCostPer1M: config.input,
        outputCostPer1M: config.output,
      }),
    );
  }
}
