import { NextResponse } from "next/server";
import { AIRouterResponse, Strategy } from "@/types/ai-router.types";

export class ResponseUtils {
  static createErrorResponse(
    error: string,
    strategy: Strategy = "balanced",
    status: number = 400,
  ): NextResponse<AIRouterResponse> {
    return NextResponse.json(
      {
        error,
        logs: [],
        strategy,
      },
      { status },
    );
  }

  static createSuccessResponse(
    result: AIRouterResponse,
  ): NextResponse<AIRouterResponse> {
    const status = result.error ? 500 : 200;
    return NextResponse.json(result, { status });
  }
}
