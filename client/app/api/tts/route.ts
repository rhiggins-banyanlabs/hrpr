// app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Remove edge runtime as it's causing compatibility issues
// export const runtime = 'edge';

// Simple in-memory cache for TTS responses
const ttsCache = new Map<string, { data: ArrayBuffer; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const { 
      text, 
      voice = 'nova', 
      model = 'tts-1', // Use fastest model 
      response_format = 'mp3',
      speed = 1.0 // Normal speech speed
    } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key.' }, { status: 500 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
    }

    // Validate voice type
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      return NextResponse.json({ 
        error: `Invalid voice. Must be one of: ${validVoices.join(', ')}` 
      }, { status: 400 });
    }

    // Validate speed
    if (speed < 0.25 || speed > 4.0) {
      return NextResponse.json({ 
        error: 'Speed must be between 0.25 and 4.0' 
      }, { status: 400 });
    }

    console.log('🔊 TTS Request:', {
      textLength: text.length,
      voice,
      model,
      response_format,
      speed,
      textPreview: text.substring(0, 50) + '...'
    });

    // Create cache key
    const cacheKey = `${text}-${voice}-${model}-${speed}`;
    
    // Check cache first
    const cached = ttsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('🚀 TTS Cache hit - returning cached audio');
      return new NextResponse(cached.data, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': 'inline; filename="speech.mp3"',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout for TTS
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format,
        speed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔊 OpenAI TTS API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json({ 
        error: `OpenAI TTS API error: ${response.status} ${response.statusText}`,
        details: errorText 
      }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Cache the response
    ttsCache.set(cacheKey, {
      data: audioBuffer,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries (keep cache size manageable)
    if (ttsCache.size > 100) {
      const entries = Array.from(ttsCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, 20); // Delete oldest 20 entries
      toDelete.forEach(([key]) => ttsCache.delete(key));
    }
    
    console.log('🔊 TTS Success:', {
      voice,
      audioSize: audioBuffer.byteLength,
      format: response_format,
      cached: true
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"',
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('🔊 TTS API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}