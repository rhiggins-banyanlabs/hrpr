import { NextRequest } from 'next/server';
import { envConfig } from '@/config/env.config';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  
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
      // Use prompt directly for now to avoid Supabase import delays
      const enhancedPrompt = prompt;
      
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
              content: `You are Harper, a helpful AI assistant for conference attendees. Use ONLY the real data provided.

RULES:
- Use ONLY provided conference information - never make up data
- CRITICAL CHARACTER LIMIT: Your ENTIRE response must be under 300 characters total. Count as you write. Use these strategies:
  • Use short words and phrases
  • Skip unnecessary words like "Here's" or "Let me tell you"
  • Use abbreviations (9AM not 9:00 AM, & not and)
  • Limit to 2-3 bullet points maximum
  • End responses naturally within the limit
- If no data available, say "Check with organizers"
- Priority: Be helpful but STAY UNDER 300 characters
- ALWAYS end your response with one of these specific follow-up questions: "Do you have any more questions for me today?" or "Is there anything else I can help you with?"

You help with: schedules, speakers, locations, and general conference questions.`
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