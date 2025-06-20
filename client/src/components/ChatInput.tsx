// components/ChatInput.tsx
import { useState, useCallback, useEffect } from 'react';
import { VoiceSelector } from "@/components/VoiceSelector";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { OpenAIVoice } from "@/types/voice.types";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isProcessing: boolean;
  isVoiceInputActive: boolean;
  onVoiceInputToggle: () => void;
  selectedVoice: OpenAIVoice; // Changed from string to OpenAIVoice
  onVoiceChange: (voice: OpenAIVoice) => void; // Changed from string to OpenAIVoice
  voiceTranscript?: string;
}

export const ChatInput = ({
  onSubmit,
  isProcessing,
  isVoiceInputActive,
  onVoiceInputToggle,
  selectedVoice,
  onVoiceChange,
  voiceTranscript = ""
}: ChatInputProps) => {
  const [input, setInput] = useState("");

  // Update input when voice transcript changes
  useEffect(() => {
    if (isVoiceInputActive && voiceTranscript) {
      setInput(voiceTranscript);
    }
  }, [voiceTranscript, isVoiceInputActive]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const message = input.trim();
    setInput("");
    onSubmit(message);
  }, [input, isProcessing, onSubmit]);

  return (
    <div className="relative z-10 p-4 bg-black/20 backdrop-blur-sm border-t border-indigo-500/20">
      {/* Mobile Voice Selector */}
      <div className="md:hidden mb-3 flex justify-center">
        <VoiceSelector 
          selectedVoice={selectedVoice}
          onVoiceChange={onVoiceChange}
        />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isVoiceInputActive ? "Listening... speak now" : "Ask Connie anything about the conference..."}
          disabled={isProcessing || isVoiceInputActive}
          className={`flex-1 px-4 py-2 bg-gray-800 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
            isVoiceInputActive 
              ? "border-red-500 focus:ring-red-500 animate-pulse" 
              : "border-indigo-500/30"
          }`}
        />
        
        <MicrophoneButton
          isRecording={isVoiceInputActive}
          isProcessing={false}
          onToggle={onVoiceInputToggle}
          disabled={isProcessing}
        />
        
        <button
          type="submit"
          disabled={isProcessing || !input.trim() || isVoiceInputActive}
          className="px-6 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 text-white rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isProcessing ? 'Thinking...' : 'Send'}
        </button>
      </form>

      {/* Voice Input Status */}
      {isVoiceInputActive && (
        <div className="mt-2 text-green-400 text-sm animate-pulse text-center">
          🎤 Listening... (auto-sends after 2 seconds of silence)
        </div>
      )}
    </div>
  );
};