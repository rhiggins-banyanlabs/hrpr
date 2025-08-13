import React, { useState, useEffect, useCallback } from 'react';
import VoiceInputWebSpeech from './VoiceInput';
import VoiceInputWhisper from './VoiceInputWhisper';

interface VoiceInputSmartProps {
  onSpeechEnd: (text: string) => void;
  onTranscriptUpdate?: (transcript: string, isInterim: boolean) => void;
  isListening: boolean;
  onListeningChange: (isListening: boolean) => void;
  onError?: (error: string) => void;
  preferWhisper?: boolean; // Allow manual override
}

const VoiceInputSmart: React.FC<VoiceInputSmartProps> = ({
  onSpeechEnd,
  onTranscriptUpdate,
  isListening,
  onListeningChange,
  onError,
  preferWhisper = false,
}) => {
  const [useWhisper, setUseWhisper] = useState<boolean>(false);
  const [webSpeechFailed, setWebSpeechFailed] = useState<boolean>(false);

  // Detect best voice input method for the device
  useEffect(() => {
    const detectBestMethod = () => {
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      
      // Check if Web Speech API is available
      const hasWebSpeech = !!(
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition
      );

      console.log('🎤 Smart Voice Input Detection:');
      console.log('  - iOS:', isIOS);
      console.log('  - Android:', isAndroid);
      console.log('  - Safari:', isSafari);
      console.log('  - Web Speech API:', hasWebSpeech);
      console.log('  - Prefer Whisper:', preferWhisper);
      console.log('  - Web Speech Failed:', webSpeechFailed);

      // Decision logic:
      // 1. If user prefers Whisper, use it
      // 2. If Web Speech API failed before, fallback to Whisper
      // 3. If no Web Speech API, use Whisper
      // 4. Otherwise, try Web Speech API first (native and faster)
      
      if (preferWhisper || webSpeechFailed || !hasWebSpeech) {
        console.log('🎤 Using Whisper-based voice input');
        setUseWhisper(true);
      } else {
        console.log('🎤 Using Web Speech API');
        setUseWhisper(false);
      }
    };

    detectBestMethod();
  }, [preferWhisper, webSpeechFailed]);

  // Handle Web Speech API errors and fallback to Whisper
  const handleWebSpeechError = useCallback((error: string) => {
    console.log('🎤 Web Speech API error, considering fallback to Whisper:', error);
    
    // Check if this is a fatal error that should trigger fallback
    const isFatalError = error.includes('not supported') || 
                        error.includes('not available') ||
                        error.includes('requires HTTPS');
    
    if (isFatalError && !webSpeechFailed) {
      console.log('🎤 Fatal Web Speech error, switching to Whisper');
      setWebSpeechFailed(true);
      setUseWhisper(true);
      
      // Add fallback message to the error
      const fallbackError = `${error} Switching to backup voice input method...`;
      if (onError) onError(fallbackError);
      
      // Don't propagate the original error since we're handling it
      return;
    }
    
    // For non-fatal errors, pass through to parent
    if (onError) onError(error);
  }, [webSpeechFailed, onError]);

  // Handle Whisper errors
  const handleWhisperError = useCallback((error: string) => {
    console.log('🎤 Whisper error:', error);
    if (onError) onError(error);
  }, [onError]);

  if (useWhisper) {
    return (
      <VoiceInputWhisper
        onSpeechEnd={onSpeechEnd}
        onTranscriptUpdate={onTranscriptUpdate}
        isListening={isListening}
        onListeningChange={onListeningChange}
        onError={handleWhisperError}
      />
    );
  }

  return (
    <VoiceInputWebSpeech
      onSpeechEnd={onSpeechEnd}
      onTranscriptUpdate={onTranscriptUpdate}
      isListening={isListening}
      onListeningChange={onListeningChange}
      onError={handleWebSpeechError}
    />
  );
};

export default VoiceInputSmart;
