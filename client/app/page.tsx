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
import { VoiceButton } from "@/components/VoiceButton"
import { AdminButton } from "@/components/admin/ui/AdminButton"
import { VoiceInput } from "@/features/voice"
import { useRouter } from "next/navigation"

export default function Home() {
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false)
  const [isHarperSpeaking, setIsHarperSpeaking] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [isHarperActivated, setIsHarperActivated] = useState(false) // Track if Harper has been activated
  const [isThinking, setIsThinking] = useState(false) // Track when AI is processing
  const router = useRouter()
  const { isPedestalMode, isSystemLocked } = useAdminAuth()

  // Refs for state management
  const hasPlayedIntroRef = useRef(false)
  const isProcessingVoiceQueryRef = useRef(false)
  const initializationAttemptedRef = useRef(false)
  const hasSessionRef = useRef(false)

  // Chat storage hook
  const { currentSession, startNewSession, endSession } = useChatStorage()
  
  // Voice hooks
  const { speakText, isSpeaking, selectedVoice, setSelectedVoice, unlockAudio, preCacheIntroMessage } = useOptimizedVoice()
  
  // Sync the voice hook's speaking state with Harper speaking state
  useEffect(() => {
    console.log('🔊 Voice hook isSpeaking changed:', isSpeaking)
    setIsHarperSpeaking(isSpeaking)
  }, [isSpeaking])
  
  // Stable callback for speaking state changes (kept for useVoiceChat compatibility)
  const handleSpeakingChange = useCallback((isSpeaking: boolean) => {
    // This is now redundant since we're using the voice hook's state directly
    // But keeping it for compatibility with useVoiceChat
    console.log('🔊 handleSpeakingChange called:', isSpeaking)
  }, [])
  
  // Voice chat hook
  const { processVoiceQuery, sendIntroMessage, isProcessing } = useVoiceChat({
    sessionId: currentSession?.id || null,
    speakText,
    onSpeakingChange: handleSpeakingChange
  })

  const handleHarperDetected = async (query: string) => {
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
        
        // Send intro message immediately (pre-cached)
        await sendIntroMessage(sessionId)
        console.log("✅ Intro message sent");
      }
      
      // Then process the query
      console.log("🎯 Processing query:", query);
      setIsThinking(true);
      try {
        await processVoiceQuery(query, sessionId)
        console.log("✅ Query processed successfully");
      } finally {
        setIsThinking(false);
      }
      
      // Reset speech recognition states after processing
      speechActions.resetStates();
      
    } catch (error) {
      console.error("❌ Error in handleHarperDetected:", error);
    } finally {
      isProcessingVoiceQueryRef.current = false
      console.log("🏁 handleHarperDetected completed");
    }
  }

  const [speechState, speechActions] = useSpeechRecognition(handleHarperDetected)

  // Handle voice input toggle for the unified orb
  const handleVoiceInputToggle = useCallback(async () => {
    console.log("🎤 🔄 Voice input toggle called from VoiceOrb, current state:", isVoiceInputActive)

    // Don't allow voice input while Harper is speaking or processing
    if (isHarperSpeaking || isProcessing) {
      console.log("🎤 ❌ Harper is speaking/processing, not toggling voice input")
      return
    }

    const newState = !isVoiceInputActive
    setIsVoiceInputActive(newState)
    
    if (!newState) {
      console.log("🎤 Stopping voice input from VoiceOrb")
      setVoiceTranscript("")
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
  }, [isVoiceInputActive, isHarperSpeaking, isProcessing, isHarperActivated, currentSession?.id, startNewSession, unlockAudio])

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
                className="font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400 transition-all duration-700 text-5xl sm:text-6xl md:text-7xl"
              >
                Harper
              </h1>
              <p
                className="mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 transition-all duration-700 text-lg sm:text-xl"
              >
                Your AI Event Assistant
              </p>
            </div>

            <div className="transition-all duration-700 scale-100">
              <VoiceOrb
                listening={isHarperActivated ? isVoiceInputActive : false}
                HarperDetected={speechState.HarperDetected}
                isNavigating={speechState.isNavigating}
                isVoiceInputActive={isVoiceInputActive}
                onVoiceInputToggle={handleVoiceInputToggle}
                isChatOpen={false}
                isHarperSpeaking={isHarperSpeaking}
                isHarperActivated={isHarperActivated}
                isThinking={isThinking}
              />
            </div>

            {(
              <div className="transition-all duration-700">
                <MorphingText
                  texts={[
                    "What is AIDA and how does it work?",
                    "Can you tell me about the technology behind AIDA?",
                    "What time is the keynote?",
                    "How could AIDA help my organization?",
                    "Can you tell me about the conference?",
                    "What speakers are at the conference?",
                  ]}
                  className="-my-3 w-screen"
                />
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              {/* Control Buttons - Only show before Harper is activated */}
              {!isHarperActivated && (
                <div className="flex flex-col items-center gap-4">
                  <VoiceButton
                    listening={speechState.listening}
                    isNavigating={speechState.isNavigating}
                    HarperDetected={speechState.HarperDetected}
                    onToggle={speechActions.toggleListening}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Voice Input Component - Only active when Harper is activated */}
      {isHarperActivated && (
        <VoiceInput
          onSpeechEnd={async (text) => {
            console.log("🎤 Voice input received:", text);
            setVoiceTranscript("");
            setIsVoiceInputActive(false);
            
            if (text.trim()) {
              setIsThinking(true);
              try {
                await processVoiceQuery(text, currentSession?.id);
              } finally {
                setIsThinking(false);
              }
            }
          }}
          onTranscriptUpdate={(transcript, isInterim) => {
            console.log("🎤 Voice transcript update:", transcript, "isInterim:", isInterim);
            setVoiceTranscript(transcript);
          }}
          isListening={isVoiceInputActive}
          onListeningChange={(listening) => {
            if (!listening && isVoiceInputActive) {
              setIsVoiceInputActive(false);
              setVoiceTranscript("");
            }
          }}
        />
      )}
    </div>
  )
}