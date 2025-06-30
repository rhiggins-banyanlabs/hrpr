"use client"
import { VoiceOrb } from "@/components/VoiceOrb"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useChatStorage } from "@/hooks/useChatStorage"
import Waves from "@/components/waves"
import { useState, useRef, useCallback, useEffect } from "react"
import { MorphingText } from "@/components/MorphingText"
import { VoiceButton } from "@/components/VoiceButton"
import { CompactChat } from "@/components/CompactChat"
import { ChatToggleButton } from "@/components/ToggleChatButton"
import { AdminButton } from "@/components/AdminButton"
import { useRouter } from "next/navigation"

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const router = useRouter()

  // Refs for state management
  const hasPlayedIntroRef = useRef(false)
  const isProcessingVoiceQueryRef = useRef(false)
  const initializationAttemptedRef = useRef(false)

  // Chat storage hook
  const { currentSession, startNewSession } = useChatStorage()

  const handleConnieDetected = async (query: string) => {
    console.log("🏠 HOME: handleConnieDetected called with query:", query || "no query")

    // Prevent multiple activations while processing
    if (isProcessingVoiceQueryRef.current) {
      console.log("🏠 Already processing voice query, ignoring")
      return
    }

    // Open chat first
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
  const handleChatToggle = useCallback(() => {
    console.log("🔘 Chat toggle clicked, current state:", isChatOpen)
    setIsChatOpen(!isChatOpen)
  }, [isChatOpen])

  const handleChatClose = useCallback(() => {
    console.log("🔄 Closing chat and resetting states")
    setIsChatOpen(false)

    // Additional cleanup when closing (redundant but safe)
    speechActions.resetStates()
    isProcessingVoiceQueryRef.current = false
    hasPlayedIntroRef.current = false
    initializationAttemptedRef.current = false
  }, [speechActions])


  if (speechState.permissionError) {
    return <ErrorBoundary error={speechState.permissionError} />
  }

  // Normal Mode UI with Integrated Chat
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-black">
      <ChatToggleButton isOpen={isChatOpen} onClick={handleChatToggle} />
      <AdminButton onClick={() => router.push("/admin")} />

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
              <CompactChat onClose={handleChatClose} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
