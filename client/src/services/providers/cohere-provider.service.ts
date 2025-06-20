import { BaseProviderService } from "./base-provider.service";
import { ProviderResponse } from "@/types/ai-router.types";
import { PROVIDER_COSTS, MODELS } from "@/config/ai-providers.config";

export class CohereProviderService extends BaseProviderService {
  constructor() {
    super("cohere", PROVIDER_COSTS.cohere);
  }

  async makeRequest(prompt: string): Promise<ProviderResponse> {
    const response = await fetch("https://api.cohere.ai/v1/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELS.cohere,
        message: prompt,
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
      data: data.text,
    };
  }
}
