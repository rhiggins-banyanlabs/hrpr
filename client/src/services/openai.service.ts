import { ConferenceDataService } from './conference-data.service';
import { LocationService } from './location.service';
import { PromptEnhancementService } from './prompt-enhancement.service';
import { LoggerService } from './logger.service';
import { ChatStorageService } from '@/lib/supabase/services/chatStorageService';
import { envConfig } from '@/config/env.config';
import { semanticRouterSupabase } from './semantic-router-supabase.service';

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
    
    // Initialize Supabase-based semantic router for intent detection
    this.initializeSemanticRouter();
  }

  private async initializeSemanticRouter(): Promise<void> {
    try {
      await semanticRouterSupabase.initialize();
      console.log('✅ Semantic router initialized with Supabase embeddings');
    } catch (error) {
      console.error('Failed to initialize Supabase semantic router:', error);
      // Continue without semantic routing - will fall back to keyword detection
    }
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

  async sendMessage(prompt: string, options?: { stream?: boolean; userName?: string; greetingAlreadyHandled?: boolean; sessionId?: string }): Promise<OpenAIResponse> {
    const startTime = Date.now();
    
    try {
      const enhancedPrompt = await this.promptEnhancer.createEnhancedPrompt(prompt);
      
      // Check if this is an address request
      const isAddressRequest = /\b(address|location|where is|how do i get to)\b/i.test(prompt);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${envConfig.openai}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout - optimized for speed
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are Harper, a warm and friendly AI assistant for the ACA conference. You're caring, approachable, helpful, and genuinely interested in making attendees feel welcome.${options?.userName ? `\n\nThe user's name is ${options.userName}. Use it naturally where appropriate, but don't overuse it.` : ''}${options?.greetingAlreadyHandled ? `\n\nIMPORTANT: You have ALREADY greeted ${options.userName || 'this person'} with "Nice to meet you" in your filler response. DO NOT say "Nice to meet you" again - just answer their question directly using their name where natural.` : ''}${isAddressRequest ? `\n\nIMPORTANT: The user is specifically asking for address/location information. Make sure to include the specific address in your response if it's available in the location data.` : ''}

CURRENT DATE AND TIME:
- Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Current time in Denver: ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true })}
- Use this information when answering questions about "what day is it", "what time is it", "today", "tomorrow", etc.

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

FOLLOW-UP QUESTIONS & CONTEXT:
- If the user asks for "more", "another", "other options", or "what else", provide DIFFERENT options than what you just mentioned
- NEVER repeat the same venues/restaurants you just told them about
- If you just mentioned Assembly Hall, Former Saint, and Peaks Lounge (on-site), and they ask for "more", show the NEARBY VENUES section with external restaurants
- When ON-SITE DINING is provided and user asks for "more", look for the NEARBY VENUES section in the enhanced prompt
- If NEARBY VENUES section is provided after user asked for "more", focus on those external options
- If a [CONTEXT] note is provided about a follow-up question, use it to understand what the user wants more of
- Track what you've already mentioned and provide new information on follow-ups
- Remember: "more" after on-site dining = show external venues from NEARBY VENUES section

FORMATTING RULES:
- NEVER use numbered lists (1. 2. 3.) - speak conversationally instead
- When mentioning multiple items, use phrases like "You might enjoy..." or "There's also..."
- For workshops/tours/sessions: provide comprehensive details in a conversational way
- For questions requiring lists: include all relevant items but present them naturally
- For general queries: keep responses appropriately sized for the question
- Complete your full response before asking the follow-up question

RULES:
- Use provided conference information when available - never make up conference data
- Use provided exhibitor information when available - never make up exhibitor details
- For location queries, provide helpful information about nearby places, restaurants, and venues
- For NON-CONFERENCE questions: Use gentle humor to redirect back to conference topics (see OFF-TOPIC REDIRECT examples)

- ADDRESSES: Only include specific addresses if the user specifically asks for an address, location, or "where is" something. Otherwise, just mention the place name and details like distance, rating, etc.

- Be conversational and natural - avoid robotic phrases or lists
- Keep responses SHORT and focused (1-3 sentences maximum)
- When you don't have specific information, be proactively helpful:
  * Suggest related information you DO have
  * Offer alternative solutions or resources
  * Guide users to where they can find the information
  * Provide general context that might be helpful
- For general questions about Denver, technology, or ACA, provide helpful context
- NEVER just say "check with organizers" - always try to be more helpful first

You help with: conference schedules, speakers, sessions, exhibitor information, booth locations, company details, Denver area recommendations, dining, transportation, and general conference questions.

HELPFUL UNCERTAINTY GUIDELINES:
When you don't have specific information, be genuinely helpful by:
- Offering related information you DO know (e.g., "I don't have that specific session's room, but I can tell you about similar sessions")
- Suggesting practical alternatives (e.g., "I don't have parking details, but here are nearby parking options in Denver")
- Providing context that helps (e.g., "While I don't have their exact booth location, they're typically in the technology section")
- Directing to specific helpful resources (e.g., "The conference app has real-time updates" or "The registration desk can help with that")
- Acknowledging what you tried (e.g., "I checked the available session data, but...")

EXAMPLES OF HELPFUL RESPONSES WHEN UNCERTAIN:
❌ BAD: "I don't have that information. Check with organizers."
✅ GOOD: "I don't see that specific session in my schedule data, but I can help you find similar cybersecurity sessions. Would you like me to share what's available?"

❌ BAD: "That information isn't available."
✅ GOOD: "I don't have their exact booth number, but Vantage is usually in the main exhibitor hall. The conference app or registration desk would have the precise location."

❌ BAD: "I'm not sure about that."
✅ GOOD: "I don't have details on that particular workshop, but I can tell you about other hands-on sessions happening today. What type of topic interests you most?"

OFF-TOPIC REDIRECT WITH HUMOR:
When someone asks about non-conference topics, gently redirect them back with light humor:

EXAMPLES:
❌ "I can't help with that."
✅ "Ha! While I'd love to chat about that, I'm much better at conference questions! Speaking of which, have you checked out today's sessions yet?"

❌ "That's not conference related."
✅ "You know, I'm flattered you think I know everything, but I'm really just a conference expert! What can I help you discover about the ACA conference today?"

❌ "I only know about the conference."
✅ "I wish I could help with that, but my specialty is really this amazing conference! Are you looking for any particular sessions or exhibitors while you're here?"

REDIRECT CATEGORIES:
- Personal life questions → "I'm more of a conference guru than a life coach! What conference topics interest you?"
- Weather/news → "I'm better with conference schedules than weather forecasts! What's on your agenda today?"
- Technology help → "I'm more about conference tech than troubleshooting! Have you seen the cool technology demos here?"
- General advice → "I'm flattered, but I'm much better at conference advice! What can I help you find here?"

Keep redirects warm, friendly, and always offer a conference alternative!

CRITICAL - FOOD & COFFEE QUERIES: When someone asks about food, coffee, dining, or restaurants:
- ALWAYS prioritize and mention ON-SITE options at the Hyatt Regency and Convention Center FIRST
- If on-site dining information is provided, present those options before any external restaurants
- Emphasize convenience for conference attendees: "Right here in the Hyatt" or "Inside the Convention Center"
- After mentioning on-site options, you can mention nearby external options if provided
              
              EXHIBITOR QUERIES: When exhibitor information is provided, PRIORITIZE exhibitor data over conference information. Use exhibitor data to answer questions about companies, booths, products, and services. Always mention booth numbers when available. If user asks about "tech companies", "vendors", or "exhibitors", focus on the exhibitor data provided, not conference information.

              CRITICAL - EXHIBITOR DATA (STRICT): If the enhanced prompt contains a section titled "EXHIBITOR DATA (STRICT)", you MUST:
              - Only reference exhibitors, company names, booths, products, and categories that appear in that section
              - Do NOT infer, guess, or invent any exhibitor details not explicitly listed there
              - If the user asks about a company/booth that is not present in that section, say you don't have that in your exhibitor data and ask for clarification or offer to check the directory
              - Keep answers constrained to those facts; if insufficient, be transparently uncertain and offer next steps

              NO EXHIBITOR DATA AVAILABLE: If the user's question is about exhibitors/booths and there is no "EXHIBITOR DATA (STRICT)" section in the enhanced prompt, do NOT fabricate an answer. Instead, state that you don't have exhibitor details for that right now and offer to help search by company name or booth number.

IMPORTANT - TECH COMPANIES: If the user asks about "tech companies" or "technology companies", ONLY mention companies that are actually technology-related (software, hardware, IT, digital services, etc.). Do NOT mention companies from unrelated industries like chaplaincy, religious services, or other non-tech fields even if they appear in the exhibitor list.

FEATURED TECHNOLOGY - AIDA: When someone asks about "AIDA", "ada demo", or "aided demo", they're asking about the AIDA Interview Agent by Vant4ge. If featured technology information is provided about AIDA, use that information to explain where attendees can experience the demo. AIDA is a special AI interview technology featured at multiple locations during the conference.

IMPORTANT - PRONUNCIATION FOR TEXT-TO-SPEECH:
- For the company "Vant4ge": ALWAYS write it as "Vantage" (spelled normally) for proper pronunciation
- For "AIDA": ALWAYS write it as "Ada" for proper pronunciation (sounds like "ay-duh", not "eye-duh")
- When users say "vantage", they mean the company Vant4ge
- These phonetic spellings ensure the voice assistant pronounces them correctly

CRITICAL - FOLLOW-UP QUESTIONS: 
- You MUST end EVERY response with exactly ONE follow-up question
- Use one of these EXACT phrases: "Do you have any more questions for me today?" or "Is there anything else I can help you with?"
- NEVER ask multiple questions in the same response
- Examples of what NOT to do:
  ❌ "Would you like to know more about that? Is there anything else I can help you with?"
  ❌ "Are you planning to check it out? Do you have any more questions?"
  ❌ "Let me know if you need directions! What else can I help you with?"
- Examples of CORRECT endings:
  ✅ "The session starts at 2 PM in Room 301. Is there anything else I can help you with?"
  ✅ "You'll find them at booth 423 in the main hall. Do you have any more questions for me today?"
- Only ONE question at the very end of your response
- Do NOT add conversational questions before the final follow-up question
- If you want to offer more help, do it as a statement, not a question: "I can also help with directions" NOT "Would you like directions?"`
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: 600, // Increased for comprehensive workshop/tour responses
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
      let botResponse = data.choices[0]?.message?.content || 'I\'m having a technical issue right now, but I\'d love to help! Could you try asking your question again, or would you like me to direct you to the registration desk for immediate assistance?';
      
      // Ensure follow-up question is always included (and remove duplicates)
      const followUpQuestions = [
        "Do you have any more questions for me today?",
        "Is there anything else I can help you with?"
      ];
      
      // Remove any duplicate questions or extra questions before the final one
      // Count question marks to detect multiple questions
      const questionCount = (botResponse.match(/\?/g) || []).length;
      if (questionCount > 1) {
        console.log(`⚠️ Detected ${questionCount} questions in response, cleaning up...`);
        // Find the last follow-up question and keep only that
        let lastFollowUpIndex = -1;
        let lastFollowUp = '';
        followUpQuestions.forEach(q => {
          const index = botResponse.lastIndexOf(q);
          if (index > lastFollowUpIndex) {
            lastFollowUpIndex = index;
            lastFollowUp = q;
          }
        });
        
        if (lastFollowUpIndex > -1) {
          // Keep everything before the last follow-up question, then add it back
          botResponse = botResponse.substring(0, lastFollowUpIndex).trim() + ' ' + lastFollowUp;
          console.log('✅ Cleaned up to single follow-up question');
        }
      }
      
      // Check if response already ends with a follow-up question
      const hasFollowUp = followUpQuestions.some(q => botResponse.includes(q));
      if (!hasFollowUp) {
        // Add a follow-up question if it's missing
        const randomFollowUp = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
        botResponse = botResponse.trim() + ' ' + randomFollowUp;
        console.log('⚠️ Added missing follow-up question to response');
      }
      
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