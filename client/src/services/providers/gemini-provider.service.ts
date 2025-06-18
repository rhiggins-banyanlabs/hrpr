// src/services/providers/gemini-provider.service.ts
import { BaseProviderService } from './base-provider.service';
import { ProviderResponse } from '@/types/ai-router.types';
import { PROVIDER_COSTS } from '@/config/ai-providers.config';

export class GeminiProviderService extends BaseProviderService {
  constructor() {
    super('gemini', PROVIDER_COSTS.gemini);
  }

  async makeRequest(prompt: string): Promise<ProviderResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
      };
    }

    const data = await response.json();
    
    // Check if we have a valid response structure
    if (!data.candidates || 
        !data.candidates[0] || 
        !data.candidates[0].content || 
        !data.candidates[0].content.parts || 
        !data.candidates[0].content.parts[0]) {
      return {
        success: false,
        error: 'Invalid response structure from Gemini API',
      };
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Extract token usage for better cost tracking
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

    return {
      success: true,
      data: text,
      inputTokens,
      outputTokens,
    };
  }
}