"use client"

import { VoiceOrb } from "@/components/VoiceOrb"
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

// Debug components
// import { DebugSessionCreation } from '@/components/DebugSessionCreation';
// import { DatabaseSaveTest } from '@/components/DatabaseSaveTest';
// import { ConferenceDataCheck } from '@/components/ConferenceDataCheck';

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false)
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

  // RESET STATES IMMEDIATELY WHEN CHAT OPENS
  useEffect(() => {
    if (isChatOpen) {
      console.log("🔄 Chat opened - RESETTING ALL MAIN INTERFACE STATES")

      // Reset speech recognition states immediately
      speechActions.resetStates()

      // Reset processing flags
      isProcessingVoiceQueryRef.current = false

      // Reset initialization flags
      hasPlayedIntroRef.current = false
      initializationAttemptedRef.current = false

      console.log("✅ All main interface states reset to default")
    }
  }, [isChatOpen, speechActions])

  // Disable main speech recognition when chat is open
  useEffect(() => {
    if (isChatOpen) {
      console.log("🔇 Chat is open, ensuring main speech recognition is disabled")
      if (speechState.listening) {
        speechActions.stopListening()
      }
    }
  }, [isChatOpen, speechState.listening, speechActions])

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

        {/* Debug components - only show in development */}
        {/* {process.env.NODE_ENV === 'development' && (
          <>
            <DebugSessionCreation />
            <DatabaseSaveTest />
            <ConferenceDataCheck />
          </>
        )} */}
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
              {/* Control Buttons */}
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

              {!isChatOpen && (
                <div className="text-center">
                  <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 max-w-md font-medium text-base">
                    Say <span className="text-lg font-bold">"Hey CONNIE"</span> for all your conference needs!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface - Much higher positioning and smaller */}
        {isChatOpen && (
          <div className="relative z-20 flex-shrink-0 p-4 pb-4">
            {/* Compact Chat Component - Smaller height */}
            <div className="h-72 max-h-[40vh] -mt-16">
              <CompactChat 
                key="compact-chat" 
                onClose={handleChatClose}
                sessionId={currentSession?.id || null}
              />
            </div>
          </div>
        )}

        {/* Debug components - only show in development */}
        {/* {process.env.NODE_ENV === 'development' && (
          <>
            <DebugSessionCreation />
            <DatabaseSaveTest />
            <ConferenceDataCheck />
          </>
        )} */}
      </div>
    </div>
  )
}