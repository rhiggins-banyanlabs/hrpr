// hooks/useVoiceChat.ts - Voice-only chat without UI components
import { useState, useRef, useCallback, useEffect } from 'react';
import { ChatStorageService } from '@/lib/supabase/chatStorage';
import { semanticIntentDetector } from '@/services/semantic-intent-detector.service';
import { IntentDetectorService } from '@/services/intent-detector.service';
import { feedbackStateMachine, FeedbackStateMachine } from '@/services/feedback-state-machine.service';
import { feedbackStorage } from '@/services/feedback-storage.service';
import { NameExtractorService } from '@/services/name-extractor.service';
import { createSilenceDetector, SilenceDetectionService } from '@/services/silence-detection.service';
import { FeedbackState } from '@/types/feedback.types';
import { latencyTracker } from '@/services/latency-tracker.service';
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
  const userNameRef = useRef<string | null>(null); // Track user name
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Track current audio to prevent overlaps
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track feedback flow timeout
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null); // Track 1-second timer before asking more questions
  const pendingSilenceDetectionRef = useRef<NodeJS.Timeout | null>(null); // Track pending silence detection setup
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
  const processVoiceQuery = useCallback(async (text: string, overrideSessionId?: string, customFillerPromise?: Promise<any>, greetingAlreadyHandled: boolean = false): Promise<void> => {
    const activeSessionId = overrideSessionId || sessionId;
    console.log('🎤 ===== PROCESS VOICE QUERY STARTED =====');
    console.log('🎤 Query text:', text);
    console.log('🎤 Session ID:', activeSessionId);
    
    // Cancel any pending feedback flow timer when user speaks
    if (feedbackTimeoutRef.current) {
      console.log('🔄 Cancelling feedback flow timer - user is speaking');
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    
    // Cancel the 1-second "more questions" timer if user speaks
    if (feedbackTimerRef.current) {
      console.log('🔄 Cancelling 1-second timer - user is speaking');
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    
    // CRITICAL: Stop any silence detection when user speaks (including intro timeout)
    console.log('🔇 User spoke - stopping all silence detection (including intro timeout)');
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.stop();
      silenceDetectorRef.current = null;
    }
    // Also clear any pending silence detection setup
    if (pendingSilenceDetectionRef.current) {
      clearTimeout(pendingSilenceDetectionRef.current);
      pendingSilenceDetectionRef.current = null;
    }
    
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
      // BUT skip filler if we're in a feedback collection state
      const currentState = feedbackStateMachine.getCurrentState();
      const isInFeedbackState = currentState === FeedbackState.ASKING_SATISFACTION || 
                               currentState === FeedbackState.COLLECTING_FEEDBACK ||
                               currentState === FeedbackState.ASKING_MORE_QUESTIONS;
      
      if (!isInFeedbackState) {
        // Use custom filler if provided, otherwise generate one
        if (customFillerPromise) {
          console.log('🎤 Using custom personalized filler response');
          fillerAudioPromise = customFillerPromise;
        } else {
          // Use rich, context-sensitive filler response based on the original intent detector
          const fillerResponse = IntentDetectorService.getFillerResponse(text);
          
          console.log('🎤 Filler response from IntentDetector:', fillerResponse);
          if (fillerResponse && speakText) {
            console.log('🎤 Playing immediate filler response:', fillerResponse);
            fillerAudioPromise = speakText(fillerResponse).catch(error => {
              console.log('⚠️ Filler response TTS failed, continuing without filler:', error);
              return null;
            });
          }
          
          // Detect semantic intent in parallel for data gathering (non-blocking)
          semanticIntentDetector.detectIntent(text).then(intentResult => {
            console.log(`🎯 Semantic voice intent: ${intentResult.primaryIntent} (confidence: ${intentResult.confidence.toFixed(2)})`);
          }).catch(error => {
            console.error('Semantic voice intent detection failed:', error);
          });
        }
      } else {
        console.log('🔇 Skipping filler response - in feedback state:', currentState);
      }

      // Start database operations in parallel with AI processing (non-blocking for speed)
      const analyticsPromise = ChatStorageService.logAnalyticsEvent(activeSessionId, 'user_question', {
        question: text.trim(),
        category: categorizeQuestion(text),
        timestamp: new Date().toISOString()
      }).catch(analyticsError => {
        console.error('❌ Failed to log analytics event:', analyticsError);
      });

      const saveUserMessagePromise = ChatStorageService.saveMessage(
        activeSessionId,
        'user',
        text.trim(),
        {
          metadata: { source: 'voice' }
        }
      ).then(savedUserMessage => {
        console.log('💾 User message saved:', savedUserMessage?.id);
        return savedUserMessage;
      }).catch(dbError => {
        console.error('❌ Failed to save user message to database:', dbError);
        console.log('⚠️ Continuing with AI processing despite database error');
        return null;
      });

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Get AI response from API route with latency tracking
      console.log('🤖 Getting AI response...');
      const apiStartTime = performance.now();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: text,
          userName: userNameRef.current,
          greetingAlreadyHandled: greetingAlreadyHandled
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiResponse = await response.json();
      const apiEndTime = performance.now();
      
      // Track API response time
      latencyTracker.trackApiResponse(apiStartTime, apiEndTime);
      
      if (!aiResponse.success || !aiResponse.response) {
        throw new Error(aiResponse.error || 'No response from AI');
      }

      console.log('🤖 AI Response received:', aiResponse.response.substring(0, 50) + '...');

      // Generate TTS audio and save to database
      if (speakText) {
        console.log('🔊 Starting TTS generation...');
        
        // Audio overlap prevention is now handled by useOptimizedVoice.speakText()
        // Speaking state is managed by useOptimizedVoice when audio actually plays
        
        try {
          // Wait for filler response to complete if it's still playing
          if (fillerAudioPromise) {
            console.log('🔊 Waiting for filler response to complete...');
            try {
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
            } catch (fillerError) {
              console.log('🔊 Filler response failed, continuing with main response:', fillerError);
            }
          }
          
          // Now play the main AI response with latency tracking
          const ttsStartTime = performance.now();
          const audioResult = await speakText(aiResponse.response);
          const ttsEndTime = performance.now();
          
          // Track TTS generation time
          latencyTracker.trackTTSGeneration(ttsStartTime, ttsEndTime);
          
          // Track the current audio to prevent overlaps
          if (audioResult && audioResult.audio) {
            currentAudioRef.current = audioResult.audio;
            
            // Wait for audio to actually complete and track playback time
            const audioStartTime = performance.now();
            await new Promise<void>((resolve) => {
              const audio = audioResult.audio;
              
              const handleEnded = () => {
                const audioEndTime = performance.now();
                console.log('🔊 Speech completed');
                
                // Track audio playback time
                latencyTracker.trackAudioPlayback(audioStartTime, audioEndTime);
                
                // Track complete interaction
                latencyTracker.trackCompleteInteraction(
                  apiEndTime - apiStartTime,
                  ttsEndTime - ttsStartTime,
                  audioEndTime - audioStartTime
                );
                
                audio.removeEventListener('ended', handleEnded);
                currentAudioRef.current = null;
                
                resolve();
              };
              
              audio.addEventListener('ended', handleEnded);
              
              // Fallback timeout
              setTimeout(() => {
                const audioEndTime = performance.now();
                console.log('🔊 Speech timeout - assuming completed');
                
                // Track audio playback time even on timeout
                latencyTracker.trackAudioPlayback(audioStartTime, audioEndTime);
                
                audio.removeEventListener('ended', handleEnded);
                currentAudioRef.current = null;
                resolve();
              }, 45000); // 45 second timeout - optimized for speed
            });
          }
          
        } catch (voiceError) {
          console.error('🔊 Voice error:', voiceError);
        }
      }

      // Save Harper's response to database (non-blocking)
      const saveHarperMessagePromise = ChatStorageService.saveMessage(
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
        console.log('⚠️ Continuing despite error');
        return null;
      });

      // Increment conversation count after successful response
      conversationCountRef.current++;
      
      // Wait for all database operations to complete (but don't block the main flow)
      Promise.all([analyticsPromise, saveUserMessagePromise, saveHarperMessagePromise]).then(() => {
        console.log('✅ All database operations completed');
      }).catch(error => {
        console.log('⚠️ Some database operations failed:', error);
      });
      
    } catch (error) {
      console.error('❌ Error processing voice query:', error);
      
      // Speak error message if possible
      if (speakText && error instanceof Error && error.name !== 'AbortError') {
        const errorMessage = "I'm having a technical issue, but I want to help you! Could you try asking your question again, or would you like me to connect you with someone at the registration desk?";
        try {
          await speakText(errorMessage);
        } catch (voiceError) {
          console.error('🔊 Voice error while speaking error message:', voiceError);
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

    const introMessage = "Hi! I'm Harper, your conference assistant. How can I help? Feel free to share your name if you'd like a more personal experience!";

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
      await speakText(introMessage);
      
      console.log('🎯 Intro message sent and spoken - ready for user input');
      
      // Start silence detection after intro message completes
      // Wait a bit for the user to start speaking, then start timeout
      setTimeout(() => {
        if (!isProcessingRef.current && !isSpeaking) {
          console.log('🔇 Starting 30-second timeout after intro message');
          
          // Create and start a silence detector for the intro timeout
          const silenceDetector = createSilenceDetector(
            30000, // 30 second timeout
            () => {
              console.log('⏰ User didn\'t respond after intro - triggering session reset');
              // User didn't respond after intro, trigger session reset
              if (onSessionReset) {
                onSessionReset();
              }
            }
          );
          
          // Store reference so it can be stopped if user speaks
          silenceDetectorRef.current = silenceDetector;
          
          // IMPORTANT: Start the silence detector
          silenceDetector.start();
          console.log('✅ Silence detector started for intro timeout');
          
        } else {
          console.log('🔇 Not starting silence detection - system is busy');
        }
      }, 3000); // 3-second delay to give user time to start speaking
      
    } catch (error) {
      console.error('❌ Error sending intro message:', error);
      setIsSpeaking(false);
    }
  }, [sessionId, speakText, onSessionReset]);

  // Stop silence detection
  const stopSilenceDetection = useCallback(() => {
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.stop();
      silenceDetectorRef.current = null;
    }
    // Also clear any pending silence detection setup
    if (pendingSilenceDetectionRef.current) {
      clearTimeout(pendingSilenceDetectionRef.current);
      pendingSilenceDetectionRef.current = null;
      console.log('🔇 Cleared pending silence detection setup');
    }
  }, []);
  

  // Save feedback and reset session
  const saveFeedbackAndReset = useCallback(async () => {
    if (!sessionId) return;

    // Determine satisfaction based on user's actual response
    // If user satisfaction is null, it means they didn't go through the satisfaction flow
    // (e.g., timeout scenario), so default to true (satisfied)
    const satisfied = userSatisfactionRef.current !== null ? userSatisfactionRef.current : true;

    const feedbackText = feedbackTextRef.current?.trim();
    console.log('💾 Saving feedback and resetting session...', { 
      satisfied, 
      feedbackText,
      userSatisfactionRef: userSatisfactionRef.current,
      conversationCount: conversationCountRef.current,
      hasFeedbackText: !!feedbackText
    });

    // Save feedback
    try {
      await feedbackStorage.saveFeedback({
        sessionId,
        satisfied,
        feedbackText: feedbackText || undefined,
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
    userNameRef.current = null; // Reset user name tracking
    
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
        
        if (currentState === FeedbackState.ASKING_MORE_QUESTIONS) {
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
    console.log(`🎯 handleFeedbackStateChange called: ${oldState} -> ${newState}`);
    console.log('🎯 Current actual state from state machine:', feedbackStateMachine.getCurrentState());
    let message = feedbackStateMachine.getStateMessage();
    console.log('📢 State message retrieved:', message);
    console.log('📢 Expected states:', {
      ASKING_MORE_QUESTIONS: FeedbackState.ASKING_MORE_QUESTIONS,
      ASKING_SATISFACTION: FeedbackState.ASKING_SATISFACTION,
      currentIs: newState
    });
    
    // Personalize goodbye/thank you message with user's name if available
    if (message && newState === FeedbackState.THANKING_USER && userNameRef.current) {
      if (message.includes("Thank you for your feedback")) {
        // Thank you message (when feedback was provided) - add name after "Thank you for your feedback"
        message = message.replace("Thank you for your feedback.", `Thank you for your feedback ${userNameRef.current}!`);
        console.log('✨ Personalized thank you message with user name:', userNameRef.current);
      } else if (message.includes("Have a great day,")) {
        // Goodbye message (when no feedback was provided) - add name after "Have a great day"
        message = message.replace("Have a great day,", `Have a great day ${userNameRef.current},`);
        console.log('✨ Personalized goodbye message with user name:', userNameRef.current);
      }
    }
    
    console.log('🎯 handleFeedbackStateChange:', {
      oldState,
      newState,
      message,
      userName: userNameRef.current,
      isProcessing: isProcessingRef.current,
      hasSpeakText: !!speakText
    });
    
    // Helper function to start silence detection after TTS completes
    const startSilenceDetectionAfterSpeech = (timeout: number) => {
      // Clear any existing pending detection
      if (pendingSilenceDetectionRef.current) {
        clearTimeout(pendingSilenceDetectionRef.current);
        pendingSilenceDetectionRef.current = null;
      }
      
      // Wait for TTS to actually complete before starting silence detection
      const startDetection = () => {
        // Only start if we're not currently speaking
        if (!isSpeaking) {
          console.log(`🔇 Starting silence detection (${timeout}ms) after TTS completed`);
          startSilenceDetection(timeout);
          pendingSilenceDetectionRef.current = null; // Clear ref once started
        } else {
          // If still speaking, wait a bit longer
          pendingSilenceDetectionRef.current = setTimeout(startDetection, 500);
        }
      };
      
      // Add a 5-second buffer after TTS to ensure natural conversation flow
      // This gives users time to think before we start monitoring for silence
      pendingSilenceDetectionRef.current = setTimeout(startDetection, 5000);
    };
    
    // For THANKING_USER state, always speak the message regardless of processing state
    // This ensures users always hear the thank you after providing feedback
    const shouldSpeak = (newState === FeedbackState.THANKING_USER) 
      ? (message && speakText) 
      : (message && speakText && !isProcessingRef.current);
    
    console.log('🎯 Checking if should speak message:', {
      hasMessage: !!message,
      hasSpeakText: !!speakText,
      isProcessing: isProcessingRef.current,
      newState: newState,
      willSpeak: shouldSpeak
    });
    
    if (shouldSpeak) {
      // Stop any currently playing audio to prevent overlap
      if (currentAudioRef.current) {
        console.log('🔊 Stopping previous audio for feedback message');
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      // Play the appropriate message for the state
      console.log(`🔊 Speaking feedback message for state ${newState}: "${message}"`);
      
      // Check if speakText and message are available
      if (!speakText || !message) {
        console.log('⚠️ TTS or message not available for feedback message');
        return;
      }
      
      try {
        const audioResult = await speakText(message);
        
        // Track the current audio and wait for completion
        if (audioResult && audioResult.audio) {
          currentAudioRef.current = audioResult.audio;
          
          await new Promise<void>((resolve) => {
            const audio = audioResult.audio;
            
            const handleEnded = () => {
              console.log(`🔊 TTS completed for state: ${newState}`);
              audio.removeEventListener('ended', handleEnded);
              currentAudioRef.current = null;
              resolve();
            };
            
            audio.addEventListener('ended', handleEnded);
            
            // Fallback timeout
            setTimeout(() => {
              console.log(`🔊 TTS timeout for state: ${newState}`);
              audio.removeEventListener('ended', handleEnded);
              currentAudioRef.current = null;
              resolve();
            }, 45000); // 45 second timeout - optimized for speed
          });
        }
      } catch (error) {
        console.error('❌ Error speaking feedback message:', error);
      }
    }

    // Handle state-specific logic AFTER TTS completes
    switch (newState) {
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
    console.log('🚀 Initializing feedback state machine for new session');
    feedbackStateMachine.reset();
    const initialState = feedbackStateMachine.getCurrentState();
    console.log('📍 Initial feedback state after reset:', initialState);
    
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
      // Clear any pending silence detection setup
      if (pendingSilenceDetectionRef.current) {
        clearTimeout(pendingSilenceDetectionRef.current);
        pendingSilenceDetectionRef.current = null;
      }
    };
  }, [handleFeedbackStateChange]);

  // Personalized wrapper for processVoiceQuery
  const processVoiceQueryWithPersonalization = useCallback(async (
    text: string, 
    isNewNameIntroduction: boolean = false, 
    extractedName: string | null = null
  ) => {
    // If we have a new name introduction with a query, we need to personalize the filler
    if (isNewNameIntroduction && extractedName) {
      console.log('👋 Processing query with name introduction for:', extractedName);
      
      // Get the original filler response using fast keyword detection and add the greeting
      const originalFillerResponse = IntentDetectorService.getFillerResponse(text);
      if (originalFillerResponse && speakText) {
        // Add "Nice to meet you" to the filler response
        const personalizedFiller = `Nice to meet you, ${extractedName}! ${originalFillerResponse}`;
        console.log('🎤 Playing personalized filler response:', personalizedFiller);
        
        // Play the personalized filler immediately
        const fillerAudioPromise = speakText(personalizedFiller).catch(error => {
          console.log('⚠️ Personalized filler response TTS failed:', error);
          return null;
        });
        
        // Process the query with filler - mark that greeting was already handled
        // We'll modify processVoiceQuery to pass this flag
        await processVoiceQuery(text, undefined, fillerAudioPromise, true); // true = greeting already handled
      } else {
        // Fallback to normal processing
        await processVoiceQuery(text);
      }
    } else {
      // Process normally
      await processVoiceQuery(text);
    }
  }, [processVoiceQuery, speakText]);

  // Modified processVoiceQuery to handle feedback flow
  const processVoiceQueryWithFeedback = useCallback(async (text: string) => {
    const currentState = feedbackStateMachine.getCurrentState();
    console.log(`🔄 processVoiceQueryWithFeedback: state=${currentState}, text="${text}"`);
    
    // IMMEDIATELY stop silence detection when user speaks - prevents premature feedback
    console.log('🔇 User is speaking - stopping all silence detection');
    stopSilenceDetection();
    
    // Record activity for silence detection
    if (silenceDetectorRef.current) {
      silenceDetectorRef.current.recordActivity();
    }

    // Handle feedback flow states
    // First check if user said "no" in IDLE state (responding to Harper's natural follow-up question)
    if (currentState === FeedbackState.IDLE && conversationCountRef.current > 0) {
      const intent = FeedbackStateMachine.detectUserIntent(text);
      if (intent === 'no') {
        console.log('🔄 User said NO to follow-up question - starting satisfaction feedback');
        feedbackStateMachine.transition('timeout'); // This triggers satisfaction question
        return;
      }
      // Otherwise continue normal processing
    } else if (currentState === FeedbackState.ASKING_MORE_QUESTIONS) {
      const intent = FeedbackStateMachine.detectUserIntent(text);
      console.log(`🔄 ASKING_MORE_QUESTIONS - intent detected: ${intent}`);
      
      // Immediately stop any pending silence detection since user is active
      console.log('🔇 User activity detected during ASKING_MORE_QUESTIONS - stopping silence detection');
      stopSilenceDetection();
      
      // CRITICAL: Clear the feedback timer to prevent race condition with timeout
      if (feedbackTimerRef.current) {
        console.log('🔄 Clearing feedback timer to prevent timeout race condition');
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
      
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
      
      // ALWAYS capture the user's response as feedback text, regardless of intent
      feedbackTextRef.current = text;
      console.log('📝 Satisfaction feedback captured:', text);
      
      // If the response is more than just yes/no (has meaningful feedback), mark as feedback provided
      const isDetailedFeedback = text.trim().length > 10 && intent === 'other';
      if (isDetailedFeedback) {
        console.log('📝 Detailed feedback provided during satisfaction question');
        feedbackStateMachine.setFeedbackProvided(true);
      }
      
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
      } else {
        // For responses that don't clearly indicate yes/no, treat as satisfied but still save the feedback
        console.log('🤔 Unclear satisfaction response, treating as satisfied but saving feedback');
        userSatisfactionRef.current = true; // Default to satisfied for unclear responses
        feedbackStateMachine.transition('user_yes');
        return; // Thank you message if feedback provided, goodbye otherwise
      }
    } else if (currentState === FeedbackState.COLLECTING_FEEDBACK) {
      // Store additional feedback text (append if there was already feedback from satisfaction question)
      console.log('📝 Additional feedback collected:', text);
      const existingFeedback = feedbackTextRef.current;
      feedbackTextRef.current = existingFeedback ? `${existingFeedback}. Additional feedback: ${text}` : text;
      
      // Mark that feedback was provided
      feedbackStateMachine.setFeedbackProvided(true);
      
      feedbackStateMachine.transition('user_response');
      return; // Thank you message and reset
    }

    // Check for name extraction before processing query
    let isNewNameIntroduction = false;
    let extractedName: string | null = null;
    
    if (!userNameRef.current) {
      const nameInfo = NameExtractorService.extractName(text);
      if (nameInfo.name && nameInfo.confidence !== 'low') {
        userNameRef.current = nameInfo.name;
        extractedName = nameInfo.name;
        isNewNameIntroduction = true;
        console.log('👤 User name extracted:', userNameRef.current);
        
        // If this was just a name introduction, acknowledge it and don't process as a normal query
        if (nameInfo.confidence === 'high' && text.trim().split(/\s+/).length <= 4) {
          console.log('👋 Name introduction detected, acknowledging...');
          const acknowledgment = `Nice to meet you, ${nameInfo.name}! How can I help you with the conference?`;
          if (speakText) {
            await speakText(acknowledgment);
          }
          return;
        }
      }
    }

    // Normal query processing with personalization info
    await processVoiceQueryWithPersonalization(text, isNewNameIntroduction, extractedName);
    
    // Start silence detection after response - since Harper now asks follow-up questions naturally,
    // we just wait for silence and go directly to satisfaction feedback if no response
    if (feedbackStateMachine.getCurrentState() === FeedbackState.IDLE && conversationCountRef.current > 0) {
      console.log('🔄 Starting silence detection after response - Harper asked follow-up question naturally');
      
      // Clear any existing feedback timer
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
      
      // Wait for TTS to complete, then start silence detection
      const waitForSpeechAndStartSilenceDetection = () => {
        // First, wait for processing to complete
        const waitForProcessing = setInterval(() => {
          if (!isProcessingRef.current) {
            clearInterval(waitForProcessing);
            
            // Now wait for TTS to complete
            const checkSpeaking = setInterval(() => {
              if (!isSpeaking) {
                clearInterval(checkSpeaking);
                console.log('🔊 Voice response finished, starting silence detection for follow-up response');
                
                // Add a 5-second delay to let user start speaking after responses
                setTimeout(() => {
                  // Only start silence detection if still idle and not processing
                  if (feedbackStateMachine.getCurrentState() === FeedbackState.IDLE && 
                      !isProcessingRef.current && !isSpeaking) {
                    console.log('🔇 Starting 30-second silence detection for user response');
                    
                    startSilenceDetection(30000, () => {
                      // After silence timeout, user didn't respond to Harper's natural follow-up question
                      // Go directly to satisfaction question
                      if (feedbackStateMachine.getCurrentState() === FeedbackState.IDLE && 
                          !isProcessingRef.current && !isSpeaking) {
                        console.log('🔇 No response to natural follow-up question - starting satisfaction feedback');
                        feedbackStateMachine.transition('timeout'); // This should trigger satisfaction question
                      }
                    });
                  } else {
                    console.log('🔇 Not starting silence detection - user or system is active');
                  }
                }, 5000); // 5 second delay to let user start speaking after responses
              }
            }, 100); // Check every 100ms if still speaking
          }
        }, 100); // Check every 100ms if still processing
      };
      
      waitForSpeechAndStartSilenceDetection();
    }
    
    console.log(`🔄 Question processed - state: ${feedbackStateMachine.getCurrentState()}, count: ${conversationCountRef.current}`);
  }, [processVoiceQuery, startSilenceDetection]);

  return {
    processVoiceQuery: processVoiceQueryWithFeedback,
    sendIntroMessage,
    isProcessing,
    isSpeaking,
    feedbackState
  };
};