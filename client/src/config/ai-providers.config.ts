import { Strategy } from '@/types/ai-router.types';

export const PROVIDER_COSTS_DETAILED = {
  openai: {
    input: 0.15,       // $0.15 per 1M input tokens (GPT-4o mini)
    output: 0.60,      // $0.60 per 1M output tokens (GPT-4o mini)
    model: 'gpt-4o-mini'
  },
  anthropic: {
    input: 3.00,       // $3.00 per 1M input tokens  
    output: 15.00,     // $15.00 per 1M output tokens
    model: 'claude-3-5-sonnet-20241022'
  },
  gemini: {
    input: 0.075,      // $0.075 per 1M input tokens (≤128K context)
    output: 0.30,      // $0.30 per 1M output tokens (≤128K context)
    model: 'gemini-1.5-flash'
  },
  cohere: {
    input: 0.50,       // $0.50 per 1M input tokens
    output: 1.50,      // $1.50 per 1M output tokens  
    model: 'command-r-08-2024'
  },
} as const;

export const calculateProviderCost = (
  provider: keyof typeof PROVIDER_COSTS_DETAILED,
  inputTokens: number,
  outputTokens: number
): number => {
  const costs = PROVIDER_COSTS_DETAILED[provider];
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;
  return inputCost + outputCost;
};

export const STRATEGY_ORDER: Record<Strategy, string[]> = {
  cheap: ['gemini', 'openai', 'cohere', 'anthropic'],        // Cheapest first
  quality: ['anthropic', 'openai', 'cohere', 'gemini'],      // Best quality first
  balanced: ['openai', 'gemini', 'cohere', 'anthropic'],     // Balance cost/performance
};

export const MODELS = {
  openai: PROVIDER_COSTS_DETAILED.openai.model,
  anthropic: PROVIDER_COSTS_DETAILED.anthropic.model, 
  gemini: PROVIDER_COSTS_DETAILED.gemini.model,
  cohere: PROVIDER_COSTS_DETAILED.cohere.model,
} as const;

export const TYPICAL_COST_COMPARISON = {
  openai: calculateProviderCost('openai', 1000, 3000),        // ~$0.0018
  anthropic: calculateProviderCost('anthropic', 1000, 3000),  // ~$0.048  
  gemini: calculateProviderCost('gemini', 1000, 3000),        // ~$0.001
  cohere: calculateProviderCost('cohere', 1000, 3000),        // ~$0.005
};

export const getCheapestProvider = (inputTokens: number, outputTokens: number) => {
  const costs = Object.entries(PROVIDER_COSTS_DETAILED).map(([provider, _]) => ({
    provider,
    cost: calculateProviderCost(provider as keyof typeof PROVIDER_COSTS_DETAILED, inputTokens, outputTokens)
  }));
  
  return costs.reduce((cheapest, current) => 
    current.cost < cheapest.cost ? current : cheapest
  );
};

export const getProviderInfo = (
  provider: keyof typeof PROVIDER_COSTS_DETAILED,
  inputTokens: number = 1000,
  outputTokens: number = 3000
) => ({
  provider,
  model: PROVIDER_COSTS_DETAILED[provider].model,
  inputCostPer1M: PROVIDER_COSTS_DETAILED[provider].input,
  outputCostPer1M: PROVIDER_COSTS_DETAILED[provider].output,
  estimatedCost: calculateProviderCost(provider, inputTokens, outputTokens),
});

export const getAllProviderCosts = (inputTokens: number = 1000, outputTokens: number = 3000) => {
  return Object.keys(PROVIDER_COSTS_DETAILED).map(provider => 
    getProviderInfo(provider as keyof typeof PROVIDER_COSTS_DETAILED, inputTokens, outputTokens)
  ).sort((a, b) => a.estimatedCost - b.estimatedCost);
};

export const getAvailableProviders = (): string[] => {
  const providers = [];
  
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');
  if (process.env.GEMINI_API_KEY) providers.push('gemini');
  if (process.env.COHERE_API_KEY) providers.push('cohere');
  
  return providers;
};

export const getStrategyOrder = (strategy: Strategy): string[] => {
  const available = getAvailableProviders();
  return STRATEGY_ORDER[strategy].filter(provider => 
    available.includes(provider)
  );
};

export const PROVIDER_COSTS = {
  openai: 0.51,        // GPT-4o mini (blended cost)
  anthropic: 12.00,    // Claude 3.5 Sonnet (blended cost) 
  gemini: 0.2625,      // Gemini 1.5 Flash (blended cost)
  cohere: 1.25,        // Command R (blended cost)
} as const;