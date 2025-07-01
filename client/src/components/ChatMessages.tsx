"use client"
import { useEffect, useRef } from "react"
import { FeedbackButtons } from "@/components/FeedbackButtons"

interface Message {
  id: string
  text: string
  sender: "user" | "connie"
  timestamp: Date
  isTyping?: boolean
  isIntro?: boolean // Add this to identify intro messages
}

interface ChatMessagesProps {
  messages: Message[]
  isThinking: boolean
  isBotTyping?: boolean
  typingBotMsg?: string | null
  sessionId?: string // Add sessionId prop
}

export const ChatMessages = ({
  messages = [],
  isThinking = false,
  isBotTyping = false,
  typingBotMsg = null,
  sessionId,
}: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking, isBotTyping, typingBotMsg])

  return (
    <div
      ref={containerRef}
      className="chat-messages flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
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
              <div className="flex items-end space-x-3 z-50">
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

          {/* CONNIE MESSAGE */}
          {message.sender === "connie" && (
            <div className="flex justify-start mb-4">
              <div className="flex items-start space-x-3 z-50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                  <span className="text-sm">C</span>
                </div>
                <div>
                  <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-700/20 backdrop-blur-md border border-indigo-400/40 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl">
                    <div className="font-medium whitespace-pre-wrap text-sm">{message.text}</div>
                  </div>
                  {/* Add feedback buttons for Connie's messages */}
                  {sessionId && (
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

      {/* BOT TYPING / THINKING */}
      {(isBotTyping || isThinking) && (
        <div className="flex justify-start mb-4">
          <div className="flex items-start space-x-3 z-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 animate-pulse">
              <span className="text-sm">C</span>
            </div>
            <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-700/20 backdrop-blur-md border border-indigo-400/40 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl">
              {isThinking ? (
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
                <div className="font-medium text-sm">
                  {typingBotMsg && <span className="whitespace-pre-wrap">{typingBotMsg}</span>}
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