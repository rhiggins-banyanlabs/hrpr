// hooks/useChatStorage.ts - FIXED VERSION with proper session management
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatStorageService, ChatSession, supabase } from '@/lib/supabase/chatStorage';

export const useChatStorage = () => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const hasCleanedUpRef = useRef(false);
  const isCreatingSessionRef = useRef(false); // Prevent concurrent session creation

  // Initialize a new chat session - FIXED to prevent duplicates
  const startNewSession = useCallback(async (metadata?: Record<string, any>) => {
    console.log('🆕 Starting new chat session...');
    console.log('🆕 Current session before:', currentSession?.id);
    console.log('🆕 Is creating session:', isCreatingSessionRef.current);
    console.log('🆕 Is session active:', isSessionActive);
    
    // Prevent concurrent session creation
    if (isCreatingSessionRef.current) {
      console.log('⏸️ Session creation already in progress, skipping');
      return currentSession;
    }

    // If we already have an active session, return it instead of creating new one
    if (currentSession?.id && isSessionActive) {
      console.log('♻️ Using existing active session:', currentSession.id);
      return currentSession;
    }

    // ADDITIONAL CHECK: If we have a session but it's not marked as active in state,
    // check if it's actually active in the database
    if (currentSession?.id && !isSessionActive) {
      console.log('🔍 Checking if current session is actually active...');
      try {
        const { data: sessionCheck, error } = await supabase
          .from('chat_sessions')
          .select('is_active')
          .eq('id', currentSession.id)
          .single();
          
        if (!error && sessionCheck?.is_active) {
          console.log('♻️ Current session is active in database, reusing it');
          setIsSessionActive(true);
          return currentSession;
        }
      } catch (error) {
        console.log('⚠️ Error checking session status, proceeding with new session');
      }
    }

    isCreatingSessionRef.current = true;

    try {
      // End previous session if exists and is different
      if (currentSession?.id && currentSession.is_active) {
        console.log('🔚 Ending previous session:', currentSession.id);
        await ChatStorageService.endChatSession(currentSession.id);
      }

      console.log('📞 Creating new session with metadata:', metadata);
      const session = await ChatStorageService.createChatSession(metadata);
      
      if (session) {
        setCurrentSession(session);
        setIsSessionActive(true);
        hasCleanedUpRef.current = false;
        console.log('✅ New chat session created:', session.id);
        return session;
      } else {
        console.error('❌ Failed to create session');
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating session:', error);
      return null;
    } finally {
      isCreatingSessionRef.current = false;
    }
  }, [currentSession, isSessionActive]);

  // Save a message to the current session
  const saveMessage = useCallback(async (
    sender: 'user' | 'connie',
    messageText: string,
    options?: {
      isVoiceInput?: boolean;
      voiceTranscript?: string;
      selectedVoice?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    if (!currentSession?.id) {
      console.error('❌ No active session to save message');
      return null;
    }

    const message = await ChatStorageService.saveMessage(
      currentSession.id,
      sender,
      messageText,
      options
    );

    console.log(`💾 Message saved (${sender}):`, message?.id);
    return message;
  }, [currentSession]);

  // End the current session
  const endSession = useCallback(async () => {
    if (!currentSession?.id || hasCleanedUpRef.current) {
      console.log('⏸️ No session to end or already cleaned up');
      return;
    }

    hasCleanedUpRef.current = true;
    console.log('🔚 Ending session:', currentSession.id);
    
    const success = await ChatStorageService.endChatSession(currentSession.id);
    if (success) {
      setIsSessionActive(false);
      console.log('✅ Chat session ended:', currentSession.id);
    }
  }, [currentSession]);

  // Log an analytics event
  const logEvent = useCallback(async (
    eventType: string,
    eventData?: Record<string, any>
  ) => {
    if (!currentSession?.id) {
      console.log('⏸️ No session for logging event:', eventType);
      return;
    }

    await ChatStorageService.logAnalyticsEvent(
      currentSession.id,
      eventType,
      eventData
    );
    console.log('📊 Event logged:', eventType);
  }, [currentSession]);

  // Load existing session from ID - FIXED to prevent creating new sessions
  const loadSession = useCallback(async (sessionId: string) => {
    console.log('📂 Loading session:', sessionId);
    
    try {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('❌ Error loading session:', error);
        return null;
      }

      if (session) {
        setCurrentSession(session);
        setIsSessionActive(session.is_active);
        hasCleanedUpRef.current = false;
        isCreatingSessionRef.current = false; // Reset creation flag
        console.log('✅ Session loaded:', session.id, 'Active:', session.is_active);
        return session;
      } else {
        console.log('❌ No session found with ID:', sessionId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading session:', error);
      return null;
    }
  }, []);

  // Cleanup only on actual unmount
  useEffect(() => {
    return () => {
      if (isSessionActive && currentSession?.id && !hasCleanedUpRef.current) {
        hasCleanedUpRef.current = true;
        ChatStorageService.endChatSession(currentSession.id).catch(console.error);
        console.log('🧹 Cleanup: Session ended on unmount');
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  return {
    currentSession,
    isSessionActive,
    startNewSession,
    saveMessage,
    endSession,
    logEvent,
    loadSession
  };
};