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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, isBotTyping, typingBotMsg]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      
      {messages.map((message) => (
        <div key={message.id} className="w-full">
          
          {/* USER MESSAGE */}
          {message.sender === 'user' && (
            <div className="flex justify-end mb-4">
              <div className="flex items-end space-x-3 z-50">
                <div className="bg-gradient-to-br from-indigo-400/20 via-blue-500/20 to-indigo-500/20 backdrop-blur-md border border-blue-400/30 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl transition-transform transform hover:scale-105">
                  <div className="font-semibold whitespace-pre-wrap">
                    {message.text}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                  U
                </div>
              </div>
            </div>
          )}

          {/* CONNIE MESSAGE */}
          {message.sender === 'connie' && (
            <div className="flex justify-start mb-4">
              <div className="flex items-start space-x-3 z-50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg">
                  C
                </div>
                <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-700/20 backdrop-blur-md border border-indigo-400/40 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl">
                  <div className="font-medium whitespace-pre-wrap">
                    {message.text}
                  </div>
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg">
              C
            </div>
            <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-700/20 backdrop-blur-md border border-indigo-400/40 text-white px-5 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-2xl">
              {isThinking ? (
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-500 animate-bounce" style={{ animationDelay: "0s" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-500 animate-bounce" style={{ animationDelay: "0.4s" }} />
                  <span className="text-xs text-gray-400 ml-2">Loading voice...</span>
                </div>
              ) : (
                <div className="font-medium">
                  {typingBotMsg && (
                    <span className="whitespace-pre-wrap">{typingBotMsg}</span>
                  )}
                  <span className="inline-block w-1 h-4 bg-indigo-400 ml-1 animate-pulse">|</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
