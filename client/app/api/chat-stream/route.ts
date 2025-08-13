import { NextRequest } from 'next/server';
import { envConfig } from '@/config/env.config';
import { PromptEnhancementService } from '@/services/prompt-enhancement.service';
import { LocationService } from '@/services/location.service';

export async function POST(req: NextRequest) {
  const { prompt, userName } = await req.json();
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid prompt' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create a TransformStream for server-sent events
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start streaming process
  (async () => {
    try {
      // Initialize services for prompt enhancement
      const locationService = new LocationService();
      const promptEnhancer = new PromptEnhancementService(locationService);
      
      // Enhance the prompt with actual conference data (with timeout protection)
      console.log('📊 [STREAMING] Enhancing prompt with conference data...');
      const enhanceStartTime = Date.now();
      
      let enhancedPrompt;
      try {
        // Add timeout protection to prevent long database queries from blocking audio
        const enhancePromise = promptEnhancer.createEnhancedPrompt(prompt);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 3000) // 3 second timeout
        );
        
        enhancedPrompt = await Promise.race([enhancePromise, timeoutPromise]);
        const enhanceTime = Date.now() - enhanceStartTime;
        console.log(`📊 [STREAMING] Enhanced prompt created successfully in ${enhanceTime}ms`);
      } catch (error) {
        console.warn(`📊 [STREAMING] Database enhancement failed after ${Date.now() - enhanceStartTime}ms, using basic prompt:`, error);
        // Fallback to basic prompt to prevent audio blocking
        enhancedPrompt = prompt;
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${envConfig.openai}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Harper, a warm and friendly AI assistant for the ACA conference. You're caring, approachable, helpful, and genuinely interested in making attendees feel welcome.${userName ? `\n\nThe user's name is ${userName}. Use it naturally where appropriate, but don't overuse it.` : ''}

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

CONVERSATION FLOW:
- For questions, provide helpful, direct answers
- For statements or comments, acknowledge warmly and offer help
- Keep responses conversational and friendly

CONTENT GUIDELINES:
- Use ONLY the real conference data provided in the enhanced prompt
- Never make up information about speakers, sessions, or logistics
- If specific information isn't available, say "I don't have that information - please check with conference organizers"
- Priority: Be helpful and accurate

RESPONSE FORMAT:
- Keep responses under 300 characters for voice optimization
- Use natural, conversational language
- End with a follow-up question when appropriate`
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: 70,
          temperature: 0.05,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let fullText = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                fullText += content;
                buffer += content;
                
                // Send chunks to client for TTS processing
                // Split on sentence boundaries
                const sentenceEnd = /[.!?]\s/;
                if (sentenceEnd.test(buffer)) {
                  const sentences = buffer.split(sentenceEnd);
                  for (let i = 0; i < sentences.length - 1; i++) {
                    const sentence = sentences[i].trim();
                    if (sentence) {
                      await writer.write(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'sentence', 
                        content: sentence + (buffer.match(sentenceEnd)?.[0]?.trim() || '.') 
                      })}\n\n`));
                    }
                  }
                  buffer = sentences[sentences.length - 1];
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
      
      // Send any remaining buffer
      if (buffer.trim()) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ 
          type: 'sentence', 
          content: buffer.trim() 
        })}\n\n`));
      }
      
      // Send completion event
      await writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'complete', 
        fullText 
      })}\n\n`));
      
    } catch (error) {
      console.error('Streaming error:', error);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}