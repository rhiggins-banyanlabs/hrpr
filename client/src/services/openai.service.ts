import { ConferenceDataService } from './conference-data.service';
import { LocationService } from './location.service';
import { PromptEnhancementService } from './prompt-enhancement.service';
import { LoggerService } from './logger.service';
import { envConfig } from '@/config/env.config';

export interface OpenAIResponse {
  success: boolean;
  data?: string;
  error?: string;
  responseTime: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
}

export class OpenAIService {
  private static instance: OpenAIService;
  private logger: LoggerService;
  private conferenceService: ConferenceDataService;
  private locationService: LocationService;
  private promptEnhancer: PromptEnhancementService;
  private readonly model = 'gpt-4o-mini';
  private readonly inputCostPer1M = 0.15;
  private readonly outputCostPer1M = 0.6;

  private constructor() {
    this.logger = new LoggerService();
    this.conferenceService = new ConferenceDataService();
    this.locationService = new LocationService();
    this.promptEnhancer = new PromptEnhancementService(
      this.conferenceService,
      this.locationService
    );
  }

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * this.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * this.outputCostPer1M;
    return inputCost + outputCost;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async sendMessage(prompt: string): Promise<OpenAIResponse> {
    const startTime = Date.now();
    
    try {
      const enhancedPrompt = await this.promptEnhancer.createEnhancedPrompt(prompt);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${envConfig.openai}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000), // 8 second timeout
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are Harper, a helpful AI assistant for the AIDA conference. You're friendly, conversational, and knowledgeable about the conference and Denver area.

RULES:
- Use provided conference information when available - never make up conference data
- For location queries, provide helpful information about nearby places, restaurants, and venues
- Be conversational and natural - avoid overly formal language
- Keep responses focused but complete (aim for 1-3 sentences for most queries)
- If specific conference data isn't available, suggest checking with organizers
- For general questions about Denver, technology, or AIDA, provide helpful context

You help with: conference schedules, speakers, sessions, Denver area recommendations, dining, transportation, and general conference questions.`
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: 200, // Allow for more complete responses
          temperature: 0.3, // More natural conversation
          stream: false // Disable streaming - simpler and faster for short responses
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.addErrorLog('openai', `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`, 'balanced');
        
        const responseTime = Date.now() - startTime;
        return {
          success: false,
          error: `OpenAI API error: ${errorData.error?.message || response.statusText}`,
          responseTime,
          tokensUsed: { input: 0, output: 0, total: 0 },
          cost: 0
        };
      }

      // Handle non-streaming response (faster for short responses)
      const data = await response.json();
      const botResponse = data.choices[0]?.message?.content || 'I apologize, but I\'m having trouble generating a response right now.';
      
      const responseTime = Date.now() - startTime;
      const inputTokens = data.usage?.prompt_tokens || this.estimateTokens(enhancedPrompt);
      const outputTokens = data.usage?.completion_tokens || this.estimateTokens(botResponse);
      const cost = this.calculateCost(inputTokens, outputTokens);

      this.logger.addSuccessLog('openai', responseTime, cost, 'balanced');

      return {
        success: true,
        data: botResponse,
        responseTime,
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        cost
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.logger.addErrorLog('openai', errorMessage, 'balanced');
      
      return {
        success: false,
        error: errorMessage,
        responseTime,
        tokensUsed: { input: 0, output: 0, total: 0 },
        cost: 0
      };
    }
  }

  getLogs() {
    return this.logger.getLogs();
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

  // Static method for direct access
  static async getResponse(prompt: string, signal?: AbortSignal): Promise<{ text: string; processingTime: number }> {
    const instance = OpenAIService.getInstance();
    const startTime = Date.now();
    
    try {
      const response = await instance.sendMessage(prompt);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get response');
      }
      
      return {
        text: response.data,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      throw error;
    }
  }
}