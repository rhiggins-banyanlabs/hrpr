"use client";
import { VoiceOrb } from "@/components/VoiceOrb";
import { VoiceButton } from "@/components/VoiceButton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSleepMode } from "@/hooks/useSleepMode";
import { useChatStorage } from "@/hooks/useChatStorage"; // NEW IMPORT
import Waves from "@/components/waves";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MorphingText } from "@/components/MorphingText";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'normal' | 'sleep'>('normal');
  const { startNewSession } = useChatStorage(); // NEW HOOK

  const handleConnieDetected = async (query: string) => {
    console.log("🏠 HOME: handleConnieDetected called with query:", query || "no query");
    
    try {
      // Don't create session here - let the chat page handle it
      // This prevents creating sessions that immediately get ended
      const encodedQuery = query ? encodeURIComponent(query) : encodeURIComponent("hey connie");
      
      console.log("🏠 HOME: Navigating to chat with query:", encodedQuery);
      router.push(`/chat?query=${encodedQuery}`);
      
    } catch (error) {
      console.error("🏠 HOME: Navigation error:", error);
      // Fallback: navigate without query
      router.push("/chat");
    }
  };

  const handleSleepWake = () => {
    console.log("🌅 Waking from sleep mode");
    handleConnieDetected("hey connie");
  };

  const [speechState, speechActions] = useSpeechRecognition(handleConnieDetected);
  const [sleepState, sleepActions] = useSleepMode(handleSleepWake);

  if (speechState.permissionError) {
    return <ErrorBoundary error={speechState.permissionError} />;
  }

  if (sleepState.error) {
    return <ErrorBoundary error={sleepState.error} />;
  }

  // Sleep Mode UI
  if (sleepState.isInSleepMode) {
    return (
      <div className="relative h-screen w-screen overflow-hidden flex flex-col items-center justify-center bg-black">
        <Waves
          lineColor="rgba(79, 70, 229, 0.3)"
          backgroundColor="black"
          waveSpeedX={0.01}
          waveSpeedY={0.005}
          waveAmpX={20}
          waveAmpY={10}
          friction={0.95}
          tension={0.005}
          maxCursorMove={60}
          xGap={16}
          yGap={48}
        />

        <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-4">
          <div className="text-center mb-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400/70 via-purple-500/70 to-blue-400/70">
              CONNIE
            </h1>
            <p className="text-sm sm:text-base mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300/70 via-purple-300/70 to-blue-300/70 ">
              Sleep Mode - Say "Hey Connie" to wake
            </p>
          </div>

          {/* Dimmed Orb for Sleep Mode */}
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 opacity-40">
            <VoiceOrb
              listening={sleepState.isListening}
              connieDetected={false}
              isNavigating={false}
            />
          </div>

          <div className="flex flex-col items-center gap-6">
            {/* Sleep Mode Controls */}
            <div className="flex gap-4">
              <button
                onClick={sleepActions.toggleListening}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  sleepState.isListening
                    ? 'bg-indigo-600/50 text-white hover:bg-indigo-600/70'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={sleepState.isListening 
                      ? "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                      : "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                    }
                  />
                </svg>
                {sleepState.isListening ? 'Listening...' : 'Start Listening'}
              </button>
                    
              <button
                onClick={sleepActions.exitSleepMode}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/50 text-white rounded-xl hover:bg-purple-600/70 transition-all duration-300 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
                  />
                </svg>
                Exit Sleep
              </button>
            </div>

            <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300/60 via-purple-300/60 to-blue-300/60 text-center max-w-md text-sm">
              Say "Hey Connie" to immediately go to chat
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal Mode UI (your existing beautiful UI)
  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col items-center justify-center bg-black">
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

      <div className="relative z-10 flex flex-col items-center justify-center gap-4">
        <div className="text-center mb-2">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400 mt-4">
            CONNIE
          </h1>
          <p className="text-lg sm:text-xl mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300">
            Your AI Event Assistant
          </p>
        </div>
      
        <VoiceOrb
          listening={speechState.listening}
          connieDetected={speechState.connieDetected}
          isNavigating={speechState.isNavigating}
        />
        <MorphingText
            texts={[
              "What is AIDA and how does it work?",
              "Can you tell me about the technology behind AIDA?",
              "What time is the keynote?",
              "How could AIDA help my organization?",
              "Can you tell me about the conference?",
              "What speakers are at the conference?"
            ]}
            className="-my-4 w-screen"
          />
        <div className="flex flex-col items-center gap-6">
          <VoiceButton
            listening={speechState.listening}
            isNavigating={speechState.isNavigating}
            connieDetected={speechState.connieDetected}
            onToggle={speechActions.toggleListening}
          />

          <div className="text-center">
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 max-w-md font-medium mb-2">
              Say{" "}
              <span className="text-lg font-bold">"Hey Connie"</span> for all your conference needs!
            </p>
         
            {/* Sleep Mode Button */}
            <button
              onClick={sleepActions.enterSleepMode}
              className="text-xs text-indigo-400/50 hover:text-indigo-300/70 transition-colors underline"
            >
              Enter Sleep Mode (always listening)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}