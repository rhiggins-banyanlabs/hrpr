// hooks/useVoiceChat.ts - Voice-only chat without UI components
import { useState, useRef, useCallback, useEffect } from 'react';
import { ChatStorageService } from '@/lib/supabase/chatStorage';
import { IntentDetectorService } from '@/services/intent-detector.service';
import { feedbackStateMachine, FeedbackStateMachine } from '@/services/feedback-state-machine.service';
import { feedbackStorage } from '@/services/feedback-storage.service';
import { createSilenceDetector, SilenceDetectionService } from '@/services/silence-detection.service';
import { FeedbackState } from '@/types/feedback.types';
// import { StreamingTTSService } from '@/services/streaming-tts.service'; // Removed for performance

interface UseVoiceChatProps {
  sessionId: string | null;
  speakText?: (text: string) => Promise<any>;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onSessionReset?: () => void;
}

export const useVoiceChat = ({ 
  sessionId,
  speakText,
  onSpeakingChange,
  onSessionReset
}: UseVoiceChatProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(FeedbackState.IDLE);
  
  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryTimeRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceDetectorRef = useRef<SilenceDetectionService | null>(null);
  const conversationCountRef = useRef(0);
  const feedbackTextRef = useRef<string>('');
  const isInFeedbackFlowRef = useRef(false);
  const userSatisfactionRef = useRef<boolean | null>(null); // Track user satisfaction
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

  // Stop silence detection
  const stopSilenceDetection = useCallback(() => {
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.stop();
      silenceDetectorRef.current = null;
    }
  }, []);

  // Save feedback and reset session
  const saveFeedbackAndReset = useCallback(async () => {
    if (!sessionId) return;

    // Determine satisfaction based on user's actual response
    // If user satisfaction is null, it means they didn't go through the satisfaction flow
    // (e.g., timeout scenario), so default to true (satisfied)
    const satisfied = userSatisfactionRef.current !== null ? userSatisfactionRef.current : true;

    console.log('💾 Saving feedback and resetting session...', { 
      satisfied, 
      feedbackText: feedbackTextRef.current,
      userSatisfactionRef: userSatisfactionRef.current,
      conversationCount: conversationCountRef.current
    });

    // Save feedback
    try {
      await feedbackStorage.saveFeedback({
        sessionId,
        satisfied,
        feedbackText: feedbackTextRef.current || undefined,
        conversationCount: conversationCountRef.current
      });
      console.log('✅ Feedback saved successfully');
    } catch (error) {
      console.error('❌ Error saving feedback:', error);
    }

    // Reset for next user
    conversationCountRef.current = 0;
    feedbackTextRef.current = '';
    isInFeedbackFlowRef.current = false;
    userSatisfactionRef.current = null; // Reset satisfaction tracking
    
    // Stop any ongoing silence detection
    stopSilenceDetection();
    
    // Reset the feedback state machine
    feedbackStateMachine.reset();
    console.log('🔄 Feedback state machine reset to IDLE');
    
    // Reset the session to initial state  
    if (onSessionReset) {
      setTimeout(() => {
        console.log('🔄 Calling session reset callback...');
        onSessionReset();
      }, 1000); // Reduced delay - reset immediately after feedback save
    }
  }, [sessionId, onSessionReset, stopSilenceDetection]);

  // Start silence detection with given timeout
  const startSilenceDetection = useCallback((timeout: number, customCallback?: () => void) => {
    stopSilenceDetection();
    
    silenceDetectorRef.current = createSilenceDetector(
      timeout,
      customCallback || (() => {
        // Default silence detected behavior - trigger appropriate transition
        const currentState = feedbackStateMachine.getCurrentState();
        console.log(`🔇 Silence timeout triggered in state: ${currentState}`);
        
        if (currentState === FeedbackState.WAITING_FOR_SILENCE) {
          feedbackStateMachine.transition('silence');
        } else if (currentState === FeedbackState.ASKING_MORE_QUESTIONS) {
          console.log('⏰ More questions timeout - user didn\'t respond, assuming done');
          // Don't set satisfaction here - let it remain null for timeout scenario
          feedbackStateMachine.transition('timeout');
        } else if (currentState === FeedbackState.ASKING_SATISFACTION) {
          console.log('⏰ Satisfaction timeout - user didn\'t respond, assuming satisfied');
          userSatisfactionRef.current = true; // Assume satisfied if no response
          feedbackStateMachine.transition('timeout');
        } else if (currentState === FeedbackState.COLLECTING_FEEDBACK) {
          console.log('📝 Feedback collection timed out - no user input received');
          feedbackStateMachine.transition('timeout');
        }
      }),
      () => {
        // Activity detected - reset timer
        console.log('🎤 Activity detected, resetting silence timer');
      }
    );
    
    silenceDetectorRef.current.start();
  }, [stopSilenceDetection, isSpeaking]);

  // Handle feedback state changes
  const handleFeedbackStateChange = useCallback(async (newState: FeedbackState, oldState: FeedbackState) => {
    const message = feedbackStateMachine.getStateMessage();
    
    // Helper function to start silence detection after TTS completes
    const startSilenceDetectionAfterSpeech = (timeout: number) => {
      // Wait for TTS to actually complete before starting silence detection
      const startDetection = () => {
        // Only start if we're not currently speaking
        if (!isSpeaking) {
          console.log(`🔇 Starting silence detection (${timeout}ms) after TTS completed`);
          startSilenceDetection(timeout);
        } else {
          // If still speaking, wait a bit longer
          setTimeout(startDetection, 500);
        }
      };
      
      // Add a 2-second buffer after TTS to ensure natural conversation flow
      setTimeout(startDetection, 2000);
    };
    
    if (message && speakText && !isProcessingRef.current) {
      // Play the appropriate message for the state
      setIsSpeaking(true);
      try {
        await speakText(message);
        console.log(`🔊 TTS completed for state: ${newState}`);
      } catch (error) {
        console.error('❌ Error speaking feedback message:', error);
      } finally {
        setIsSpeaking(false);
      }
    }

    // Handle state-specific logic AFTER TTS completes
    switch (newState) {
      case FeedbackState.WAITING_FOR_SILENCE:
        startSilenceDetectionAfterSpeech(feedbackStateMachine.getConfig().initialSilenceTimeout);
        break;
        
      case FeedbackState.ASKING_MORE_QUESTIONS:
        startSilenceDetectionAfterSpeech(feedbackStateMachine.getConfig().moreQuestionsTimeout);
        break;
        
      case FeedbackState.ASKING_SATISFACTION:
        startSilenceDetectionAfterSpeech(feedbackStateMachine.getConfig().feedbackSilenceTimeout);
        break;
        
      case FeedbackState.COLLECTING_FEEDBACK:
        console.log('📝 Entering feedback collection mode - waiting for user input...');
        isInFeedbackFlowRef.current = true;
        feedbackTextRef.current = '';
        startSilenceDetectionAfterSpeech(feedbackStateMachine.getConfig().feedbackSilenceTimeout);
        break;
        
      case FeedbackState.THANKING_USER:
        console.log('🙏 Thanking user - will reset session after message');
        // After thanking message is spoken, automatically trigger reset
        setTimeout(() => {
          console.log('🔄 Auto-triggering session reset after thank you message');
          feedbackStateMachine.transition('timeout');
        }, 2000); // Wait 2 seconds after TTS completes
        break;
        
      case FeedbackState.RESETTING_SESSION:
        console.log('🔄 Resetting session - saving feedback and resetting...');
        await saveFeedbackAndReset();
        break;
        
      case FeedbackState.IDLE:
        if (oldState === FeedbackState.ASKING_MORE_QUESTIONS) {
          // User wants more questions - ready to help
          isInFeedbackFlowRef.current = false;
        }
        stopSilenceDetection();
        break;
        
      default:
        stopSilenceDetection();
    }
  }, [speakText, sessionId]);

  // Initialize feedback state machine
  useEffect(() => {
    feedbackStateMachine.reset();
    
    const unsubscribe = feedbackStateMachine.onStateChange((newState, oldState) => {
      console.log(`📊 Feedback state changed: ${oldState} -> ${newState}`);
      setFeedbackState(newState);
      
      // Handle state-specific actions
      handleFeedbackStateChange(newState, oldState);
    });

    return () => {
      unsubscribe();
      if (silenceDetectorRef.current) {
        silenceDetectorRef.current.destroy();
      }
    };
  }, [handleFeedbackStateChange]);

  // Modified processVoiceQuery to handle feedback flow
  const processVoiceQueryWithFeedback = useCallback(async (text: string) => {
    const currentState = feedbackStateMachine.getCurrentState();
    console.log(`🔄 processVoiceQueryWithFeedback: state=${currentState}, text="${text}"`);
    
    // Record activity for silence detection
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.recordActivity();
    }

    // Handle feedback flow states
    if (currentState === FeedbackState.ASKING_MORE_QUESTIONS) {
      const intent = FeedbackStateMachine.detectUserIntent(text);
      console.log(`🔄 ASKING_MORE_QUESTIONS - intent detected: ${intent}`);
      
      if (intent === 'yes') {
        feedbackStateMachine.transition('user_yes');
        // Don't return here - continue with normal query processing since user likely has a question
      } else if (intent === 'no') {
        feedbackStateMachine.transition('user_no');
        return; // Satisfaction question will be spoken by state handler
      } else {
        // User asked a new question instead of yes/no - treat as implicit "yes"
        console.log('🔄 User asked new question while in ASKING_MORE_QUESTIONS - treating as implicit yes');
        feedbackStateMachine.transition('user_yes');
        // Continue with normal query processing
      }
    } else if (currentState === FeedbackState.RESETTING_SESSION) {
      console.log('🔄 Session is resetting - ignoring input:', text);
      return; // Don't process during reset
    } else if (currentState === FeedbackState.ASKING_SATISFACTION) {
      const intent = FeedbackStateMachine.detectUserIntent(text);
      console.log(`🔄 ASKING_SATISFACTION - intent detected: ${intent}`);
      
      if (intent === 'yes') {
        console.log('✅ User is satisfied');
        userSatisfactionRef.current = true; // User is satisfied
        feedbackStateMachine.transition('user_yes');
        return; // Goodbye message and reset
      } else if (intent === 'no') {
        console.log('❌ User is not satisfied');
        userSatisfactionRef.current = false; // User is not satisfied
        feedbackStateMachine.transition('user_no');
        return; // Request feedback
      }
    } else if (currentState === FeedbackState.COLLECTING_FEEDBACK) {
      // Store feedback text
      console.log('📝 Feedback collected:', text);
      feedbackTextRef.current = text;
      feedbackStateMachine.transition('user_response');
      return; // Thank you message and reset
    }

    // Normal query processing
    conversationCountRef.current++;
    await processVoiceQuery(text);
    
    // REMOVED: Don't start feedback flow immediately after every question
    // The feedback flow should only be initiated naturally through silence detection
    // or when user explicitly indicates they're done. This prevents premature resets
    // during active conversations.
    console.log(`🔄 Question processed - state: ${feedbackStateMachine.getCurrentState()}, count: ${conversationCountRef.current}`);
    
    // Start a longer silence detection period to naturally trigger feedback flow
    // only if user goes silent for an extended period (indicating they might be done)
    if (feedbackStateMachine.getCurrentState() === FeedbackState.IDLE && conversationCountRef.current > 0 && !isInFeedbackFlowRef.current) {
      console.log('🔇 Starting extended silence detection to detect end of conversation...');
      startSilenceDetection(10000, () => {
        // Custom callback for extended silence - start feedback flow
        console.log('🔇 Extended silence detected - user appears to be done, starting feedback flow');
        isInFeedbackFlowRef.current = true;
        feedbackStateMachine.transition('user_response');
      });
    }
  }, [processVoiceQuery]);

  return {
    processVoiceQuery: processVoiceQueryWithFeedback,
    sendIntroMessage,
    isProcessing,
    isSpeaking,
    feedbackState
  };
};