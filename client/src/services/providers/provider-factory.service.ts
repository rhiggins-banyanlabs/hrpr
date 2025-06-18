import { BaseProviderService } from './base-provider.service';
import { OpenAIProviderService } from './openai-provider.service';
import { AnthropicProviderService } from './anthropic-provider.service';
import { GeminiProviderService } from './gemini-provider.service';
import { CohereProviderService } from './cohere-provider.service';

export class ProviderFactory {
  private static providers: Map<string, BaseProviderService> = new Map([
    ['openai', new OpenAIProviderService()],
    ['anthropic', new AnthropicProviderService()],
    ['gemini', new GeminiProviderService()],
    ['cohere', new CohereProviderService()],
  ]);

  static getProvider(name: string): BaseProviderService {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Unknown provider: ${name}`);
    }
    return provider;
  }

  static getProvidersByStrategy(strategy: string): BaseProviderService[] {
    const { STRATEGY_ORDER } = require('@/config/ai-providers.config');
    const providerNames = STRATEGY_ORDER[strategy] || STRATEGY_ORDER.balanced;
    
    return providerNames.map((name: string) => this.getProvider(name));
  }
}