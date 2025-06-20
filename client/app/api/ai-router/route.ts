import { NextRequest, NextResponse } from 'next/server';
import { AIRouterRequest, AIRouterResponse, Strategy } from '@/types/ai-router.types';
import { ValidationUtils } from '@/utils/validation.utils';
import { ResponseUtils } from '@/utils/response.utils';
import { AIRouterService } from '@/services/ai-router.service';

export async function POST(req: NextRequest): Promise<NextResponse<AIRouterResponse>> {
  try {
    const body: AIRouterRequest = await req.json();
    const { prompt, strategy = 'balanced' } = body;

    // Validate input
    const promptError = ValidationUtils.validatePrompt(prompt);
    if (promptError) {
      return ResponseUtils.createErrorResponse(promptError, strategy);
    }

    const strategyError = ValidationUtils.validateStrategy(strategy);
    if (strategyError) {
      return ResponseUtils.createErrorResponse(strategyError, strategy);
    }

    // Ensure strategy is valid type
    const validStrategy = ValidationUtils.isValidStrategy(strategy) ? strategy : 'balanced';

    // Route the request
    const aiRouter = new AIRouterService();
    const result = await aiRouter.routeRequest(prompt, validStrategy);

    return ResponseUtils.createSuccessResponse(result);
  } catch (error) {
    console.error('[AI Router] Unexpected error:', error);
    return ResponseUtils.createErrorResponse('Internal server error', 'balanced', 500);
  }
}