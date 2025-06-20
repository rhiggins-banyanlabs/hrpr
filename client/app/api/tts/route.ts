// app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { 
      text, 
      voice = 'shimmer', 
      model = 'tts-1-hd',
      response_format = 'mp3',
      speed = 1.0
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

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format,
        speed,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('🔊 OpenAI TTS API error:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    
    console.log('🔊 TTS Success:', {
      voice,
      audioSize: audioBuffer.byteLength,
      format: response_format
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
      { error: 'Failed to generate speech' }, 
      { status: 500 }
    );
  }
}