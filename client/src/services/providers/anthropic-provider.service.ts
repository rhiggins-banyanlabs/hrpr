import { BaseProviderService } from "./base-provider.service";
import { ProviderResponse } from "@/types/ai-router.types";
import { PROVIDER_COSTS, MODELS } from "@/config/ai-providers.config";

export class AnthropicProviderService extends BaseProviderService {
  constructor() {
    super("anthropic", PROVIDER_COSTS.anthropic);
  }

  async makeRequest(prompt: string): Promise<ProviderResponse> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELS.anthropic,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
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
      data: data.content[0].text,
    };
  }
}
