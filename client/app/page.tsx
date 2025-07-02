"use client"

import { VoiceOrb } from "@/features/voice"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useChatStorage } from "@/hooks/useChatStorage"
import { useAdminAuth } from "@/components/admin/security/AdminAuthContext"
import Waves from "@/components/waves"
import { useState, useRef, useCallback, useEffect } from "react"
import { MorphingText } from "@/components/MorphingText"
import { VoiceButton } from "@/components/VoiceButton"
import { CompactChat } from "@/components/CompactChat"
import { ChatToggleButton } from "@/components/ToggleChatButton"
import { AdminButton } from "@/components/admin/ui/AdminButton"
import { useRouter } from "next/navigation"

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false)
  const [isConnieSpeaking, setIsConnieSpeaking] = useState(false)
  const router = useRouter()
  const { isPedestalMode, isSystemLocked } = useAdminAuth()

  // Refs for state management
  const hasPlayedIntroRef = useRef(false)
  const isProcessingVoiceQueryRef = useRef(false)
  const initializationAttemptedRef = useRef(false)

  // Chat storage hook
  const { currentSession, startNewSession, endSession } = useChatStorage()

  const handleConnieDetected = async (query: string) => {
    console.log("🏠 HOME: handleConnieDetected called with query:", query || "no query")

    // Prevent multiple activations while processing
    if (isProcessingVoiceQueryRef.current) {
      console.log("🏠 Already processing voice query, ignoring")
      return
    }

    // Create session if needed, then open chat
    if (!currentSession?.id) {
      console.log("📝 Creating session for voice query");
      await startNewSession({
        source: "voice_activation",
        initial_query: query,
        timestamp: new Date().toISOString(),
      });
    }

    // Open chat
    setIsChatOpen(true)
  }

  const [speechState, speechActions] = useSpeechRecognition(handleConnieDetected)

  // Handle voice input toggle for the unified orb
  const handleVoiceInputToggle = useCallback(() => {
    console.log("🎤 🔄 Voice input toggle called from VoiceOrb, current state:", isVoiceInputActive)

    // Don't allow voice input while wake word detection is active or Connie is speaking
    if (speechState.listening || isConnieSpeaking) {
      console.log("🎤 ❌ Wake word detection is active or Connie is speaking, not toggling voice input")
      return
    }

    const newState = !isVoiceInputActive
    setIsVoiceInputActive(newState)
    
    if (!newState) {
      console.log("🎤 Stopping voice input from VoiceOrb")
    } else {
      console.log("🎤 Starting voice input from VoiceOrb")
    }
  }, [isVoiceInputActive, speechState.listening, isConnieSpeaking])

  // Stable callback for speaking state changes
  const handleSpeakingChange = useCallback((isSpeaking: boolean) => {
    setIsConnieSpeaking(isSpeaking)
  }, [])

  // RESET STATES ONLY WHEN CHAT INITIALLY OPENS - not on subsequent state changes
  const [hasInitializedChat, setHasInitializedChat] = useState(false)
  
  useEffect(() => {
    // Only reset when chat transitions from closed to open for the first time
    if (isChatOpen && !hasInitializedChat) {
      console.log("🔄 Chat opened for first time - RESETTING MAIN INTERFACE STATES")
      setHasInitializedChat(true)

      // Reset speech recognition states immediately
      speechActions.resetStates()

      // Reset processing flags
      isProcessingVoiceQueryRef.current = false

      // Reset initialization flags - but don't reset hasPlayedIntroRef here
      initializationAttemptedRef.current = false

      console.log("✅ Main interface states reset for new chat session")
    } else if (!isChatOpen) {
      // Reset the initialization flag when chat closes
      setHasInitializedChat(false)
    }
  }, [isChatOpen, hasInitializedChat, speechActions])

  // Disable main speech recognition when chat is open OR voice input is active
  useEffect(() => {
    if (isChatOpen || isVoiceInputActive) {
      console.log("🔇 Chat is open or voice input active, ensuring main speech recognition is disabled")
      if (speechState.listening) {
        speechActions.stopListening()
      }
    }
  }, [isChatOpen, isVoiceInputActive, speechState.listening, speechActions])

  // Handle chat open/close
  const handleChatToggle = useCallback(async () => {
    console.log("🔘 Chat toggle clicked, current state:", isChatOpen)
    
    if (!isChatOpen) {
      // Create session before opening chat if none exists
      if (!currentSession?.id) {
        console.log("📝 Creating session before opening chat");
        await startNewSession({
          source: "chat_toggle",
          initial_query: null,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    setIsChatOpen(!isChatOpen)
  }, [isChatOpen, currentSession?.id, startNewSession])

  const handleChatClose = useCallback(() => {
    console.log("🔄 Closing chat and resetting states")
    setIsChatOpen(false)

    // End the session when closing chat
    if (currentSession?.id) {
      console.log("🔚 Ending session on chat close:", currentSession.id);
      endSession();
    }

    // Additional cleanup when closing (redundant but safe)
    speechActions.resetStates()
    isProcessingVoiceQueryRef.current = false
    hasPlayedIntroRef.current = false
    initializationAttemptedRef.current = false
    
    // Reset voice input when actually closing chat
    setIsVoiceInputActive(false)
  }, [speechActions, currentSession?.id, endSession])

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
              Connie is currently offline. Please wait for a conference administrator to enable the system.
            </p>
            <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-200">
                <strong>For Conference Staff:</strong><br />
                Sign in to the admin panel to enable pedestal mode and activate Connie for attendees.
              </p>
            </div>
          </div>
          
          {/* Admin button for unlocking */}
          <AdminButton />
        </div>
      </div>
    );
  }

  // Normal Mode UI with Integrated Chat
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-black">
      <ChatToggleButton isOpen={isChatOpen} onClick={handleChatToggle} />
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
        <div
          className={`flex-1 flex flex-col items-center justify-center transition-all duration-700 ease-in-out px-4 ${
            isChatOpen ? "transform scale-75 translate-y-4" : "py-2"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h1
                className={`font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400 transition-all duration-700 ${
                  isChatOpen ? "text-4xl sm:text-5xl md:text-6xl" : "text-5xl sm:text-6xl md:text-7xl"
                }`}
              >
                CONNIE
              </h1>
              <p
                className={`mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 transition-all duration-700 ${
                  isChatOpen ? "text-sm sm:text-base" : "text-lg sm:text-xl"
                }`}
              >
                Your AI Event Assistant
              </p>
            </div>

            <div className={`transition-all duration-700 ${isChatOpen ? "scale-90" : "scale-100"}`}>
              <VoiceOrb
                listening={speechState.listening}
                connieDetected={speechState.connieDetected}
                isNavigating={speechState.isNavigating}
                isVoiceInputActive={isVoiceInputActive}
                onVoiceInputToggle={handleVoiceInputToggle}
                isChatOpen={isChatOpen}
                isConnieSpeaking={isConnieSpeaking}
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
              {/* Control Buttons - Only show VoiceButton when chat is closed */}
              <div className="flex flex-col items-center gap-4">
                {!isChatOpen && (
                  <>
                    <VoiceButton
                      listening={speechState.listening}
                      isNavigating={speechState.isNavigating}
                      connieDetected={speechState.connieDetected}
                      onToggle={speechActions.toggleListening}
                    />
                  </>
                )}
              </div>

              {!isChatOpen }

              {/* Instructions for chat mode */}
              {isChatOpen}
            </div>
          </div>
        </div>

        {/* Chat Interface - Much higher positioning and smaller */}
        {isChatOpen && (
          <div className="relative z-20 flex-shrink-0 p-4 pb-4">
            {/* Compact Chat Component - Smaller height */}
            <div className="h-72 max-h-[40vh] -mt-16">
              <CompactChat 
                onClose={handleChatClose}
                sessionId={currentSession?.id || null}
                isVoiceInputActive={isVoiceInputActive}
                onVoiceInputToggle={handleVoiceInputToggle}
                onSpeakingChange={handleSpeakingChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}