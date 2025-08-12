import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert File to a format OpenAI accepts
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Determine file extension based on MIME type
    const mimeType = audioFile.type || 'audio/webm';
    const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `audio.${fileExtension}`;
    
    // Create a File object that OpenAI's SDK expects
    const file = new File([buffer], fileName, { type: mimeType });
    
    console.log(`🎤 Transcribing audio - Type: ${mimeType}, Name: ${fileName}, Size: ${buffer.length} bytes`);

    // Use Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'json',
    });

    console.log('🎤 Whisper transcription:', transcription.text);

    return NextResponse.json({ 
      text: transcription.text,
      success: true 
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error.message },
      { status: 500 }
    );
  }
}