// utils/response.utils.ts - ENHANCED WITH CACHING SUPPORT
import { NextResponse } from "next/server";
import { AIRouterResponse, Strategy } from "@/types/ai-router.types";

export class ResponseUtils {
  static createErrorResponse(
    error: string,
    strategy: Strategy = "balanced",
    status: number = 400,
  ): NextResponse<AIRouterResponse> {
    const response = NextResponse.json(
      {
        error,
        logs: [],
        strategy,
        responseTime: 0, // Error responses are immediate
      },
      { status },
    );

    // Add error tracking headers
    response.headers.set('X-Error-Type', status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');
    response.headers.set('X-Response-Time', '0ms');
    
    return response;
  }

  static createSuccessResponse(
    result: AIRouterResponse,
  ): NextResponse<AIRouterResponse> {
    const status = result.error ? 500 : 200;
    
    const response = NextResponse.json(result, { status });

    // Add performance and caching headers for monitoring
    if (result.responseTime) {
      response.headers.set('X-Response-Time', `${result.responseTime}ms`);
    }
    
    if (result.provider) {
      response.headers.set('X-Provider', result.provider);
    }
    
    if (result.cached) {
      response.headers.set('X-Cache-Status', 'HIT');
      response.headers.set('X-Cache-Type', result.instantResponse ? 'instant' : 'response');
      
      if (result.cacheAge) {
        response.headers.set('X-Cache-Age', `${result.cacheAge}s`);
      }
    } else {
      response.headers.set('X-Cache-Status', 'MISS');
    }
    
    if (result.cost !== undefined) {
      response.headers.set('X-Cost', result.cost.toFixed(6));
    }
    
    if (result.tokensUsed) {
      response.headers.set('X-Tokens-Used', result.tokensUsed.total.toString());
    }

    // Add optimization info
    if (result.optimizations && result.optimizations.length > 0) {
      response.headers.set('X-Optimizations', result.optimizations.join(','));
    }

    return response;
  }

  /**
   * NEW: Create response for instant answers with special headers
   */
  static createInstantResponse(
    response: string,
    responseTime: number,
    strategy: Strategy = "balanced"
  ): NextResponse<AIRouterResponse> {
    const result: AIRouterResponse = {
      provider: 'instant-cache',
      response,
      logs: [],
      strategy,
      cost: 0,
      tokensUsed: {
        input: 0,
        output: 0,
        total: 0,
      },
      cached: true,
      instantResponse: true,
      responseTime,
      optimizations: ['instant-response']
    };

    const nextResponse = NextResponse.json(result, { status: 200 });
    
    // Special headers for instant responses
    nextResponse.headers.set('X-Response-Time', `${responseTime}ms`);
    nextResponse.headers.set('X-Provider', 'instant-cache');
    nextResponse.headers.set('X-Cache-Status', 'INSTANT');
    nextResponse.headers.set('X-Cache-Type', 'keyword-match');
    nextResponse.headers.set('X-Cost', '0');
    nextResponse.headers.set('X-Optimizations', 'instant-response');
    
    return nextResponse;
  }

  /**
   * NEW: Create response for cached answers with cache metadata
   */
  static createCachedResponse(
    cachedData: {
      response: string;
      provider: string;
      cost: number;
      tokensUsed: { input: number; output: number; total: number };
      cacheAge: number;
    },
    responseTime: number,
    strategy: Strategy
  ): NextResponse<AIRouterResponse> {
    const result: AIRouterResponse = {
      provider: `${cachedData.provider}-cached`,
      response: cachedData.response,
      logs: [],
      strategy,
      cost: cachedData.cost,
      tokensUsed: cachedData.tokensUsed,
      cached: true,
      cacheHit: true,
      cacheAge: cachedData.cacheAge,
      responseTime,
      optimizations: ['response-cache']
    };

    const nextResponse = NextResponse.json(result, { status: 200 });
    
    // Cache-specific headers
    nextResponse.headers.set('X-Response-Time', `${responseTime}ms`);
    nextResponse.headers.set('X-Provider', result.provider);
    nextResponse.headers.set('X-Cache-Status', 'HIT');
    nextResponse.headers.set('X-Cache-Type', 'response');
    nextResponse.headers.set('X-Cache-Age', `${cachedData.cacheAge}s`);
    nextResponse.headers.set('X-Cost', cachedData.cost.toFixed(6));
    nextResponse.headers.set('X-Tokens-Used', cachedData.tokensUsed.total.toString());
    nextResponse.headers.set('X-Optimizations', 'response-cache');
    
    return nextResponse;
  }

  /**
   * NEW: Add CORS headers for development/monitoring tools
   */
  static addCorsHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Expose-Headers', 'X-Response-Time, X-Provider, X-Cache-Status, X-Cost');
    
    return response;
  }

  /**
   * NEW: Create rate limit response
   */
  static createRateLimitResponse(
    strategy: Strategy,
    retryAfter: number = 60
  ): NextResponse<AIRouterResponse> {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again in a moment.',
        logs: [],
        strategy,
        responseTime: 0,
      },
      { status: 429 }
    );

    response.headers.set('Retry-After', retryAfter.toString());
    response.headers.set('X-Error-Type', 'RATE_LIMIT_EXCEEDED');
    response.headers.set('X-Response-Time', '0ms');
    
    return response;
  }

  /**
   * NEW: Create timeout response
   */
  static createTimeoutResponse(
    strategy: Strategy,
    timeoutDuration: number
  ): NextResponse<AIRouterResponse> {
    const response = NextResponse.json(
      {
        error: `Request timed out after ${timeoutDuration}ms. Please try again.`,
        logs: [],
        strategy,
        responseTime: timeoutDuration,
      },
      { status: 408 }
    );

    response.headers.set('X-Error-Type', 'REQUEST_TIMEOUT');
    response.headers.set('X-Response-Time', `${timeoutDuration}ms`);
    
    return response;
  }

  /**
   * NEW: Create maintenance mode response
   */
  static createMaintenanceResponse(
    strategy: Strategy = "balanced"
  ): NextResponse<AIRouterResponse> {
    const response = NextResponse.json(
      {
        error: 'AI Router is temporarily under maintenance. Please try again shortly.',
        logs: [],
        strategy,
        responseTime: 0,
      },
      { status: 503 }
    );

    response.headers.set('X-Error-Type', 'MAINTENANCE_MODE');
    response.headers.set('Retry-After', '300'); // 5 minutes
    
    return response;
  }

  /**
   * NEW: Log response for monitoring/analytics
   */
  static logResponse(result: AIRouterResponse): void {
    const logData = {
      provider: result.provider,
      strategy: result.strategy,
      responseTime: result.responseTime,
      cached: result.cached,
      cost: result.cost,
      tokensUsed: result.tokensUsed?.total,
      error: !!result.error,
      timestamp: new Date().toISOString()
    };

    // In production, you might want to send this to your analytics service
    console.log('📊 Response Analytics:', JSON.stringify(logData));
  }
}