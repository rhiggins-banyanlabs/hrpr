// hooks/useVoiceChat.ts - Voice-only chat without UI components
import { useState, useRef, useCallback, useEffect } from 'react';
import { ChatStorageService } from '@/lib/supabase/chatStorage';
import { IntentDetectorService } from '@/services/intent-detector.service';
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

    let fillerAudioPromise: Promise<any> | null = null;
    
    try {
      // Get and play filler response immediately for better UX
      const fillerResponse = IntentDetectorService.getFillerResponse(text);
      if (fillerResponse && speakText) {
        console.log('🎤 Playing immediate filler response:', fillerResponse);
        // Keep track of the filler audio promise so we can wait for it later
        fillerAudioPromise = speakText(fillerResponse).catch(error => {
          console.log('⚠️ Filler response TTS failed, continuing without filler:', error);
          return null;
        });
      }

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

      // Generate TTS audio and save to database
      if (speakText) {
        console.log('🔊 Starting TTS generation...');
        setIsSpeaking(true);
        
        try {
          // Wait for filler response to complete if it's still playing
          if (fillerAudioPromise) {
            console.log('🔊 Waiting for filler response to complete...');
            const fillerResult = await fillerAudioPromise;
            
            // If filler has audio playing, wait for it to complete
            if (fillerResult && fillerResult.audio) {
              await new Promise<void>((resolve) => {
                const checkAudioComplete = () => {
                  if (fillerResult.audio.ended || fillerResult.audio.paused) {
                    console.log('🔊 Filler response completed');
                    resolve();
                  } else {
                    // Check again in 100ms
                    setTimeout(checkAudioComplete, 100);
                  }
                };
                
                // Start checking immediately
                checkAudioComplete();
                
                // Fallback timeout after 5 seconds
                setTimeout(() => {
                  console.log('🔊 Filler response timeout - continuing');
                  resolve();
                }, 5000);
              });
              
              // Add small pause between filler and main response
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
          
          // Now play the main AI response
          await speakText(aiResponse.response);
          console.log('🔊 Speech completed');
        } catch (voiceError) {
          console.error('🔊 Voice error:', voiceError);
        } finally {
          setIsSpeaking(false);
        }
      }

      // Save Harper's response to database
      try {
        const savedMessage = await ChatStorageService.saveMessage(
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
        );
        console.log('💾 Harper message saved:', savedMessage?.id);
      } catch (dbError) {
        console.error('❌ Failed to save Harper message to database:', dbError);
        console.log('⚠️ Continuing despite database error');
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