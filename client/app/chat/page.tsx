// app/chat/page.tsx - FIXED VERSION with proper session management
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimizedVoice } from "@/hooks/useOptimizedVoice";
import { useChat } from "@/hooks/useChat";
import { useChatStorage } from "@/hooks/useChatStorage";
import { VoiceSelector, VoiceInput } from "@/features/voice";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import Waves from "@/components/waves";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Chat storage hook
  const { 
    currentSession, 
    startNewSession, 
    logEvent,
    loadSession,
    endSession
  } = useChatStorage();
  
  // Voice input state
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  
  // Voice hooks
  const { speakText, isSpeaking, selectedVoice, setSelectedVoice, unlockAudio } = useOptimizedVoice();
  
  // Chat hook - gets session ID from storage
  const {
    messages,
    isBotTyping,
    isBotThinking,
    typingBotMsg,
    sendMessage,
    isProcessing,
    sendIntroMessage,
    stopTyping
  } = useChat({ 
    speakText, 
    unlockAudio,
    sessionId: currentSession?.id || null,
    selectedVoice
  });

  // Refs for state management - FIXED to prevent duplicate initialization
  const hasPlayedIntroRef = useRef(false);
  const isProcessingVoiceQueryRef = useRef(false);
  const initializationAttemptedRef = useRef(false); // Track if we've tried to initialize

  console.log("🏗️ Chat page render - messages:", messages.length, "session:", currentSession?.id);

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
  const handleVoiceTranscript = useCallback((transcript: string) => {
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

  // FIXED: Proper session initialization with duplicate prevention
  useEffect(() => {
    const initializeSession = async () => {
      // Prevent multiple initialization attempts
      if (initializationAttemptedRef.current) {
        console.log('🔒 Session initialization already attempted, skipping');
        return;
      }

      initializationAttemptedRef.current = true;
      
      const sessionId = searchParams.get('session');
      const query = searchParams.get('query');
      
      console.log('🎯 Initializing session - sessionId from URL:', sessionId, 'query:', query);
      console.log('🎯 Current session state:', currentSession?.id);
      
      // If we already have a session, don't create another one
      if (currentSession?.id) {
        console.log("✅ Session already exists, no need to initialize:", currentSession.id);
        return;
      }
      
      if (sessionId) {
        // Try to load existing session from URL
        console.log("📝 Loading existing session from URL:", sessionId);
        const loaded = await loadSession(sessionId);
        
        if (!loaded) {
          console.log("❌ Failed to load session from URL, but NOT creating new one");
          // Don't create a new session if loading fails - just continue without session
          // The user can refresh or start a new chat
        }
      } else {
        // Only create a new session if there's no session ID in URL
        console.log("📝 No session ID in URL, creating new chat session");
        const newSession = await startNewSession({
          source: query ? 'voice_activation' : 'direct_navigation',
          initial_query: query || null,
          timestamp: new Date().toISOString()
        });
        
        if (newSession) {
          // Update URL to include session ID
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.set('session', newSession.id);
          router.replace(`/chat?${newSearchParams.toString()}`);
        }
      }
    };
    
    initializeSession();
  }, [searchParams]); // FIXED: Minimal dependencies to prevent re-runs

  // Send intro message after session is ready - FIXED to prevent duplicates
  useEffect(() => {
    if (!hasPlayedIntroRef.current && currentSession?.id) {
      hasPlayedIntroRef.current = true;
      console.log("🎯 Session ready, sending intro message to session:", currentSession.id);
      
      // Small delay to ensure session is fully ready
      setTimeout(() => {
        sendIntroMessage();
      }, 500);
    }
  }, [currentSession?.id, sendIntroMessage]); // FIXED: Only depend on session ID

  // Handle voice query from URL - FIXED to prevent duplicates
  useEffect(() => {
    const query = searchParams.get('query');
    
    if (query && 
        !isProcessingVoiceQueryRef.current && 
        currentSession?.id && 
        hasPlayedIntroRef.current) { // Wait for intro to be sent first
      
      isProcessingVoiceQueryRef.current = true;
      console.log("🔍 Processing voice query:", query);
      
      // Wait for intro message to complete
      setTimeout(() => {
        const isJustGreeting = !query || 
                              query.toLowerCase() === 'hey Harper' ||
                              query.toLowerCase() === 'Harper' ||
                              query.toLowerCase().includes('hello') ||
                              query.toLowerCase().includes('hi') ||
                              query.trim().length < 3;

        if (!isJustGreeting) {
          console.log("🔍 Processing actual question:", query);
          sendMessage(query, true); // Mark as voice input
        } else {
          console.log("🔍 Just a greeting, intro message is sufficient");
        }
      }, 2000); // Wait for intro to complete
    }
  }, [searchParams, sendMessage, currentSession?.id, hasPlayedIntroRef.current]);

  // Clean up session when page unloads or component unmounts
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSession?.id) {
        console.log('🔚 Page unloading, ending session:', currentSession.id);
        // Use sendBeacon for reliable cleanup on page unload
        const url = `/api/end-session`;
        const data = JSON.stringify({ sessionId: currentSession.id });
        navigator.sendBeacon(url, data);
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (currentSession?.id) {
        console.log('🔚 Component unmounting, ending session:', currentSession.id);
        endSession();
      }
    };
  }, [currentSession, endSession]);

  // Handle back to home
  const handleBackToHome = useCallback(async () => {
    stopTyping();
    // End the session when navigating away
    if (currentSession?.id) {
      console.log('🔚 Ending session before navigation:', currentSession.id);
      await endSession();
    }
    router.push("/");
  }, [router, stopTyping, currentSession, endSession]);

  // Handle explicit session end - commented out as it's not currently used
  // const handleEndChat = useCallback(async () => {
  //   if (currentSession?.id) {
  //     await endSession();
  //     router.push("/");
  //   }
  // }, [currentSession, endSession, router]);

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
          Chat with Harper
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
        isHarperSpeaking={isSpeaking}
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
          <div>Session: {currentSession?.id?.substring(0, 8) || 'None'}</div>
          <div>Active: {currentSession?.is_active ? 'Yes' : 'No'}</div>
          <div>Messages: {messages.length}</div>
        </div>
      )}
    </div>
  );
}