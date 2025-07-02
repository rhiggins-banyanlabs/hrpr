import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  hasFinishedSpeaking: boolean;
}

interface SpeechRecognitionActions {
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
  resetError: () => void;
}

interface UseSpeechRecognitionOptions {
  onTranscriptUpdate?: (transcript: string, isInterim: boolean) => void;
  onComplete?: (transcript: string) => void;
  autoStopDelay?: number;
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): [SpeechRecognitionState, SpeechRecognitionActions] => {
  const {
    onTranscriptUpdate,
    onComplete,
    autoStopDelay = 2000,
    continuous = true,
    interimResults = true,
    language = 'en-US'
  } = options;

  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isSupported: typeof window !== 'undefined' && 'webkitSpeechRecognition' in window,
    hasFinishedSpeaking: false
  });

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualStopRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      console.log('🎤 Silence timeout - stopping recognition');
      finishRecognition();
    }, autoStopDelay);
  }, [autoStopDelay, clearSilenceTimer]);

  const finishRecognition = useCallback(() => {
    if (!recognitionRef.current) return;

    const finalText = (finalTranscriptRef.current + ' ' + interimTranscriptRef.current).trim();
    
    setState(prev => ({
      ...prev,
      isListening: false,
      isProcessing: false,
      transcript: finalText,
      interimTranscript: '',
      hasFinishedSpeaking: true
    }));

    if (finalText && onComplete) {
      onComplete(finalText);
    }

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.warn('Error stopping recognition:', error);
    }
  }, [onComplete]);

  const initializeRecognition = useCallback(() => {
    if (!state.isSupported) return;

    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setState(prev => ({ ...prev, isListening: true, error: null }));
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update refs
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
        }
        interimTranscriptRef.current = interimTranscript;

        // Update state
        setState(prev => ({
          ...prev,
          transcript: finalTranscriptRef.current,
          interimTranscript: interimTranscript
        }));

        // Call update callback
        if (onTranscriptUpdate) {
          onTranscriptUpdate(finalTranscriptRef.current + ' ' + interimTranscript, !finalTranscript);
        }

        // Reset silence timer on new speech
        if (finalTranscript || interimTranscript) {
          startSilenceTimer();
        }
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 Speech recognition error:', event.error);
        setState(prev => ({
          ...prev,
          error: `Recognition error: ${event.error}`,
          isListening: false,
          isProcessing: false
        }));
        clearSilenceTimer();
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        setState(prev => ({ ...prev, isListening: false, isProcessing: false }));
        clearSilenceTimer();
        
        if (!isManualStopRef.current && state.isListening) {
          // Restart if it ended unexpectedly
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        }
        isManualStopRef.current = false;
      };

      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setState(prev => ({ ...prev, error: 'Failed to initialize speech recognition' }));
    }
  }, [state.isSupported, continuous, interimResults, language, onTranscriptUpdate, startSilenceTimer, clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!state.isSupported) return;
    
    if (!recognitionRef.current) {
      initializeRecognition();
    }

    // Reset state
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    isManualStopRef.current = false;
    
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
      hasFinishedSpeaking: false,
      isProcessing: true
    }));

    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setState(prev => ({ ...prev, error: 'Failed to start recognition', isProcessing: false }));
    }
  }, [state.isSupported, initializeRecognition]);

  const stopListening = useCallback(() => {
    isManualStopRef.current = true;
    clearSilenceTimer();
    finishRecognition();
  }, [clearSilenceTimer, finishRecognition]);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      hasFinishedSpeaking: false
    }));
  }, []);

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Error stopping recognition on cleanup:', error);
        }
      }
    };
  }, [clearSilenceTimer]);

  const actions: SpeechRecognitionActions = {
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    resetError
  };

  return [state, actions];
};