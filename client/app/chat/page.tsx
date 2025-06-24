// app/chat/page.tsx - Updated with proper storage integration
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimizedVoice } from "@/hooks/useOptimizedVoice";
import { useChat } from "@/hooks/useChat";
import { useChatStorage } from "@/hooks/useChatStorage";
import { VoiceSelector } from "@/components/VoiceSelector";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import VoiceInput from "@/components/VoiceInput";
import Waves from "@/components/waves";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Chat storage hook - UPDATED with loadSession and endSession
  const { 
    currentSession, 
    startNewSession, 
    logEvent,
    loadSession,  // ADD THIS
    endSession    // ADD THIS
  } = useChatStorage();
  
  // Voice input state
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  
  // Your existing hooks
  const { speakText, isSpeaking, selectedVoice, setSelectedVoice, unlockAudio } = useOptimizedVoice();
  
  // Pass session ID and selectedVoice to useChat
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
  } = useChat({ 
    speakText, 
    unlockAudio,
    sessionId: currentSession?.id || null,
    selectedVoice
  });

  // Refs for initialization
  const hasPlayedIntroRef = useRef(false);
  const isProcessingVoiceQueryRef = useRef(false);
  const sessionInitializedRef = useRef(false); // RENAMED from hasInitializedSessionRef

  console.log("🏗️ Chat page - messages:", messages.length, "session:", currentSession?.id);

  // Format message helper
  const formatMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return trimmed;
    
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    const endsWithPunctuation = /[.!?]$/.test(capitalized);
    const formatted = endsWithPunctuation ? capitalized : capitalized + '?';
    
    return formatted;
  };

  // Voice handlers
  const handleVoiceTranscript = useCallback((transcript: string, isInterim: boolean) => {
    console.log('🎤 Voice transcript update:', transcript);
    setVoiceTranscript(transcript);
  }, []);

  const handleVoiceInput = useCallback(async (text: string) => {
    console.log('🎤 ===== VOICE INPUT HANDLER CALLED =====');
    console.log('🎤 Received text:', text);
    
    if (!text.trim()) {
      console.log('🎤 ❌ Empty voice input, skipping');
      return;
    }
    
    const formattedText = formatMessage(text);
    console.log('🎤 ✅ Voice input formatted:', formattedText);
    
    setIsVoiceInputActive(false);
    setVoiceTranscript('');
    
    // Log voice input event
    if (currentSession) {
      await logEvent('voice_input', {
        transcript_length: text.length,
        formatted_text: formattedText
      });
    }
    
    // Send message with voice flag
    await sendMessage(formattedText, true);
  }, [sendMessage, currentSession, logEvent]);

  const handleVoiceInputToggle = useCallback(() => {
    console.log('🎤 🔄 Voice input toggle called, current state:', isVoiceInputActive);
    setIsVoiceInputActive(!isVoiceInputActive);
    if (isVoiceInputActive) {
      setVoiceTranscript('');
    }
  }, [isVoiceInputActive]);

  // UPDATED: Initialize session from URL or create new one
  useEffect(() => {
    const initializeSession = async () => {
      // Prevent multiple initializations
      if (sessionInitializedRef.current) return;
      
      const sessionId = searchParams.get('session');
      const query = searchParams.get('query');
      
      if (sessionId && !currentSession) {
        // Try to load existing session
        console.log("📝 Loading session from URL:", sessionId);
        const loaded = await loadSession(sessionId);
        if (loaded) {
          sessionInitializedRef.current = true;
        }
      } else if (!currentSession && !sessionId) {
        // Create a new session only if we don't have one
        console.log("📝 Creating new chat session");
        const newSession = await startNewSession({
          source: query ? 'voice_activation' : 'direct_navigation',
          initial_query: query || null,
          timestamp: new Date().toISOString()
        });
        
        if (newSession) {
          sessionInitializedRef.current = true;
          
          // Update URL to include session ID
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.set('session', newSession.id);
          router.replace(`/chat?${newSearchParams.toString()}`);
        }
      }
    };
    
    initializeSession();
  }, [searchParams, currentSession, startNewSession, loadSession, router]);

  // Send intro message after session is ready
  useEffect(() => {
    if (!hasPlayedIntroRef.current && currentSession?.id) {
      hasPlayedIntroRef.current = true;
      console.log("🎯 Session ready, sending intro message");
      setTimeout(() => {
        sendIntroMessage();
      }, 500);
    }
  }, [currentSession, sendIntroMessage]);

  // Handle voice query from URL after session is ready
  useEffect(() => {
    const query = searchParams.get('query');
    
    if (query && !isProcessingVoiceQueryRef.current && currentSession?.id) {
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
          sendMessage(query, true); // Mark as voice input
        }
      }, 2000);
    }
  }, [searchParams, sendMessage, currentSession]);

  // UPDATED: Handle back to home - DON'T end the session
  const handleBackToHome = useCallback(() => {
    stopTyping();
    // Don't end session here - let it stay active
    // Sessions should only end when explicitly closed or on page unload
    router.push("/");
  }, [router, stopTyping]);

  // NEW: Add a proper session end handler (optional - for an "End Chat" button if you want one)
  const handleEndChat = useCallback(async () => {
    if (currentSession?.id) {
      await endSession();
      router.push("/");
    }
  }, [currentSession, endSession, router]);

  // Handle message submission
  const handleMessageSubmit = useCallback(async (message: string) => {
    console.log('🔧 Main page handleMessageSubmit received:', message);
    
    if (isVoiceInputActive) {
      setIsVoiceInputActive(false);
    }
    
    await sendMessage(message, false); // Mark as text input
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

      {/* Messages */}
      <ChatMessages 
        messages={messages}
        isThinking={isBotThinking}
        isBotTyping={isBotTyping}
        typingBotMsg={typingBotMsg}
      />

      {/* Input */}
      <ChatInput
        onSubmit={handleMessageSubmit}
        isProcessing={isProcessing}
        isVoiceInputActive={isVoiceInputActive}
        onVoiceInputToggle={handleVoiceInputToggle}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        voiceTranscript={voiceTranscript}
        isConnieSpeaking={isSpeaking}
      />

      {/* Voice Input Component */}
      <VoiceInput
        onSpeechEnd={handleVoiceInput}
        onTranscriptUpdate={handleVoiceTranscript}
        isListening={isVoiceInputActive}
        onListeningChange={setIsVoiceInputActive}
      />

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-20 right-4 text-xs text-gray-500 bg-black/50 p-2 rounded">
          Session: {currentSession?.id?.substring(0, 8) || 'None'}
        </div>
      )}
    </div>
  );
}