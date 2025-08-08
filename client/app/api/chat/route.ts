import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '@/services/openai.service';

export interface ChatRequest {
  prompt: string;
  userName?: string;
  greetingAlreadyHandled?: boolean;
  sessionId?: string;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  responseTime: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  provider: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    const body: ChatRequest = await req.json();
    const { prompt, userName, greetingAlreadyHandled, sessionId } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required and must be a non-empty string',
        responseTime: 0,
        tokensUsed: { input: 0, output: 0, total: 0 },
        cost: 0,
        provider: 'none'
      }, { status: 400 });
    }

    if (prompt.length > 4000) {
      return NextResponse.json({
        success: false,
        error: 'Prompt exceeds maximum length of 4000 characters',
        responseTime: 0,
        tokensUsed: { input: 0, output: 0, total: 0 },
        cost: 0,
        provider: 'none'
      }, { status: 400 });
    }

    const openaiService = OpenAIService.getInstance();
    const result = await openaiService.sendMessage(prompt, { userName, greetingAlreadyHandled, sessionId });

    if (result.success) {
      return NextResponse.json({
        success: true,
        response: result.data,
        responseTime: result.responseTime,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        provider: 'openai'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to get response from OpenAI',
        responseTime: result.responseTime,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        provider: 'openai'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      responseTime: 0,
      tokensUsed: { input: 0, output: 0, total: 0 },
      cost: 0,
      provider: 'none'
    }, { status: 500 });
  }
}