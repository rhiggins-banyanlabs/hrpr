"use client"
import React, { useEffect, useRef, useCallback, useState } from "react"
import { useOptimizedVoice } from "@/hooks/useOptimizedVoice"
import { useChat } from "@/hooks/useChat"
import { VoiceSelector } from "@/components/VoiceSelector"
import { ChatMessages } from "@/components/ChatMessages"
import { ChatInput } from "@/components/ChatInput"
import VoiceInput from "@/components/VoiceInput"
import { Button } from "@/components/ui/button"
import { Square, RotateCcw } from "lucide-react"

interface CompactChatProps {
  onClose: () => void
  sessionId: string | null
}

export function CompactChat({ onClose, sessionId }: CompactChatProps) {
  // Voice input state
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [isVoiceTranscribing, setIsVoiceTranscribing] = useState(false)

  // Refs for state management
  const hasPlayedIntroRef = useRef(false)
  const isProcessingVoiceQueryRef = useRef(false)
  const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageRef = useRef<string>("")
  const messageCountRef = useRef(0)

  // Voice hooks
  const { speakText, isSpeaking, selectedVoice, setSelectedVoice, unlockAudio } = useOptimizedVoice()

  // Chat hook - now uses the combined version
  const {
    messages,
    isBotTyping,
    isBotThinking,
    typingBotMsg,
    sendMessage,
    sendBotMessage,
    isProcessing,
    sendIntroMessage,
    stopTyping,
  } = useChat({
    speakText,
    unlockAudio,
    sessionId,
    selectedVoice,
  })

  console.log("🏗️ Compact Chat render - messages:", messages.length, "session:", sessionId)

  // Format message helper
  const formatMessage = (message: string) => {
    const trimmed = message.trim()
    if (!trimmed) return trimmed

    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    const endsWithPunctuation = /[.!?]$/.test(capitalized)
    const formatted = endsWithPunctuation ? capitalized : capitalized + "?"

    return formatted
  }

  // Prevent duplicate messages
  const isDuplicateMessage = useCallback((message: string) => {
    const isDupe = lastMessageRef.current === message
    if (isDupe) {
      console.log("🚫 Duplicate message detected, ignoring:", message)
    } else {
      lastMessageRef.current = message
      messageCountRef.current++
    }
    return isDupe
  }, [])

  // Voice handlers
  const handleVoiceTranscript = useCallback((transcript: string, isInterim: boolean) => {
    console.log("🎤 Voice transcript update:", transcript, "isInterim:", isInterim)
    setVoiceTranscript(transcript)
    
    // Set transcribing state when we start receiving any transcript
    if (transcript.trim() && !isVoiceTranscribing) {
      console.log("🎤 Starting voice transcription bubble")
      setIsVoiceTranscribing(true)
    }
    
    // If transcript becomes empty and we were transcribing, stop
    if (!transcript.trim() && isVoiceTranscribing) {
      console.log("🎤 Transcript empty, stopping transcription bubble")
      setIsVoiceTranscribing(false)
    }
  }, [isVoiceTranscribing])

  const handleVoiceInput = useCallback(
    async (text: string) => {
      console.log("🎤 ===== VOICE INPUT HANDLER CALLED =====")
      console.log("🎤 Received text:", text)

      // Clear transcribing state and voice transcript immediately
      setIsVoiceTranscribing(false)
      setVoiceTranscript("")

      if (!text.trim()) {
        console.log("🎤 ❌ Empty voice input, skipping")
        setIsVoiceInputActive(false)
        return
      }

      // Prevent bot from responding to its own speech
      if (isSpeaking) {
        console.log("🎤 ❌ Bot is speaking, ignoring voice input")
        setIsVoiceInputActive(false)
        return
      }

      const formattedText = formatMessage(text)
      console.log("🎤 ✅ Voice input formatted:", formattedText)

      // Check for duplicate
      if (isDuplicateMessage(formattedText)) {
        setIsVoiceInputActive(false)
        return
      }

      // Clear voice states
      setIsVoiceInputActive(false)

      // Auto-submit the message
      console.log("🎤 Auto-submitting voice message:", formattedText)
      await sendMessage(formattedText, true)
    },
    [sendMessage, isSpeaking, isDuplicateMessage],
  )

  const handleVoiceInputToggle = useCallback(() => {
    console.log("🎤 🔄 Voice input toggle called, current state:", isVoiceInputActive)

    // Don't allow voice input while bot is speaking
    if (isSpeaking) {
      console.log("🎤 ❌ Bot is speaking, not toggling voice input")
      return
    }

    const newState = !isVoiceInputActive
    setIsVoiceInputActive(newState)
    
    if (!newState) {
      // Stopping voice input - clear all related state immediately
      console.log("🎤 Clearing voice input state")
      setVoiceTranscript("")
      setIsVoiceTranscribing(false)
    } else {
      // Starting voice input - ensure clean state
      console.log("🎤 Starting voice input with clean state")
      setVoiceTranscript("")
      setIsVoiceTranscribing(false)
    }
  }, [isVoiceInputActive, isSpeaking])

  // Send intro message after session is ready
  useEffect(() => {
    const sendIntro = async () => {
      console.log("🎯 Intro message effect triggered:", {
        hasPlayedIntro: hasPlayedIntroRef.current,
        sessionId,
        messagesCount: messages.length
      })
      
      // Only send intro if we have a session and haven't sent it yet
      if (!hasPlayedIntroRef.current && sessionId) {
        hasPlayedIntroRef.current = true
        console.log("🎯 Session ready, sending intro message to session:", sessionId)

        // Wait a moment to ensure the session is fully ready
        await new Promise(resolve => setTimeout(resolve, 500))

        console.log("🎯 Sending intro message now")
        try {
          await sendIntroMessage()
          console.log("🎯 Intro message sent successfully")
        } catch (error) {
          console.error("🎯 Error sending intro message:", error)
        }
      }
    }

    sendIntro()
  }, [sessionId, sendIntroMessage])

  // Aggressive thinking state timeout - force clear after 15 seconds
  useEffect(() => {
    if (isBotThinking || isProcessing) {
      console.log("🤖 Bot started thinking/processing, setting 15s timeout")
      thinkingTimeoutRef.current = setTimeout(() => {
        console.log("⏰ FORCE STOPPING - Bot thinking timeout reached!")
        handleForceStop()
      }, 15000) // 15 second timeout
    } else {
      // Clear timeout when thinking stops
      if (thinkingTimeoutRef.current) {
        console.log("🤖 Bot stopped thinking, clearing timeout")
        clearTimeout(thinkingTimeoutRef.current)
        thinkingTimeoutRef.current = null
      }
    }

    return () => {
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current)
      }
    }
  }, [isBotThinking, isProcessing])

  // Monitor message changes to detect completion
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.sender === 'connie' && !isBotTyping && !isProcessing && !isBotThinking) {
        console.log("🤖 Bot message completed, ensuring all states are clear")
        isProcessingVoiceQueryRef.current = false

        // Clear any lingering timeout
        if (thinkingTimeoutRef.current) {
          clearTimeout(thinkingTimeoutRef.current)
          thinkingTimeoutRef.current = null
        }
      }
    }
  }, [messages, isBotTyping, isProcessing, isBotThinking])

  // Force stop function
  const handleForceStop = useCallback(() => {
    console.log("🛑 FORCE STOP - Clearing all bot states")
    stopTyping()
    isProcessingVoiceQueryRef.current = false

    // Clear timeout
    if (thinkingTimeoutRef.current) {
      clearTimeout(thinkingTimeoutRef.current)
      thinkingTimeoutRef.current = null
    }

    // Reset voice input and clear transcript
    console.log("🎤 Force stop - clearing all voice state")
    setIsVoiceInputActive(false)
    setVoiceTranscript("")
    setIsVoiceTranscribing(false)
  }, [stopTyping])

  // Add cleanup when component unmounts
  useEffect(() => {
    return () => {
      console.log("🧹 CompactChat unmounting, stopping any ongoing typing")
      handleForceStop()
    }
  }, [handleForceStop])

  // Handle message submission
  const handleMessageSubmit = useCallback(
    async (message: string) => {
      console.log("🔧 Compact chat handleMessageSubmit received:", message)

      // Check for duplicate
      if (isDuplicateMessage(message)) {
        return
      }

      // Clear voice input state when submitting text message
      if (isVoiceInputActive) {
        console.log("🎤 Clearing voice state due to text message submission")
        setIsVoiceInputActive(false)
        setIsVoiceTranscribing(false)
        setVoiceTranscript("")
      }

      await sendMessage(message, false) // Mark as text input
    },
    [sendMessage, isVoiceInputActive, isDuplicateMessage],
  )

  // Handle stop typing - more aggressive cleanup
  const handleStopTyping = useCallback(() => {
    console.log("🛑 Stop button clicked")
    handleForceStop()
  }, [handleForceStop])

  // Show loading if no session
  if (!sessionId) {
    return (
      <div className="flex flex-col h-full bg-black/30 backdrop-blur-3xl border border-indigo-500/20 rounded-2xl shadow-2xl shadow-indigo-500/5 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
            <p className="text-indigo-200">Creating session...</p>
          </div>
        </div>
      </div>
    )
  }

  // Create enhanced messages array that includes live voice transcription
  const enhancedMessages = React.useMemo(() => {
    const baseMessages = messages.map(msg => ({
      ...msg,
      sender: msg.sender
    }))

    // Add live voice transcription as a typing user message
    if (isVoiceTranscribing && voiceTranscript.trim()) {
      const voiceMessage = {
        id: 'voice-transcription-temp',
        text: voiceTranscript,
        sender: 'user' as const,
        timestamp: new Date(),
        isTemporary: true,
        isVoiceTranscription: true,
        isTyping: true 
      }
      return [...baseMessages, voiceMessage]
    }

    return baseMessages
  }, [messages, isVoiceTranscribing, voiceTranscript])

  // Add this right before the return statement for debugging
  console.log("🤖 Bot States:", {
    isBotTyping,
    isBotThinking,
    isProcessing,
    isSpeaking,
    isVoiceTranscribing,
    voiceTranscript: voiceTranscript.substring(0, 50),
    typingBotMsg: typingBotMsg,
    typingBotMsgLength: typingBotMsg?.length || 0,
    hasTimeout: !!thinkingTimeoutRef.current,
    messageCount: messageCountRef.current,
    lastMessage: lastMessageRef.current.substring(0, 50),
    sessionId,
  })

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto overflow-hidden">

      {/* Messages - Takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages
          messages={messages.filter(msg => !msg.isTemporary).map(msg => ({
            ...msg,
            sender: msg.sender
          }))}
          isThinking={isBotThinking}
          isBotTyping={isBotTyping}
          typingBotMsg={typingBotMsg}
          isUserTyping={isVoiceTranscribing}
          userTypingMsg={voiceTranscript}
        />
      </div>

      {/* Input - Fixed at bottom */}
      <div className="border-t border-indigo-500/20">
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
      </div>

      {/* Voice Input Component */}
      <VoiceInput
        onSpeechEnd={handleVoiceInput}
        onTranscriptUpdate={handleVoiceTranscript}
        isListening={isVoiceInputActive}
        onListeningChange={setIsVoiceInputActive}
      />
    </div>
  )
}