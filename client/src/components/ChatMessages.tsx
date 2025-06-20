// components/ChatMessages.tsx
import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'connie';
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatMessagesProps {
  messages: Message[];
  isThinking: boolean;
  isBotTyping?: boolean;
  typingBotMsg?: string | null;
}

export const ChatMessages = ({ messages = [], isThinking = false, isBotTyping = false, typingBotMsg = null }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Safe logging without potential hydration issues
  console.log('💬 ChatMessages render:', {
    messageCount: messages.length,
    isThinking,
    isBotTyping
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, isBotTyping, typingBotMsg]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      
      {messages.map((message) => (
        <div key={message.id} className="w-full">
          
          {/* USER MESSAGE - Blue bubble on right */}
          {message.sender === 'user' && (
            <div className="flex justify-end mb-4">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg max-w-xs lg:max-w-md shadow-lg">
                <div className="text-white font-medium">
                  {message.text}
                </div>
              </div>
            </div>
          )}
          
          {/* CONNIE MESSAGE - Dark bubble on left with avatar */}
          {message.sender === 'connie' && (
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div className="bg-white/10 text-white p-3 rounded-lg max-w-xs lg:max-w-md border border-indigo-400/50 backdrop-blur-sm">
                <div className="text-white font-medium whitespace-pre-wrap">
                  {message.text}
                </div>
              </div>
            </div>
          )}
          
        </div>
      ))}

      {/* Bot thinking/typing indicator */}
      {(isBotTyping || isThinking) && (
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div className="bg-white/10 text-white p-3 rounded-lg max-w-xs lg:max-w-md border border-indigo-400/50 backdrop-blur-sm">
            {isThinking ? (
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                <span className="text-xs text-gray-400 ml-2">Loading voice...</span>
              </div>
            ) : (
              <div className="text-white font-medium">
                {typingBotMsg && (
                  <span className="whitespace-pre-wrap">{typingBotMsg}</span>
                )}
                <span className="inline-block w-1 h-4 bg-indigo-400 ml-1 animate-pulse">|</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};