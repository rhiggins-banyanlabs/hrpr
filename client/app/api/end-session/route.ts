import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/supabase/chatStorage';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.text();
    const { sessionId } = JSON.parse(body);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔚 API: Ending session via beacon:', sessionId);

    // End the session in the database
    const success = await ChatStorageService.endChatSession(sessionId);

    if (success) {
      console.log('✅ API: Session ended successfully:', sessionId);
      return NextResponse.json({ success: true });
    } else {
      console.error('❌ API: Failed to end session:', sessionId);
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ API: Error ending session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Support beacon requests which may come as GET with data in query params
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔚 API: Ending session via GET:', sessionId);

    // End the session in the database
    const success = await ChatStorageService.endChatSession(sessionId);

    if (success) {
      console.log('✅ API: Session ended successfully:', sessionId);
      return NextResponse.json({ success: true });
    } else {
      console.error('❌ API: Failed to end session:', sessionId);
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ API: Error ending session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}