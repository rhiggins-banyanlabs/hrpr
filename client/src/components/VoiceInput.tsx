// components/VoiceInput.tsx
import { useEffect, useRef, useState } from 'react';

interface VoiceInputProps {
  onSpeechEnd: (text: string) => void;
  onTranscriptUpdate?: (transcript: string, isInterim: boolean) => void;
  isListening: boolean;
  onListeningChange: (isListening: boolean) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onSpeechEnd,
  onTranscriptUpdate,
  isListening,
  onListeningChange,
}) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [allText, setAllText] = useState('');
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ Speech Recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let sessionTranscript = '';
    
    recognition.onresult = (event: any) => {
      let current = '';
      let isFinal = false;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          current += event.results[i][0].transcript;
          isFinal = true;
        } else {
          current += event.results[i][0].transcript;
        }
      }
      
      const fullText = (allText + ' ' + current).trim();
      
      console.log('🎤 Speech result:', { current, fullText, isFinal });
      
      if (onTranscriptUpdate) {
        onTranscriptUpdate(fullText, !isFinal);
      }
      
      if (isFinal && current.trim()) {
        // Reset auto-send timer on final result
        if (autoSendTimerRef.current) {
          clearTimeout(autoSendTimerRef.current);
        }
        
        // Set auto-send for 2 seconds after final speech
        autoSendTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && fullText.length > 2) {
            console.log('🚀 Auto-sending after final speech:', fullText);
            finishAndSend(fullText);
          }
        }, 2000);
        
        setAllText(fullText);
      }
    };
    
    recognition.onend = () => {
      console.log('🎤 Recognition ended');
      if (isListening && isMountedRef.current) {
        console.log('🔄 Restarting recognition...');
        setTimeout(() => {
          if (isListening && isMountedRef.current) {
            const newRecognition = startRecognition();
            if (newRecognition) {
              recognitionRef.current = newRecognition;
            }
          }
        }, 100);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        alert('Please allow microphone access');
        onListeningChange(false);
        return;
      }
      
      if (event.error === 'audio-capture') {
        alert('No microphone detected. Please check your microphone.');
        onListeningChange(false);
        return;
      }
      
      // For other errors, just log them
      if (event.error !== 'no-speech' && event.error !== 'network') {
        console.warn('Speech recognition error:', event.error);
      }
    };
    
    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
    };
    
    try {
      recognition.start();
      return recognition;
    } catch (error) {
      console.error('❌ Failed to start recognition:', error);
      return null;
    }
  };

  const finishAndSend = (text: string) => {
    console.log('✅ Finishing and sending:', text);
    
    // Clear timers
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
    }
    
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Reset state
    setAllText('');
    
    // Send result
    if (text.trim()) {
      onSpeechEnd(text.trim());
    }
    onListeningChange(false);
  };

  useEffect(() => {
    if (isListening) {
      console.log('🎤 Starting voice input...');
      isMountedRef.current = true;
      setAllText('');
      
      const recognition = startRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
      } else {
        onListeningChange(false);
      }
      
    } else {
      console.log('🎤 Stopping voice input...');
      isMountedRef.current = false;
      
      // Clear timers
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
      
      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      
      setAllText('');
    }
    
    return () => {
      isMountedRef.current = false;
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, onListeningChange]);

  return null;
};

export default VoiceInput;