import { BaseProviderService } from './base-provider.service';
import { ProviderResponse } from '@/types/ai-router.types';
import { PROVIDER_COSTS, MODELS } from '@/config/ai-providers.config';
import { envConfig } from '@/config/env.config';

export class OpenAIProviderService extends BaseProviderService {
  constructor() {
    super('openai', PROVIDER_COSTS.openai);
  }

  async makeRequest(prompt: string): Promise<ProviderResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${envConfig.openai}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.openai,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.choices[0].message.content,
    };
  }
}