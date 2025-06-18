import { ProviderResponse } from '@/types/ai-router.types';

export abstract class BaseProviderService {
  constructor(
    protected readonly name: string,
    protected readonly costPer1K: number
  ) {}

  abstract makeRequest(prompt: string): Promise<ProviderResponse>;

  async execute(prompt: string): Promise<ProviderResponse> {
    try {
      console.log(`[AI Router] Trying provider: ${this.name}`);
      const result = await this.makeRequest(prompt);
      
      if (result.success) {
        console.log(`[AI Router] Used provider: ${this.name}`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[AI Router] Provider ${this.name} failed:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  getCostPer1K(): number {
    return this.costPer1K;
  }

  getName(): string {
    return this.name;
  }
}