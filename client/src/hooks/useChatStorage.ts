// hooks/useChatStorage.ts - FIXED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatStorageService, ChatSession, supabase } from '@/lib/supabase/chatStorage';

export const useChatStorage = () => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const hasCleanedUpRef = useRef(false);

  // Initialize a new chat session
  const startNewSession = useCallback(async (metadata?: Record<string, any>) => {
    console.log('🆕 Starting new chat session...');
    
    // End previous session if exists and is different
    if (currentSession?.id && currentSession.is_active) {
      await ChatStorageService.endChatSession(currentSession.id);
    }

    const session = await ChatStorageService.createChatSession(metadata);
    if (session) {
      setCurrentSession(session);
      setIsSessionActive(true);
      hasCleanedUpRef.current = false; // Reset cleanup flag
      console.log('✅ Chat session created:', session.id);
    }
    return session;
  }, [currentSession]);

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
    if (!currentSession?.id || hasCleanedUpRef.current) return;

    hasCleanedUpRef.current = true; // Prevent duplicate cleanup
    const success = await ChatStorageService.endChatSession(currentSession.id);
    if (success) {
      setIsSessionActive(false);
      console.log('🔚 Chat session ended:', currentSession.id);
    }
  }, [currentSession]);

  // Log an analytics event
  const logEvent = useCallback(async (
    eventType: string,
    eventData?: Record<string, any>
  ) => {
    if (!currentSession?.id) return;

    await ChatStorageService.logAnalyticsEvent(
      currentSession.id,
      eventType,
      eventData
    );
  }, [currentSession]);

  // Load existing session from ID
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      if (session) {
        setCurrentSession(session);
        setIsSessionActive(session.is_active);
        hasCleanedUpRef.current = false;
        console.log('📂 Session loaded:', session.id);
      }
      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }, []);

  // IMPORTANT: Only cleanup on actual unmount, not on every render
  useEffect(() => {
    return () => {
      // This cleanup only runs when the component using this hook unmounts
      if (isSessionActive && currentSession?.id && !hasCleanedUpRef.current) {
        hasCleanedUpRef.current = true;
        // Note: We can't use async in cleanup, so we just call it
        ChatStorageService.endChatSession(currentSession.id).catch(console.error);
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