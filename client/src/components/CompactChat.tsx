"use client"
import { useEffect, useRef, useCallback, useState } from "react"
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
    console.log("🎤 Voice transcript update:", transcript)
    setVoiceTranscript(transcript)
  }, [])

  const handleVoiceInput = useCallback(
    async (text: string) => {
      console.log("🎤 ===== VOICE INPUT HANDLER CALLED =====")
      console.log("🎤 Received text:", text)

      if (!text.trim()) {
        console.log("🎤 ❌ Empty voice input, skipping")
        return
      }

      // Prevent bot from responding to its own speech
      if (isSpeaking) {
        console.log("🎤 ❌ Bot is speaking, ignoring voice input")
        return
      }

      const formattedText = formatMessage(text)
      console.log("🎤 ✅ Voice input formatted:", formattedText)

      // Check for duplicate
      if (isDuplicateMessage(formattedText)) {
        return
      }

      setIsVoiceInputActive(false)
      setVoiceTranscript("")

      // Send message with voice flag
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

    setIsVoiceInputActive(!isVoiceInputActive)
    if (isVoiceInputActive) {
      setVoiceTranscript("")
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

    // Reset voice input
    setIsVoiceInputActive(false)
    setVoiceTranscript("")
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

      if (isVoiceInputActive) {
        setIsVoiceInputActive(false)
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

  // Add this right before the return statement for debugging
  console.log("🤖 Bot States:", {
    isBotTyping,
    isBotThinking,
    isProcessing,
    isSpeaking,
    typingBotMsg: typingBotMsg,
    typingBotMsgLength: typingBotMsg?.length || 0,
    hasTimeout: !!thinkingTimeoutRef.current,
    messageCount: messageCountRef.current,
    lastMessage: lastMessageRef.current.substring(0, 50),
    sessionId,
  })

  return (
    <div className="flex flex-col h-full bg-black/30 backdrop-blur-3xl border border-indigo-500/20 rounded-2xl shadow-2xl shadow-indigo-500/5 overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-indigo-500/20">
        <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">
          Chat with Connie
        </h3>
        <div className="flex gap-2">
          {(isBotTyping || isProcessing || isBotThinking) && (
            <>
              <Button
                onClick={handleStopTyping}
                size="sm"
                variant="outline"
                className="!border-purple-400 text-purple-400 hover:bg-purple-500/10 hover:text-purple-200 bg-transparent backdrop-blur-sm text-sm h-8 px-3 animate-pulse"
              >
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            </>
          )}
          <div className="hidden md:block">
            <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} />
          </div>
          <Button
            onClick={onClose}
            size="sm"
            variant="outline"
            className="!border-indigo-400 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-200 bg-transparent backdrop-blur-sm text-sm h-8 px-3"
          >
            <Square className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Messages - Takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages
          messages={messages.map(msg => ({
            ...msg,
            sender: msg.sender
          }))}
          isThinking={isBotThinking}
          isBotTyping={isBotTyping}
          typingBotMsg={typingBotMsg}
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