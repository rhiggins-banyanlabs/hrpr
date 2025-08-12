"use client"

import { VoiceOrb } from "@/features/voice"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useChatStorage } from "@/hooks/useChatStorage"
import { useAdminAuth } from "@/components/admin/security/AdminAuthContext"
import { useVoiceChat } from "@/hooks/useVoiceChat"
import { useOptimizedVoice } from "@/hooks/useOptimizedVoice"
import Waves from "@/components/waves"
import { useState, useRef, useCallback, useEffect } from "react"
import { MorphingText } from "@/components/MorphingText"
// import { VoiceButton } from "@/components/VoiceButton" // Not needed anymore
import { AdminButton } from "@/components/admin/ui/AdminButton"
import { VoiceInput } from "@/features/voice"
import VoiceInputWhisper from "@/features/voice/components/VoiceInputWhisper"
import WakeWordDetector from "@/features/voice/components/WakeWordDetector"


export default function Home() {
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false)
  const [isHarperSpeaking, setIsHarperSpeaking] = useState(false)
  // const [voiceTranscript, setVoiceTranscript] = useState("") // Not currently used
  const [isHarperActivated, setIsHarperActivated] = useState(false) // Track if Harper has been activated
  const [isThinking, setIsThinking] = useState(false) // Track when AI is processing
  const [isTranscribing, setIsTranscribing] = useState(false) // Track when audio is being transcribed
  const [useWhisperWakeWord, setUseWhisperWakeWord] = useState(false) // Use Whisper for wake word on iOS
  const [isWakeWordListening, setIsWakeWordListening] = useState(false) // Track if wake word detection is active

  const { isSystemLocked } = useAdminAuth()

  // Refs for state management
  const hasPlayedIntroRef = useRef(false)
  const isProcessingVoiceQueryRef = useRef(false)
  // const initializationAttemptedRef = useRef(false) // Not currently used
  const hasSessionRef = useRef(false)

  // Chat storage hook
  const { currentSession, startNewSession, endSession } = useChatStorage()
  
  // Voice hooks
  const { speakText, isSpeaking, unlockAudio, preCacheIntroMessage } = useOptimizedVoice()
  
  // Sync the voice hook's speaking state with Harper speaking state
  useEffect(() => {
    console.log('🔊 Voice hook isSpeaking changed:', isSpeaking)
    setIsHarperSpeaking(isSpeaking)
    
    // Automatically stop voice input when Harper starts speaking
    if (isSpeaking && isVoiceInputActive) {
      console.log('🔊 Harper started speaking, stopping voice input')
      setIsVoiceInputActive(false)
      // setVoiceTranscript("")
    }
  }, [isSpeaking, isVoiceInputActive])
  
  // Stable callback for speaking state changes (kept for useVoiceChat compatibility)
  const handleSpeakingChange = useCallback((isSpeaking: boolean) => {
    // This is now redundant since we're using the voice hook's state directly
    // But keeping it for compatibility with useVoiceChat
    console.log('🔊 handleSpeakingChange called:', isSpeaking)
  }, [])

  // Create a ref to store the callback
  const handleHarperDetectedRef = useRef<(query: string) => Promise<void>>(() => Promise.resolve())

  // Speech recognition callback wrapper
  const speechRecognitionCallback = useCallback(async (query: string) => {
    console.log('🎤 Speech recognition callback called with:', query)
    console.log('🎤 Callback reference status:', !!handleHarperDetectedRef.current)
    if (handleHarperDetectedRef.current) {
      await handleHarperDetectedRef.current(query)
    } else {
      console.log('🎤 No callback reference available!')
    }
  }, [])

  // Initialize speech recognition
  const [speechState, speechActions] = useSpeechRecognition(speechRecognitionCallback)

  // Separate function to perform the actual session reset
  const performSessionReset = useCallback(() => {
    console.log('🔄 Performing actual session reset')
    
    // Stop all voice activities first
    speechActions.stopListening()
    speechActions.resetStates()
    
    // Force stop voice input if it's still active
    if (isVoiceInputActive) {
      console.log('🔄 Force stopping voice input during session reset')
      setIsVoiceInputActive(false)
    }
    
    // Reset to initial state
    setIsHarperActivated(false)
    setIsVoiceInputActive(false)
    // setVoiceTranscript("")
    setIsThinking(false)
    
    // Reset refs
    hasPlayedIntroRef.current = false
    isProcessingVoiceQueryRef.current = false
    hasSessionRef.current = false
    
    // End current session
    if (currentSession) {
      endSession()
    }
    
    // After reset, don't auto-start wake word detection
    // User must click the button to activate Harper
    console.log('🔄 Session reset - waiting for user to click button')
    console.log('🔄 Callback reference available:', !!handleHarperDetectedRef.current)
    console.log('🔄 Speech actions available:', !!speechActions.toggleListening)
    
    console.log('✅ Session reset complete - ready for new user')
  }, [currentSession, endSession, speechActions, isVoiceInputActive])

  // Session reset callback for feedback timeout
  const handleSessionReset = useCallback(() => {
    console.log('🔄 Resetting session to initial state')
    console.log('🔄 Harper speaking state:', isHarperSpeaking)
    
    // If Harper is still speaking, delay the UI reset
    if (isHarperSpeaking) {
      console.log('🔄 Harper is still speaking - delaying UI reset')
      
      // Set up a listener to reset UI when Harper finishes speaking
      const checkSpeakingInterval = setInterval(() => {
        if (!isSpeaking) {
          console.log('🔄 Harper finished speaking - now resetting UI')
          clearInterval(checkSpeakingInterval)
          
          // Perform the actual reset
          performSessionReset()
        }
      }, 100)
      
      // Timeout after 10 seconds to prevent infinite waiting
      setTimeout(() => {
        clearInterval(checkSpeakingInterval)
        performSessionReset()
      }, 10000)
      
      return
    }
    
    // If Harper is not speaking, reset immediately
    performSessionReset()
  }, [isHarperSpeaking, isSpeaking, performSessionReset])
  
  // Voice chat hook
  const { processVoiceQuery, sendIntroMessage, isProcessing } = useVoiceChat({
    sessionId: currentSession?.id || null,
    speakText,
    onSpeakingChange: handleSpeakingChange,
    onSessionReset: handleSessionReset
  })

  // Clean up session when page unloads or component unmounts
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSession?.id) {
        console.log('🔚 Page unloading, ending session:', currentSession.id)
        // Use sendBeacon for reliable cleanup on page unload
        const url = `/api/end-session`
        const data = JSON.stringify({ sessionId: currentSession.id })
        navigator.sendBeacon(url, data)
      }
    }

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (currentSession?.id) {
        console.log('🔚 Component unmounting, ending session:', currentSession.id)
        endSession()
      }
    }
  }, [currentSession, endSession])

  // Forward declaration for speech recognition
  const handleHarperDetected = useCallback(async (query: string) => {
    console.log("🏠 HOME: handleHarperDetected called with query:", query || "no query")

    // Prevent multiple activations while processing
    if (isProcessingVoiceQueryRef.current) {
      console.log("🏠 Already processing voice query, ignoring")
      return
    }

    try {
      // Create session if needed for voice processing
      let sessionId = currentSession?.id;
      if (!sessionId) {
        console.log("📝 Creating session for voice query");
        const newSession = await startNewSession({
          source: "voice_activation",
          initial_query: query,
          timestamp: new Date().toISOString(),
        });
        sessionId = newSession?.id;
        console.log("✅ Session created successfully:", sessionId);
      } else {
        console.log("✅ Using existing session:", sessionId);
      }

      if (!sessionId) {
        console.error("❌ Failed to create or get session ID");
        return;
      }

      // Process voice query directly
      isProcessingVoiceQueryRef.current = true
      console.log("🎯 Starting voice processing...");
      
      // Send intro message if this is the first interaction
      if (!hasPlayedIntroRef.current) {
        console.log("🎯 Sending intro message...");
        hasPlayedIntroRef.current = true
        
        // Activate Harper mode - switch to microphone interface
        setIsHarperActivated(true)
        
        // Stop wake word detection since we're now in active mode
        speechActions.stopListening()
        setIsWakeWordListening(false) // Also stop Whisper wake word if active
        
        // Send intro message immediately (pre-cached)
        await sendIntroMessage(sessionId)
        console.log("✅ Intro message sent");
        
        // Don't auto-start listening - wait for user to click the button
        console.log("⏳ Waiting for user to click the voice button to start recording");
      }
      
      // Only process actual queries, not greetings
      const isJustGreeting = /^(hey|hi|hello)?\s*(harper|conny|coni|koni|honey)\s*$/i.test(query.trim());
      
      if (!isJustGreeting && query.trim()) {
        console.log("🎯 Processing query:", query);
        setIsThinking(true);
        try {
          await processVoiceQuery(query)
          console.log("✅ Query processed successfully");
        } finally {
          setIsThinking(false);
        }
      } else {
        console.log("👋 Just a greeting detected, skipping query processing");
      }
      
      // Reset speech recognition states after processing
      speechActions.resetStates();
      
    } catch (error) {
      console.error("❌ Error in handleHarperDetected:", error);
    } finally {
      isProcessingVoiceQueryRef.current = false
      console.log("🏁 handleHarperDetected completed");
    }
  }, [currentSession, startNewSession, sendIntroMessage, processVoiceQuery, setIsThinking, setIsHarperActivated])

  // Set the callback reference
  useEffect(() => {
    console.log('🔄 Updating handleHarperDetected callback reference')
    handleHarperDetectedRef.current = handleHarperDetected
  }, [handleHarperDetected])


  // Handle voice input toggle for the unified orb
  const handleVoiceInputToggle = useCallback(async () => {
    console.log("🎤 🔄 Voice input toggle called from VoiceOrb, current state:", isVoiceInputActive)

    // If Harper is not activated yet, start/stop listening for "Hey Harper"
    if (!isHarperActivated) {
      console.log("🎤 Toggling Hey Harper detection from orb click")
      
      // For Apple devices, use Whisper wake word detector
      if (useWhisperWakeWord) {
        setIsWakeWordListening(!isWakeWordListening);
        console.log("🍎 Wake word listening state:", !isWakeWordListening);
      } else {
        // For other devices, use native speech recognition
        speechActions.toggleListening();
      }
      
      // Unlock audio on user interaction
      if (unlockAudio && !isWakeWordListening) {
        await unlockAudio();
      }
      return
    }

    // Don't allow voice input while Harper is speaking or processing
    if (isHarperSpeaking || isProcessing) {
      console.log("🎤 ❌ Harper is speaking/processing, not toggling voice input")
      return
    }

    const newState = !isVoiceInputActive
    setIsVoiceInputActive(newState)
    
    if (!newState) {
      console.log("🎤 Stopping voice input from VoiceOrb")
      // setVoiceTranscript("")
    } else {
      console.log("🎤 Starting voice input from VoiceOrb")
      
      // Create session if needed (for activated mode)
      if (isHarperActivated && !currentSession?.id) {
        console.log("📝 Creating session for voice input");
        await startNewSession({
          source: "voice_orb_click",
          initial_query: null,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Unlock audio on user interaction
      if (unlockAudio) {
        await unlockAudio();
      }
    }
  }, [isVoiceInputActive, isHarperSpeaking, isProcessing, isHarperActivated, currentSession?.id, startNewSession, unlockAudio, useWhisperWakeWord, isWakeWordListening])

  // Disable main speech recognition when voice input is active OR when Harper is activated
  useEffect(() => {
    if (isVoiceInputActive || isHarperActivated) {
      console.log("🔇 Voice input active or Harper activated, ensuring main speech recognition is disabled")
      if (speechState.listening) {
        speechActions.stopListening()
      }
    }
  }, [isVoiceInputActive, isHarperActivated, speechState.listening, speechActions])

  // Pre-cache intro message on page load
  useEffect(() => {
    const initializeVoice = async () => {
      console.log("🔄 Initializing voice and pre-caching intro message...");
      try {
        // Pre-cache the intro message for instant playback
        await preCacheIntroMessage();
        console.log("✅ Intro message pre-cached successfully");
      } catch (error) {
        console.error("❌ Error pre-caching intro message:", error);
      }
    };

    // Initialize voice after a short delay
    const timeout = setTimeout(initializeVoice, 500);
    return () => clearTimeout(timeout);
  }, [preCacheIntroMessage]);

  // Detect if we're on an Apple device
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isAppleDevice = /iPad|iPhone|iPod|Mac/i.test(userAgent) || 
                          (navigator.platform === 'MacIntel');
    
    if (isAppleDevice) {
      console.log("🍎 Apple device detected - will use Whisper for wake word");
      setUseWhisperWakeWord(true);
    }
  }, []);

  // Handle wake word listening state
  useEffect(() => {
    // Only listen for wake word if user clicked button and Harper isn't already activated
    if (isWakeWordListening && !isHarperActivated && !useWhisperWakeWord) {
      console.log("📱 Starting native wake word detection...");
      speechActions.startListening();
    } else if (!isWakeWordListening || isHarperActivated) {
      console.log("📱 Stopping wake word detection...");
      speechActions.stopListening();
    }

    return () => {
      if (isWakeWordListening) {
        speechActions.stopListening();
      }
    };
  }, [isWakeWordListening, isHarperActivated, useWhisperWakeWord]);

  // Only start wake word detection when user manually clicks the voice button (before activation)
  // No auto-start of listening

  if (speechState.permissionError) {
    return <ErrorBoundary error={speechState.permissionError} />
  }

  // Show locked screen if system is locked
  if (isSystemLocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl shadow-xl p-8 text-center border-2 border-red-500">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 00-8 0v2m0 0H8a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-6a2 2 0 00-2-2h-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">System Locked</h1>
            <p className="text-gray-300 mb-6">
              Harper is currently offline. Please wait for a conference administrator to enable the system.
            </p>
            <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-200">
                <strong>For Conference Staff:</strong><br />
                Sign in to the admin panel to enable pedestal mode and activate Harper for attendees.
              </p>
            </div>
          </div>
          
          {/* Admin button for unlocking */}
          <AdminButton />
        </div>
      </div>
    );
  }

  // Normal Mode UI - Voice Only
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-black">
      <AdminButton />

      <Waves
        lineColor="rgba(79, 70, 229, 0.6)"
        backgroundColor="black"
        waveSpeedX={0.02}
        waveSpeedY={0.01}
        waveAmpX={40}
        waveAmpY={20}
        friction={0.9}
        tension={0.01}
        maxCursorMove={120}
        xGap={12}
        yGap={36}
      />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col h-full min-h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center transition-all duration-700 ease-in-out px-4 py-2">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h1
                className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400 transition-all duration-700 text-6xl sm:text-7xl md:text-8xl animate-pulse"
                style={{
                  fontFamily: "var(--font-orbitron)",
                  letterSpacing: "0.15em",
                  textShadow: "0 0 30px rgba(99, 102, 241, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)",
                  filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))"
                }}
              >
                HRPR
              </h1>
              <p
                className="mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 transition-all duration-700 text-lg sm:text-xl"
              >
                Your AI Event Assistant
              </p>
            </div>

            <div className="transition-all duration-700 scale-100">
              <VoiceOrb
                listening={isHarperActivated ? isVoiceInputActive : (useWhisperWakeWord ? isWakeWordListening : speechState.listening)}
                HarperDetected={speechState.HarperDetected}
                isNavigating={speechState.isNavigating}
                isVoiceInputActive={isVoiceInputActive}
                onVoiceInputToggle={handleVoiceInputToggle}
                isChatOpen={false}
                isHarperSpeaking={isHarperSpeaking}
                isHarperActivated={isHarperActivated}
                isThinking={isThinking || isTranscribing}
              />
            </div>

            {(
              <div className="transition-all duration-700">
                <MorphingText
                  texts={[
                    "What workshops offer CE credits on Friday?",
                    "When is the Health Care Committee meeting?",
                    "Are there facility tours this weekend?",
                    "What's happening at the AI Tech Expo Saturday?",
                    "Show me substance abuse workshops with CME credits",
                    "Where can I get lunch near the convention center?",
                    "Which exhibitors are in the 200-300 booth range?",
                    "What time does registration open Thursday?",
                    "Are there any juvenile corrections workshops?",
                    "When is the Adult Corrections Committee meeting?",
                    "What continuing education sessions offer CEU credits?",
                    "Tell me about the correctional facility tours",
                  ]}
                  className="-my-3 w-screen"
                />
                
                {/* Descriptive text immediately below morphing text */}
                {!isHarperActivated && (
                  <div className="text-center mt-2 animate-fade-in">
                    <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 text-2xl sm:text-3xl md:text-4xl">
                      Press the button and say{" "}
                      <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">&quot;Hey Harper&quot;</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Wake Word Detector for iOS/Mac devices - only active when listening */}
      {useWhisperWakeWord && isWakeWordListening && !isHarperActivated && (
        <WakeWordDetector
          isActive={isWakeWordListening && !isHarperActivated}
          onWakeWordDetected={() => {
            console.log("🎯 Wake word detected via Whisper!");
            setIsWakeWordListening(false); // Stop listening after detection
            handleHarperDetected("");
          }}
        />
      )}

      {/* Voice Input Component - Only active when Harper is activated */}
      {isHarperActivated && (
        <VoiceInputWhisper
          onSpeechEnd={async (text) => {
            console.log("🎤 Voice input received:", text);
            // setVoiceTranscript("");
            setIsVoiceInputActive(false);
            
            if (text.trim()) {
              setIsThinking(true);
              try {
                // Use the feedback wrapper instead of direct processVoiceQuery
                console.log('🎤 VoiceInput calling processVoiceQuery with:', text);
                await processVoiceQuery(text);
              } finally {
                setIsThinking(false);
              }
            }
          }}
          onTranscriptUpdate={(transcript, isInterim) => {
            console.log("🎤 Voice transcript update:", transcript, "isInterim:", isInterim);
            // Show processing state when transcribing
            if (transcript === 'Processing...' && isInterim) {
              setIsTranscribing(true);
            } else {
              setIsTranscribing(false);
            }
            // setVoiceTranscript(transcript);
          }}
          isListening={isVoiceInputActive}
          onListeningChange={(listening) => {
            console.log("🎤 Listening state changed:", listening);
            if (!listening && isVoiceInputActive) {
              setIsVoiceInputActive(false);
              // setVoiceTranscript("");
            }
          }}
        />
      )}
    </div>
  )
}