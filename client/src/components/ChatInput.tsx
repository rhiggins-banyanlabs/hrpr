import { useState, useCallback, useEffect } from 'react';
import { VoiceSelector, OpenAIVoice } from "@/features/voice";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { SuggestedQuestions } from "@/components/SuggestedQuestions";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isProcessing: boolean;
  isVoiceInputActive: boolean;
  onVoiceInputToggle: () => void;
  selectedVoice: OpenAIVoice;
  onVoiceChange: (voice: OpenAIVoice) => void;
  voiceTranscript?: string;
  isHarperSpeaking?: boolean;
  showMicrophoneButton?: boolean; // New prop to control microphone button visibility
}

export const ChatInput = ({
  onSubmit,
  isProcessing,
  isVoiceInputActive,
  onVoiceInputToggle,
  selectedVoice,
  onVoiceChange,
  voiceTranscript = "",
  isHarperSpeaking = false,
  showMicrophoneButton = true // Default to true for backwards compatibility
}: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [isConversationStarted, setIsConversationStarted] = useState(false);

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
    if (!input.trim() || isProcessing || isHarperSpeaking) return;

    const formattedMessage = formatMessage(input);
    console.log('🔧 Formatted message result:', formattedMessage);
    setInput("");
    setIsConversationStarted(true);
    console.log('🔧 About to call onSubmit with:', formattedMessage);
    onSubmit(formattedMessage);
  }, [input, isProcessing, isHarperSpeaking, onSubmit]);

  // Handle suggested question click - commented out as it's not currently used
  // const handleSuggestedClick = (question: string) => {
  //   console.log('🔧 handleSuggestedClick called with:', question);
  //   if (isHarperSpeaking) return;
  //   
  //   setInput("");
  //   setIsConversationStarted(true);
  //   const formattedQuestion = formatMessage(question);
  //   console.log('🔧 Formatted suggested question:', formattedQuestion);
  //   console.log('🔧 About to call onSubmit with:', formattedQuestion);
  //   onSubmit(formattedQuestion);
  // };

  return (
    <div className="relative z-10 p-4">
      {/* Only show microphone button if showMicrophoneButton is true */}
      {showMicrophoneButton && (
        <form onSubmit={handleSubmit} className="flex justify-center">
          <MicrophoneButton
            isRecording={isVoiceInputActive}
            isProcessing={false}
            onToggle={onVoiceInputToggle}
            disabled={isProcessing || isHarperSpeaking}
          />
        </form>
      )}

      {/* Voice input status - only show when microphone button is visible and voice input is active */}
      {showMicrophoneButton && isVoiceInputActive && (
        <div className="mt-2 text-green-400 text-sm animate-pulse text-center">
          🎤 Listening... (auto-sends after 2 seconds of silence)
        </div>
      )}

      {/* When microphone button is hidden, show helpful text about using the orb */}
      {!showMicrophoneButton && (
        <div className="text-center">
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 text-sm">
            {isVoiceInputActive ? (
              <span className="text-green-400 animate-pulse">🎤 Recording... (auto-sends after silence)</span>
            ) : (
              "Click the orb above to speak with Harper"
            )}
          </p>
        </div>
      )}
    </div>
  );
};