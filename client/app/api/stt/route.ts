// app/api/stt/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key.' }, { status: 500 });
    }

    // Get the form data from the request
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const model = formData.get('model') as string || 'whisper-1';
    const language = formData.get('language') as string;
    const prompt = formData.get('prompt') as string;
    const responseFormat = formData.get('response_format') as string || 'json';
    const temperature = formData.get('temperature') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    console.log('🎤 STT Request:', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      model,
      language,
      responseFormat
    });

    // Create form data for OpenAI
    const openAiFormData = new FormData();
    openAiFormData.append('file', audioFile);
    openAiFormData.append('model', model);
    
    if (language) openAiFormData.append('language', language);
    if (prompt) openAiFormData.append('prompt', prompt);
    if (responseFormat) openAiFormData.append('response_format', responseFormat);
    if (temperature) openAiFormData.append('temperature', temperature);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openAiFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('🎤 OpenAI STT API error:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const result = await response.json();
    
    console.log('🎤 STT Success:', {
      textLength: result.text?.length || 0,
      text: result.text?.substring(0, 100) + '...'
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('🎤 STT API error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' }, 
      { status: 500 }
    );
  }
}