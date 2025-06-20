import { useState, useEffect, useRef, useCallback } from 'react';

interface SleepModeState {
  isInSleepMode: boolean;
  isListening: boolean;
  error: string | null;
}

interface SleepModeActions {
  enterSleepMode: () => void;
  exitSleepMode: () => void;
  toggleListening: () => void;
}

export const useSleepMode = (
  onWake: () => void
): [SleepModeState, SleepModeActions] => {
  const [isInSleepMode, setIsInSleepMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const hasWokenRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition during cleanup:', error);
      }
      recognitionRef.current = null;
    }
  }, []);

  const startSleepModeListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    // Clean up any existing recognition
    cleanup();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (!isMountedRef.current) return;
      console.log('🛌 Sleep mode listening started');
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event: any) => {
      if (!isMountedRef.current) return;
      console.error('🛌 Sleep mode speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors in sleep mode
        return;
      } else {
        setError(`Error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      console.log('🛌 Sleep mode listening ended');
      setIsListening(false);
      
      // Don't auto-restart unless explicitly in sleep mode and not woken
      if (isInSleepMode && !hasWokenRef.current) {
        setTimeout(() => {
          if (isMountedRef.current && isInSleepMode && !hasWokenRef.current) {
            startSleepModeListening();
          }
        }, 1000);
      }
    };

    recognition.onresult = (event: any) => {
      if (!isMountedRef.current || hasWokenRef.current) return;
      
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')
        .toLowerCase()
        .trim();

      console.log('🛌 Sleep mode heard:', transcript);

      // Check for wake phrases
      const wakeKeywords = ['hey connie', 'connie', 'hey cone', 'hey coney'];
      const shouldWake = wakeKeywords.some(keyword => transcript.includes(keyword));

      if (shouldWake) {
        console.log('👋 Wake phrase detected in sleep mode! Immediately transferring to chat...');
        hasWokenRef.current = true;
        
        // Stop recognition immediately and wake up
        recognition.stop();
        
        // Immediate transfer to chat
        if (isMountedRef.current) {
          setIsListening(false);
          setIsInSleepMode(false);
          onWake();
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('🛌 Error starting sleep mode recognition:', err);
      setError('Failed to start speech recognition. Please try again.');
    }
  }, [isInSleepMode, onWake, cleanup]);

  const enterSleepMode = useCallback(() => {
    console.log('🛌 Entering sleep mode');
    setIsInSleepMode(true);
    setError(null);
    hasWokenRef.current = false;
    
    // Auto-start listening when entering sleep mode
    setTimeout(() => {
      if (isMountedRef.current) {
        startSleepModeListening();
      }
    }, 500);
  }, [startSleepModeListening]);

  const exitSleepMode = useCallback(() => {
    console.log('🌅 Exiting sleep mode');
    setIsInSleepMode(false);
    hasWokenRef.current = false;
    cleanup();
  }, [cleanup]);

  const toggleListening = useCallback(() => {
    if (!isInSleepMode) return;
    
    if (isListening) {
      console.log('🛑 Manually stopping sleep mode listening');
      cleanup();
    } else {
      console.log('🎤 Manually starting sleep mode listening');
      startSleepModeListening();
    }
  }, [isInSleepMode, isListening, startSleepModeListening, cleanup]);

  return [
    {
      isInSleepMode,
      isListening,
      error,
    },
    {
      enterSleepMode,
      exitSleepMode,
      toggleListening,
    }
  ];
};