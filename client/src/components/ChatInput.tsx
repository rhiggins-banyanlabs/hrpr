import { useState, useCallback, useEffect } from 'react';
import { VoiceSelector } from "@/components/VoiceSelector";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { SuggestedQuestions } from "@/components/SuggestedQuestions";
import { OpenAIVoice } from "@/types/voice.types";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isProcessing: boolean;
  isVoiceInputActive: boolean;
  onVoiceInputToggle: () => void;
  selectedVoice: OpenAIVoice;
  onVoiceChange: (voice: OpenAIVoice) => void;
  voiceTranscript?: string;
  isConnieSpeaking?: boolean; // New prop to disable inputs while Connie speaks
}

export const ChatInput = ({
  onSubmit,
  isProcessing,
  isVoiceInputActive,
  onVoiceInputToggle,
  selectedVoice,
  onVoiceChange,
  voiceTranscript = "",
  isConnieSpeaking = false // New prop with default value
}: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [isConversationStarted, setIsConversationStarted] = useState(false); // Add this state

  useEffect(() => {
    if (isVoiceInputActive && voiceTranscript) {
      setInput(voiceTranscript);
    }
  }, [voiceTranscript, isVoiceInputActive]);

  // Format message: capitalize first letter and add question mark if needed
  const formatMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return trimmed;
    
    // Capitalize first letter
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    // Add question mark if it doesn't already end with punctuation
    const endsWithPunctuation = /[.!?]$/.test(capitalized);
    const formatted = endsWithPunctuation ? capitalized : capitalized + '?';
    
    // Debug log to see what's happening
    console.log('🔧 Formatting message:', { original: message, formatted });
    
    return formatted;
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔧 handleSubmit called with input:', input);
    if (!input.trim() || isProcessing || isConnieSpeaking) return;

    const formattedMessage = formatMessage(input);
    console.log('🔧 Formatted message result:', formattedMessage);
    setInput("");
    setIsConversationStarted(true);
    console.log('🔧 About to call onSubmit with:', formattedMessage);
    onSubmit(formattedMessage);
  }, [input, isProcessing, isConnieSpeaking, onSubmit]);

  // Handle suggested question click
  const handleSuggestedClick = (question: string) => {
    console.log('🔧 handleSuggestedClick called with:', question);
    if (isConnieSpeaking) return;
    
    setInput("");
    setIsConversationStarted(true);
    const formattedQuestion = formatMessage(question);
    console.log('🔧 Formatted suggested question:', formattedQuestion);
    console.log('🔧 About to call onSubmit with:', formattedQuestion);
    onSubmit(formattedQuestion);
  };

  return (
    <div className="relative z-10 p-4 ">
      

      <form onSubmit={handleSubmit} className="flex justify-center">
                
        <MicrophoneButton
          isRecording={isVoiceInputActive}
          isProcessing={false}
          onToggle={onVoiceInputToggle}
          disabled={isProcessing || isConnieSpeaking} // Add isConnieSpeaking
        />
      </form>

      {isVoiceInputActive && (
        <div className="mt-2 text-green-400 text-sm animate-pulse text-center">
          🎤 Listening... (auto-sends after 2 seconds of silence)
        </div>
      )}
    </div>
  );
};