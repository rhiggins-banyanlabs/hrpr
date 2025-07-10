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
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are Connie, a friendly and helpful AI assistant for conference attendees. You provide accurate information about the conference using ONLY the real data provided to you.

IMPORTANT RULES:
- Use ONLY the conference information provided in the user's message - never make up schedules, speakers, or locations
- If specific information isn't available, be honest and suggest checking with conference organizers
- Be conversational, helpful, and concise
- Always use Markdown formatting for better readability
- Keep responses under 800 characters for better user experience
- Use bullet points and **bold** text for key information

WHAT YOU CAN HELP WITH:
- Conference schedule and session times
- Speaker information and backgrounds
- Session locations and details
- General conference questions
- Event logistics and navigation

Remember: Only use the information provided in the user's message. If you don't have specific details, acknowledge this and suggest the user check with conference organizers for the most up-to-date information.`
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
          stream: false
        }),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.addErrorLog('openai', `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`, 'balanced');
        
        return {
          success: false,
          error: `OpenAI API error: ${errorData.error?.message || response.statusText}`,
          responseTime,
          tokensUsed: { input: 0, output: 0, total: 0 },
          cost: 0
        };
      }

      const data = await response.json();
      const botResponse = data.choices[0]?.message?.content || 'I apologize, but I\'m having trouble generating a response right now.';
      
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
}