// hooks/useVoiceChat.ts - Voice-only chat without UI components
import { useState, useRef, useCallback, useEffect } from 'react';
import { ChatStorageService } from '@/lib/supabase/chatStorage';
// import { StreamingTTSService } from '@/services/streaming-tts.service'; // Removed for performance

interface UseVoiceChatProps {
  sessionId: string | null;
  speakText?: (text: string) => Promise<any>;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export const useVoiceChat = ({ 
  sessionId,
  speakText,
  onSpeakingChange
}: UseVoiceChatProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryTimeRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // const streamingTTSRef = useRef(new StreamingTTSService()); // Removed for performance

  console.log('🎤 useVoiceChat - sessionId:', sessionId);

  // Notify parent of speaking state changes
  useEffect(() => {
    if (onSpeakingChange) {
      onSpeakingChange(isSpeaking);
    }
  }, [isSpeaking, onSpeakingChange]);

  // Categorize questions for analytics
  const categorizeQuestion = (question: string): string => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('speaker') || lowerQ.includes('presenter') || lowerQ.includes('who is')) return 'speakers';
    if (lowerQ.includes('time') || lowerQ.includes('when') || lowerQ.includes('schedule')) return 'schedule';
    if (lowerQ.includes('location') || lowerQ.includes('where') || lowerQ.includes('room')) return 'location';
    if (lowerQ.includes('food') || lowerQ.includes('lunch') || lowerQ.includes('eat')) return 'food';
    if (lowerQ.includes('networking') || lowerQ.includes('break')) return 'networking';
    if (lowerQ.includes('wifi') || lowerQ.includes('internet') || lowerQ.includes('password')) return 'technical';
    if (lowerQ.includes('register') || lowerQ.includes('sign up') || lowerQ.includes('ticket')) return 'registration';
    if (lowerQ.includes('parking') || lowerQ.includes('hotel') || lowerQ.includes('transport')) return 'logistics';
    
    return 'general';
  };

  // Process voice input and get response
  const processVoiceQuery = useCallback(async (text: string, overrideSessionId?: string): Promise<void> => {
    const activeSessionId = overrideSessionId || sessionId;
    console.log('🎤 ===== PROCESS VOICE QUERY STARTED =====');
    console.log('🎤 Query text:', text);
    console.log('🎤 Session ID:', activeSessionId);
    
    // Debounce: prevent rapid successive calls
    const now = Date.now();
    if (now - lastQueryTimeRef.current < 1000) { // 1 second debounce
      console.log('⏹️ Skipping - debounced (too soon after last query)');
      return;
    }
    
    if (isProcessingRef.current || !text.trim() || !activeSessionId) {
      console.log('⏹️ Skipping - already processing, empty text, or no session');
      return;
    }
    
    lastQueryTimeRef.current = now;

    // Check if this is just a greeting without a question
    const isJustGreeting = /^(hey|hi|hello)?\s*(harper|conny|coni|koni|honey)\s*$/i.test(text.trim());
    if (isJustGreeting) {
      console.log('👋 Just a greeting detected, not processing as a question');
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // Log analytics event
      try {
        await ChatStorageService.logAnalyticsEvent(activeSessionId, 'user_question', {
          question: text.trim(),
          category: categorizeQuestion(text),
          timestamp: new Date().toISOString()
        });
      } catch (analyticsError) {
        console.error('❌ Failed to log analytics event:', analyticsError);
      }

      // Save user message to database
      let savedUserMessage = null;
      try {
        savedUserMessage = await ChatStorageService.saveMessage(
          activeSessionId,
          'user',
          text.trim(),
          {
            metadata: { source: 'voice' }
          }
        );
        console.log('💾 User message saved:', savedUserMessage?.id);
      } catch (dbError) {
        console.error('❌ Failed to save user message to database:', dbError);
        console.log('⚠️ Continuing with AI processing despite database error');
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Get AI response from API route
      console.log('🤖 Getting AI response...');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: text
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiResponse = await response.json();
      
      if (!aiResponse.success || !aiResponse.response) {
        throw new Error(aiResponse.error || 'No response from AI');
      }

      console.log('🤖 AI Response received:', aiResponse.response.substring(0, 50) + '...');

      // Run database save and TTS generation in parallel for better performance
      const parallelTasks = [];

      // Task 1: Save Harper's response to database
      parallelTasks.push(
        ChatStorageService.saveMessage(
          activeSessionId,
          'Harper',
          aiResponse.response,
          {
            metadata: { 
              isVoiceResponse: true,
              processingTime: aiResponse.responseTime,
              tokensUsed: aiResponse.tokensUsed,
              cost: aiResponse.cost
            }
          }
        ).then(savedMessage => {
          console.log('💾 Harper message saved:', savedMessage?.id);
          return savedMessage;
        }).catch(dbError => {
          console.error('❌ Failed to save Harper message to database:', dbError);
          console.log('⚠️ Continuing with voice synthesis despite database error');
          return null;
        })
      );

      // Task 2: Generate TTS audio (single call is faster than streaming)
      if (speakText) {
        console.log('🔊 Starting TTS generation...');
        setIsSpeaking(true);
        
        parallelTasks.push(
          speakText(aiResponse.response).then(() => {
            console.log('🔊 Speech completed');
            return true;
          }).catch(voiceError => {
            console.error('🔊 Voice error:', voiceError);
            return false;
          }).finally(() => {
            setIsSpeaking(false);
          })
        );
      }

      // Wait for both tasks to complete in parallel
      try {
        await Promise.all(parallelTasks);
        console.log('✅ All parallel tasks completed');
      } catch (error) {
        console.error('❌ Error in parallel task execution:', error);
      }

    } catch (error) {
      console.error('❌ Error processing voice query:', error);
      
      // Speak error message if possible
      if (speakText && error instanceof Error && error.name !== 'AbortError') {
        const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
        setIsSpeaking(true);
        try {
          await speakText(errorMessage);
        } catch (voiceError) {
          console.error('🔊 Voice error while speaking error message:', voiceError);
        } finally {
          setIsSpeaking(false);
        }

        // Save error message to database
        await ChatStorageService.saveMessage(
          activeSessionId,
          'Harper',
          errorMessage,
          {
            metadata: { isError: true }
          }
        );
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [sessionId, speakText]);

  // Send intro message
  const sendIntroMessage = useCallback(async (overrideSessionId?: string) => {
    const activeSessionId = overrideSessionId || sessionId;
    console.log('🎯 sendIntroMessage called with:', { sessionId: activeSessionId, speakText: !!speakText });
    
    if (!activeSessionId || !speakText) {
      console.log('❌ No session ID or speakText for intro message');
      return;
    }

    const introMessage = "Hi! I'm Harper, your conference assistant. How can I help you today?";

    try {
      console.log('🎯 Sending intro message for session:', activeSessionId);
      
      // Save intro message to database
      console.log('💾 Saving intro message to database...');
      try {
        await ChatStorageService.saveMessage(
          activeSessionId,
          'Harper',
          introMessage,
          {
            metadata: { isIntroMessage: true }
          }
        );
        console.log('✅ Intro message saved to database');
      } catch (dbError) {
        console.error('❌ Failed to save intro message to database:', dbError);
        console.log('⚠️ Continuing with voice synthesis despite database error');
      }
      
      // Speak the intro
      console.log('🔊 Starting speech synthesis...');
      setIsSpeaking(true);
      await speakText(introMessage);
      setIsSpeaking(false);
      
      console.log('🎯 Intro message sent and spoken - ready for user input');
    } catch (error) {
      console.error('❌ Error sending intro message:', error);
      setIsSpeaking(false);
    }
  }, [sessionId, speakText]);

  return {
    processVoiceQuery,
    sendIntroMessage,
    isProcessing,
    isSpeaking
  };
};