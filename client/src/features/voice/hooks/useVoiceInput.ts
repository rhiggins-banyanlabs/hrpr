// hooks/useVoiceInput.ts
import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceInputState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  hasFinishedSpeaking: boolean;
}

interface VoiceInputActions {
  startRecording: () => void;
  stopRecording: () => void;
  toggleRecording: () => void;
  clearTranscript: () => void;
  resetFinishedFlag: () => void;
}

export const useVoiceInput = (
  onTranscriptUpdate?: (text: string) => void,
  autoSendDelay: number = 2000,
  onComplete?: (transcript: string) => void
) => {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isProcessing: false,
    transcript: '',
    error: null,
    isSupported: typeof window !== 'undefined' && 'webkitSpeechRecognition' in window,
    hasFinishedSpeaking: false
  });

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualStopRef = useRef(false);
  const currentTranscriptRef = useRef('');

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Start silence timer
  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    console.log('🕐 Starting silence timer for auto-completion');
    silenceTimerRef.current = setTimeout(() => {
      const transcript = currentTranscriptRef.current;
      console.log('🔇 Silence detected, transcript:', transcript);
      if (transcript.trim() && !isManualStopRef.current) {
        console.log('✅ Calling onComplete directly');
        
        // Clear state first
        setState(prev => ({ 
          ...prev, 
          isRecording: false, 
          hasFinishedSpeaking: true,
          transcript: '' // Clear transcript to prevent reprocessing
        }));
        currentTranscriptRef.current = '';
        
        // Call completion handler if provided
        if (onComplete) {
          onComplete(transcript.trim());
        }
        
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }
    }, autoSendDelay);
  }, [autoSendDelay, clearSilenceTimer, onComplete]);

  // Reset finished flag
  const resetFinishedFlag = useCallback(() => {
    setState(prev => ({ ...prev, hasFinishedSpeaking: false }));
  }, []);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (!state.isSupported) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setState(prev => ({ ...prev, isRecording: true, error: null, hasFinishedSpeaking: false }));
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript + interimTranscript;
      console.log('🎤 Speech result:', { 
        current: currentTranscript, 
        final: finalTranscript, 
        interim: interimTranscript 
      });
      
      // Update refs and state
      currentTranscriptRef.current = currentTranscript;
      setState(prev => ({ ...prev, transcript: currentTranscript }));
      
      // Call update callback if provided
      if (onTranscriptUpdate) {
        onTranscriptUpdate(currentTranscript);
      }

      // Reset silence timer on new speech
      if (currentTranscript.trim().length > 2) {
        console.log('🕐 Resetting silence timer');
        startSilenceTimer();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      setState(prev => ({ 
        ...prev, 
        error: `Speech recognition error: ${event.error}`,
        isRecording: false 
      }));
      clearSilenceTimer();
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setState(prev => ({ ...prev, isRecording: false }));
      
      // If we have transcript and it wasn't a manual stop, call completion
      const transcript = currentTranscriptRef.current;
      if (transcript.trim() && !isManualStopRef.current) {
        console.log('🎤 Recognition ended, calling onComplete:', transcript);
        
        // Clear state
        setState(prev => ({ ...prev, hasFinishedSpeaking: true, transcript: '' }));
        currentTranscriptRef.current = '';
        
        // Call completion handler
        if (onComplete) {
          onComplete(transcript.trim());
        }
      }
      
      clearSilenceTimer();
      isManualStopRef.current = false;
    };

    return recognition;
  }, [state.isSupported, onTranscriptUpdate, startSilenceTimer, clearSilenceTimer]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported in this browser' }));
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setState(prev => ({ ...prev, error: null, transcript: '', hasFinishedSpeaking: false }));
      currentTranscriptRef.current = '';
      isManualStopRef.current = false;
      
      if (!recognitionRef.current) {
        recognitionRef.current = initializeRecognition();
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('🎤 Microphone permission denied:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Microphone permission denied. Please allow microphone access.' 
      }));
    }
  }, [state.isSupported, initializeRecognition]);

  // Stop recording
  const stopRecording = useCallback(() => {
    isManualStopRef.current = true;
    clearSilenceTimer();
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Call completion if we have transcript
    const transcript = currentTranscriptRef.current;
    if (transcript.trim()) {
      console.log('🎤 Manual stop, calling onComplete:', transcript);
      
      // Clear state
      setState(prev => ({ ...prev, hasFinishedSpeaking: true, isRecording: false, transcript: '' }));
      currentTranscriptRef.current = '';
      
      // Call completion handler
      if (onComplete) {
        onComplete(transcript.trim());
      }
    }
  }, [clearSilenceTimer, onComplete]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', error: null, hasFinishedSpeaking: false }));
    currentTranscriptRef.current = '';
    clearSilenceTimer();
  }, [clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [clearSilenceTimer]);

  const actions: VoiceInputActions = {
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscript,
    resetFinishedFlag
  };

  return [state, actions] as const;
};