"use client"
import { useEffect, useRef, useState } from "react"
import { FeedbackButtons } from "@/components/FeedbackButtons"

interface Message {
  id: string
  text: string
  sender: "user" | "Harper"
  timestamp: Date
  isTyping?: boolean
  isIntro?: boolean // Add this to identify intro messages
  isTemporary?: boolean
  isVoiceTranscription?: boolean
}

interface ChatMessagesProps {
  messages: Message[]
  isThinking: boolean
  isBotTyping?: boolean
  typingBotMsg?: string | null
  sessionId?: string // Add sessionId prop
  isUserTyping?: boolean
  userTypingMsg?: string
}

// Simple markdown formatter for real-time typing
const formatMarkdown = (text: string): string => {
  return text
    // Bold text **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic text *text* or _text_
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Code blocks ```code```
    .replace(/```(.*?)```/gs, '<code class="block bg-gray-800 text-green-400 p-2 rounded mt-1 mb-1 font-mono text-xs">$1</code>')
    // Inline code `code`
    .replace(/`(.*?)`/g, '<code class="bg-gray-800 text-green-400 px-1 rounded font-mono text-xs">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>')
}

export const ChatMessages = ({
  messages = [],
  isThinking = false,
  isBotTyping = false,
  typingBotMsg = null,
  sessionId,
  isUserTyping = false,
  userTypingMsg = "",
}: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking, isBotTyping, typingBotMsg, isUserTyping, userTypingMsg])

  const toggleFeedback = (id: string) => {
    setActiveFeedbackId((prev) => (prev === id ? null : id))
  }

  return (
    <div
      ref={containerRef}
      id="chat-messages"
      className="scrollbar-hide flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      style={{
        maxHeight: "100%",
        scrollbarGutter: "stable",
      }}
    >
      {messages.map((message) => (
        <div key={message.id} className="w-full">
          {/* USER MESSAGE */}
          {message.sender === "user" && (
            <div className="flex justify-end mb-4">
              <div  className="flex items-end space-x-3 z-50">
                <div className="bg-gradient-to-br from-indigo-400/20 via-blue-500/20 to-indigo-500/20 backdrop-blur-md border border-blue-400/30 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl transition-transform transform hover:scale-105">
                  <div className="font-semibold whitespace-pre-wrap text-sm">{message.text}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Harper MESSAGE */}
          {message.sender === "Harper" && (
            <div className="flex justify-start mb-4">
              <div onMouseEnter={() => toggleFeedback(message.id)} onMouseLeave={() => toggleFeedback(message.id)} onClick={() => toggleFeedback(message.id)} className="flex items-start space-x-3 z-50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                  <span className="text-sm">C</span>
                </div>
                <div>
                  <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-700/20 backdrop-blur-md border border-indigo-400/40 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl">
                    <div 
                    className="font-medium whitespace-pre-wrap text-sm"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(message.text)
                    }}
                  />
                  </div>
                  {/* Add feedback buttons for Harper's messages */}
                  {sessionId && message.id ===activeFeedbackId && (
                    <FeedbackButtons 
                      messageId={message.id} 
                      sessionId={sessionId}
                      isIntroMessage={message.isIntro}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* USER TYPING (Voice Transcription) - Clean like bot typing */}
      {isUserTyping && userTypingMsg && (
        <div className="flex justify-end mb-4">
          <div className="flex items-end space-x-3 z-50">
            <div className="bg-gradient-to-br from-indigo-400/20 via-blue-500/20 to-indigo-500/20 backdrop-blur-md border border-blue-400/30 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl">
              <div className="font-semibold whitespace-pre-wrap text-sm">
                {userTypingMsg}
                <span className="inline-block w-0.5 h-3 bg-blue-400 ml-1 animate-pulse">|</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* BOT TYPING / THINKING - Smooth transition without bubble disappearing */}
      {(isBotTyping || isThinking) && (
        <div className="flex justify-start mb-4">
          <div className="flex items-start space-x-3 z-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 animate-pulse">
              <span className="text-sm">C</span>
            </div>
            <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-700/20 backdrop-blur-md border border-indigo-400/40 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl">
              {isThinking && !isBotTyping ? (
                // Only show thinking dots when purely thinking (no typing content yet)
                <div className="flex items-center space-x-2">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-500 animate-bounce"
                    style={{ animationDelay: "0s" }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-500 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-500 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                  <span className="text-xs text-gray-400 ml-2">Thinking...</span>
                </div>
              ) : (
                // Show typing content with markdown formatting
                <div className="font-medium text-sm">
                  <span
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(typingBotMsg || "")
                    }}
                  />
                  <span className="inline-block w-0.5 h-3 bg-indigo-400 ml-1 animate-pulse">|</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}