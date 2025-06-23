"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimizedVoice } from "@/hooks/useOptimizedVoice"; // Use optimized TTS
import { useChat } from "@/hooks/useChat"; // Your existing chat hook
import { VoiceSelector } from "@/components/VoiceSelector";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import VoiceInput from "@/components/VoiceInput";
import Waves from "@/components/waves";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Voice input state (matching your original pattern)
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  
  // Your existing hooks (keeping your separation of concerns)
  const { speakText, isSpeaking, selectedVoice, setSelectedVoice, unlockAudio } = useOptimizedVoice();
  
  const {
    messages,
    isBotTyping,
    isBotThinking,
    typingBotMsg,
    sendMessage,
    sendBotMessage,
    isProcessing,
    sendIntroMessage,
    stopTyping
  } = useChat({ speakText, unlockAudio });

  // Refs for initialization
  const hasPlayedIntroRef = useRef(false);
  const isProcessingVoiceQueryRef = useRef(false);

  console.log("🏗️ Optimized Chat page - messages:", messages.length);

  // Voice handlers (keeping your exact pattern)
  const handleVoiceTranscript = useCallback((transcript: string, isInterim: boolean) => {
    console.log('🎤 Voice transcript update:', transcript);
    setVoiceTranscript(transcript);
  }, []);

  // Format message: capitalize first letter and add question mark if needed
  const formatMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return trimmed;
    
    // Capitalize first letter
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    // Add question mark if it doesn't already end with punctuation
    const endsWithPunctuation = /[.!?]$/.test(capitalized);
    const formatted = endsWithPunctuation ? capitalized : capitalized + '?';
    
    console.log('🔧 Main page formatting message:', { original: message, formatted });
    
    return formatted;
  };

  const handleVoiceInput = useCallback(async (text: string) => {
    console.log('🎤 ===== VOICE INPUT HANDLER CALLED =====');
    console.log('🎤 Received text:', text);
    
    if (!text.trim()) {
      console.log('🎤 ❌ Empty voice input, skipping');
      return;
    }
    
    // Format the voice input message
    const formattedText = formatMessage(text);
    console.log('🎤 ✅ Voice input formatted:', formattedText);
    
    setIsVoiceInputActive(false);
    setVoiceTranscript('');
    
    // Call your useChat sendMessage function with formatted text
    console.log('🎤 📞 Calling sendMessage with formatted voice input');
    await sendMessage(formattedText);
  }, [sendMessage]);

  const handleVoiceInputToggle = useCallback(() => {
    console.log('🎤 🔄 Voice input toggle called, current state:', isVoiceInputActive);
    setIsVoiceInputActive(!isVoiceInputActive);
    if (isVoiceInputActive) {
      setVoiceTranscript('');
    }
  }, [isVoiceInputActive]);

  // Send intro message on mount
  useEffect(() => {
    if (!hasPlayedIntroRef.current) {
      hasPlayedIntroRef.current = true;
      setTimeout(() => {
        sendIntroMessage();
      }, 500);
    }
  }, [sendIntroMessage]);

  // Handle voice query from URL
  useEffect(() => {
    const query = searchParams.get('query');
    
    if (query && !isProcessingVoiceQueryRef.current) {
      isProcessingVoiceQueryRef.current = true;
      console.log("🔍 Processing voice query:", query);
      
      setTimeout(() => {
        const isJustGreeting = !query || 
                              query.toLowerCase() === 'hey connie' ||
                              query.toLowerCase() === 'connie' ||
                              query.toLowerCase().includes('hello') ||
                              query.toLowerCase().includes('hi') ||
                              query.trim().length < 3;

        if (!isJustGreeting) {
          console.log("🔍 Processing actual question:", query);
          sendMessage(query);
        }
      }, 2000);
    }
  }, [searchParams, sendMessage]);

  // Handle back to home
  const handleBackToHome = useCallback(() => {
    stopTyping();
    router.push("/");
  }, [router, stopTyping]);

  // Handle message submission
  const handleMessageSubmit = useCallback(async (message: string) => {
    console.log('🔧 Main page handleMessageSubmit received:', message);
    
    // Stop voice input if active
    if (isVoiceInputActive) {
      setIsVoiceInputActive(false);
    }
    
    // Don't format here - the formatting should already be done in ChatInput
    await sendMessage(message);
  }, [sendMessage, isVoiceInputActive]);

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-black">
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

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm border-b border-indigo-500/20">
        <button
          onClick={handleBackToHome}
          className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
        >
          ← Back to Home
        </button>
        
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">
          Chat with Connie
          {isSpeaking && (
            <span className="ml-2 text-sm text-green-400 animate-pulse">
              🔊 Speaking
            </span>
          )}
        </h1>
        
        {/* Desktop Voice Selector */}
        <div className="hidden md:block">
          <VoiceSelector 
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
          />
        </div>
        <div className="md:hidden w-16"></div>
      </div>


      {/* Messages - Using your separated component */}
      <ChatMessages 
        messages={messages}
        isThinking={isBotThinking}
        isBotTyping={isBotTyping}
        typingBotMsg={typingBotMsg}
      />

      {/* Input - Using your separated component */}
      <ChatInput
        onSubmit={handleMessageSubmit}
        isProcessing={isProcessing}
        isVoiceInputActive={isVoiceInputActive}
        onVoiceInputToggle={handleVoiceInputToggle}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        voiceTranscript={voiceTranscript}
        isConnieSpeaking={isSpeaking} // Add this line - use the isSpeaking from your voice hook
      />

      {/* Voice Input Component - Your working demo component */}
      <VoiceInput
        onSpeechEnd={handleVoiceInput}
        onTranscriptUpdate={handleVoiceTranscript}
        isListening={isVoiceInputActive}
        onListeningChange={setIsVoiceInputActive}
      />

    </div>
  );
}