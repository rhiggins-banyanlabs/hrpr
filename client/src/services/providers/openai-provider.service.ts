import { BaseProviderService } from "./base-provider.service";
import { ProviderResponse } from "@/types/ai-router.types";
import { PROVIDER_COSTS, MODELS } from "@/config/ai-providers.config";
import { envConfig } from "@/config/env.config";
import { ConferenceStorageService } from '@/lib/supabase/chatStorage';

// 🔥 CONFERENCE DATA CACHING SYSTEM
let conferenceCache: { 
  speakers: any[] | null; 
  sessions: any[] | null; 
  timestamp: number 
} = { speakers: null, sessions: null, timestamp: 0 };

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedConferenceData() {
  const now = Date.now();
  
  // Return cached data if it's fresh
  if (conferenceCache.speakers && conferenceCache.sessions && 
      (now - conferenceCache.timestamp) < CACHE_DURATION) {
    console.log('✅ Using cached conference data');
    return {
      speakers: conferenceCache.speakers,
      sessions: conferenceCache.sessions
    };
  }
  
  // Try to fetch fresh data from Supabase
  console.log('🔄 Fetching fresh conference data from Supabase...');
  try {
    // Fetch speakers and sessions using ConferenceStorageService
    const [speakers, sessions] = await Promise.all([
      ConferenceStorageService.getAllSpeakers(),
      ConferenceStorageService.getAllSessions()
    ]);

    console.log(`📊 Fetched ${speakers?.length || 0} speakers and ${sessions?.length || 0} sessions`);

    // Cache the results
    conferenceCache = {
      speakers: speakers || [],
      sessions: sessions || [],
      timestamp: now
    };

    return {
      speakers: speakers || [],
      sessions: sessions || []
    };
    
  } catch (error) {
    console.error('❌ Error fetching conference data:', error);
    
    // Return cached data if available, otherwise empty arrays
    return {
      speakers: conferenceCache.speakers || [],
      sessions: conferenceCache.sessions || []
    };
  }
}

export class OpenAIProviderService extends BaseProviderService {
  constructor() {
    super("openai", PROVIDER_COSTS.openai);
  }

  async makeRequest(prompt: string): Promise<ProviderResponse> {
    console.log('🚀 OpenAI Provider makeRequest called with prompt:', prompt.substring(0, 50) + '...');
    
    try {
      // Use the enhanced prompt from AI Router (which already contains conference data)
      // The AI Router handles all conference data fetching and enhancement
      console.log('🚀 Making OpenAI API call with AI Router enhanced prompt...');
      const apiStartTime = performance.now();
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${envConfig.openai}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODELS.openai,
          messages: [
            {
              role: "system",
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
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 300, // Keep response concise
          temperature: 0.7,
          stream: false
        }),
      });

      const apiEndTime = performance.now();
      console.log(`⏱️ OpenAI API Response Time: ${Math.round(apiEndTime - apiStartTime)}ms`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ OpenAI API error:', errorData);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const botResponse = data.choices[0]?.message?.content || 'I apologize, but I\'m having trouble generating a response right now.';

      // Cap response to 800 characters for faster processing
      const cappedResponse = botResponse.slice(0, 800);

      console.log('✅ OpenAI response received:', cappedResponse.substring(0, 50) + '...');

      // Estimate token usage for cost calculation
      const systemPromptTokens = Math.ceil(1000 / 4); // Rough estimate for system prompt
      const userPromptTokens = Math.ceil(prompt.length / 4);
      const inputTokens = systemPromptTokens + userPromptTokens;
      const outputTokens = Math.ceil(cappedResponse.length / 4);

      console.log(`📊 Token usage: ${inputTokens} input + ${outputTokens} output = ${inputTokens + outputTokens} total`);

      return {
        success: true,
        data: cappedResponse,
        inputTokens,
        outputTokens,
      };

    } catch (error) {
      console.error('❌ OpenAI provider error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Add method to get current data status (useful for debugging)
  getCurrentDataStatus() {
    const now = Date.now();
    const isStale = (now - conferenceCache.timestamp) > CACHE_DURATION;
    
    return {
      speakers: conferenceCache.speakers?.length || 0,
      sessions: conferenceCache.sessions?.length || 0,
      lastFetch: new Date(conferenceCache.timestamp).toISOString(),
      cacheAge: now - conferenceCache.timestamp,
      isStale,
      hasCachedData: !!(conferenceCache.speakers || conferenceCache.sessions)
    };
  }

  // Force refresh of conference data
  async refreshConferenceData(): Promise<void> {
    console.log('🔄 Forcing refresh of conference data...');
    conferenceCache.timestamp = 0; // Force cache miss
    await getCachedConferenceData();
    console.log('✅ Conference data refreshed in OpenAI provider');
  }
}