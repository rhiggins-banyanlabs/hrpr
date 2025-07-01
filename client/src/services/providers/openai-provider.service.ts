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
      // 🔥 GET REAL CONFERENCE DATA
      console.log('📅 Fetching real conference data...');
      const { speakers, sessions } = await getCachedConferenceData();
      
      let conferenceContext = '';

      // Build speakers context
      if (speakers && speakers.length > 0) {
        console.log(`👥 Processing ${speakers.length} speakers`);
        const speakersInfo = speakers.map(speaker => {
          const name = speaker.name || 'Unknown Speaker';
          const title = speaker.title || '';
          const company = speaker.company || '';
          const bio = speaker.bio || '';
          
          let speakerLine = `- ${name}`;
          if (title) speakerLine += ` - ${title}`;
          if (company) speakerLine += ` at ${company}`;
          if (bio) speakerLine += ` | ${bio.substring(0, 100)}`;
          
          return speakerLine;
        }).join('\n');
        
        conferenceContext += `\n\nCONFERENCE SPEAKERS:\n${speakersInfo}`;
        console.log('👥 Added speakers context');
      }

      // Build sessions context
      if (sessions && sessions.length > 0) {
        console.log(`📅 Processing ${sessions.length} sessions`);
        
        // Sort sessions by time
        const sortedSessions = sessions.sort((a, b) => 
          new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        
        const sessionsInfo = sortedSessions.map(session => {
          const startTime = new Date(session.time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          // Note: EventSession only has 'time', not 'end_time'
          const endTime = startTime; // Use same time since we don't have end_time
          
          const title = session.title || 'Untitled Session';
          const location = session.location || '';
          const type = session.type || '';
          const description = session.description || '';
          
          let sessionLine = `- ${startTime}`;
          if (endTime !== startTime) sessionLine += ` - ${endTime}`;
          sessionLine += `: ${title}`;
          if (location) sessionLine += ` (${location})`;
          if (type) sessionLine += ` [${type}]`;
          if (description) sessionLine += ` - ${description.substring(0, 100)}`;
          
          return sessionLine;
        }).join('\n');
        
        conferenceContext += `\n\nCONFERENCE SCHEDULE:\n${sessionsInfo}`;
        console.log('📅 Added sessions context');
      }

      // If no real data available, provide guidance instead of fake data
      if ((!speakers || speakers.length === 0) && (!sessions || sessions.length === 0)) {
        console.log('⚠️ No conference data available - will inform user to check with organizers');
        conferenceContext = `\n\nIMPORTANT: Conference schedule and speaker information is currently being updated. Please check with conference organizers for the latest information about speakers, schedules, and session details.`;
      } else if (!speakers || speakers.length === 0) {
        conferenceContext += `\n\nNOTE: Speaker information is being updated. Please check with conference organizers for speaker details.`;
      } else if (!sessions || sessions.length === 0) {
        conferenceContext += `\n\nNOTE: Session schedule is being updated. Please check with conference organizers for the latest schedule.`;
      }

      console.log('🚀 Making OpenAI API call with real conference data...');
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
- Use ONLY the conference information provided below - never make up schedules, speakers, or locations
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

CURRENT CONFERENCE DATA:${conferenceContext}

Remember: Only use the information provided above. If you don't have specific details, acknowledge this and suggest the user check with conference organizers for the most up-to-date information.`
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
      const conferenceDataTokens = Math.ceil(conferenceContext.length / 4);
      const userPromptTokens = Math.ceil(prompt.length / 4);
      const inputTokens = systemPromptTokens + conferenceDataTokens + userPromptTokens;
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