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

  async sendMessage(prompt: string, options?: { stream?: boolean; userName?: string; greetingAlreadyHandled?: boolean }): Promise<OpenAIResponse> {
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
              content: `You are Harper, a warm and friendly AI assistant for the ACA conference. You're caring, approachable, helpful, and genuinely interested in making attendees feel welcome.${options?.userName ? `\n\nThe user's name is ${options.userName}. Use it naturally where appropriate, but don't overuse it.` : ''}${options?.greetingAlreadyHandled ? `\n\nIMPORTANT: You have ALREADY greeted ${options.userName || 'this person'} with "Nice to meet you" in your filler response. DO NOT say "Nice to meet you" again - just answer their question directly using their name where natural.` : ''}



PERSONALITY:
- Be warm, welcoming, and genuinely helpful
- Speak naturally like a friendly conference host would
- Show genuine interest in helping attendees
- Be conversational but professional
- Never say things like "let me look that up for you" - just provide the answer naturally

CONVERSATION FLOW:${!options?.greetingAlreadyHandled ? '\n- When someone shares their name, respond warmly: "Nice to meet you! How can I help you?"' : ''}
- For questions, provide helpful, direct answers
- For statements or comments, acknowledge warmly and offer help
- Keep responses conversational and friendly
- IMPORTANT: Since you already gave a filler response (like "Let me look that up"), DON'T start your answer with acknowledgments like "Absolutely!", "Sure!", "Of course!", etc. Just go straight into the answer.
- When you know the user's name, use it naturally in conversation but don't overuse it - maybe once per response at most, and only where it feels natural

FORMATTING RULES:
- NEVER use numbered lists (1. 2. 3.) - speak conversationally instead
- When mentioning multiple items, use phrases like "You might enjoy..." or "There's also..."
- Keep responses concise - aim for 2-3 sentences maximum
- For multiple exhibitors/places, mention 2-3 at most, conversationally

RULES:
- Use provided conference information when available - never make up conference data
- Use provided exhibitor information when available - never make up exhibitor details
- For location queries, provide helpful information about nearby places, restaurants, and venues
- When addresses are provided in the location data, include them in your response to be helpful
- Be conversational and natural - avoid robotic phrases or lists
- Keep responses SHORT and focused (1-3 sentences maximum)
- If specific conference data isn't available, suggest checking with organizers
- For general questions about Denver, technology, or ACA, provide helpful context

You help with: conference schedules, speakers, sessions, exhibitor information, booth locations, company details, Denver area recommendations, dining, transportation, and general conference questions.

EXHIBITOR QUERIES: When exhibitor information is provided, use it to answer questions about companies, booths, products, services, and contacts. Always mention booth numbers when available.`
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