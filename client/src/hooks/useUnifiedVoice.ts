import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useIOSCompatibleVoice, isIOSDevice } from './useIOSCompatibleVoice';

interface UseUnifiedVoiceProps {
  onHarperDetected: (transcript: string) => void;
  onError?: (error: string) => void;
}

export const useUnifiedVoice = ({ onHarperDetected, onError }: UseUnifiedVoiceProps) => {
  const [isIOS] = useState(() => isIOSDevice());
  const [unifiedListening, setUnifiedListening] = useState(false);
  const [unifiedTranscript, setUnifiedTranscript] = useState('');
  const [unifiedError, setUnifiedError] = useState<string | null>(null);
  const [HarperDetected, setHarperDetected] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Ref to track if we're processing to prevent multiple triggers
  const isProcessingRef = useRef(false);
  // Ref to prevent state sync from overriding manual listening state changes
  const manualListeningChangeRef = useRef(false);
  
  // Harper variations for detection
  const HARPER_VARIATIONS = [
    "harper", 
    "harbor",
    "harpur",
    "hopper",
    "copper"
  ];
  
  // Detect Harper in transcript
  const detectHarperInTranscript = (transcript: string): boolean => {
    const lowerTranscript = transcript.toLowerCase();
    return HARPER_VARIATIONS.some(variation => 
      lowerTranscript.includes(`hey ${variation}`) || 
      lowerTranscript.includes(variation)
    );
  };
  
  // Extract query from Harper wake word
  const extractQueryFromTranscript = (fullTranscript: string): string => {
    const lowerTranscript = fullTranscript.toLowerCase();
    let query = "";
    
    // Try with "hey" prefix first
    for (const variation of HARPER_VARIATIONS) {
      if (lowerTranscript.includes(`hey ${variation}`)) {
        const parts = fullTranscript.split(new RegExp(`hey ${variation}`, 'i'));
        query = parts[1]?.trim() || "";
        break;
      }
    }
    
    // If not found with "hey", try just the name
    if (!query) {
      for (const variation of HARPER_VARIATIONS) {
        if (lowerTranscript.includes(variation)) {
          const parts = fullTranscript.split(new RegExp(variation, 'i'));
          query = parts[1]?.trim() || "";
          break;
        }
      }
    }
    
    // If no additional query found, return just the greeting
    return query || "hey Harper";
  };
  
  // Handle transcript from iOS implementation
  const handleIOSTranscript = useCallback((transcript: string) => {
    console.log('🍎 iOS transcript received:', transcript);
    setUnifiedTranscript(transcript);
    
    // For tap-to-activate mode, process ANY transcript (no wake word needed)
    if (transcript.trim() && !isProcessingRef.current) {
      console.log('🍎 Processing iOS transcript directly (tap-to-activate mode)');
      isProcessingRef.current = true;
      setHarperDetected(true);
      setIsNavigating(true);
      
      // Use the full transcript as the query
      const query = transcript.trim();
      
      // Trigger the callback
      setTimeout(() => {
        onHarperDetected(query);
        
        // Reset states after a delay
        setTimeout(() => {
          setHarperDetected(false);
          setIsNavigating(false);
          isProcessingRef.current = false;
        }, 2000);
      }, 100);
    }
  }, [onHarperDetected]);
  
  // Handle errors from iOS implementation
  const handleIOSError = useCallback((error: string) => {
    console.error('🍎 iOS voice error:', error);
    setUnifiedError(error);
    onError?.(error);
  }, [onError]);
  
  // iOS voice implementation
  const iosVoice = useIOSCompatibleVoice({
    onTranscript: handleIOSTranscript,
    onError: handleIOSError,
  });
  
  // Standard Web Speech API implementation
  const [webSpeechState, webSpeechActions] = useSpeechRecognition(onHarperDetected);
  
  // Unified start listening
  const startListening = useCallback(() => {
    console.log(`🎤 Starting unified voice (iOS: ${isIOS})`);
    setUnifiedError(null);
    
    // Set flag to prevent immediate state sync override
    manualListeningChangeRef.current = true;
    setUnifiedListening(true);
    
    if (isIOS) {
      // Use iOS-compatible implementation
      iosVoice.startRecording();
    } else {
      // Use standard Web Speech API
      webSpeechActions.startListening();
    }
    
    // Clear the flag after a short delay to allow underlying state to catch up
    setTimeout(() => {
      manualListeningChangeRef.current = false;
    }, 500);
  }, [isIOS, iosVoice, webSpeechActions]);
  
  // Unified stop listening
  const stopListening = useCallback(() => {
    console.log(`🎤 Stopping unified voice (iOS: ${isIOS})`);
    setUnifiedListening(false);
    
    if (isIOS) {
      iosVoice.stopRecording();
    } else {
      webSpeechActions.stopListening();
    }
  }, [isIOS, iosVoice, webSpeechActions]);
  
  // Unified toggle listening
  const toggleListening = useCallback(() => {
    if (unifiedListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [unifiedListening, startListening, stopListening]);
  
  // Reset all states
  const resetStates = useCallback(() => {
    console.log('🔄 Resetting unified voice states');
    setUnifiedListening(false);
    setUnifiedTranscript('');
    setUnifiedError(null);
    setHarperDetected(false);
    setIsNavigating(false);
    isProcessingRef.current = false;
    
    if (isIOS) {
      iosVoice.stopRecording();
    } else {
      webSpeechActions.resetStates();
    }
  }, [isIOS, iosVoice, webSpeechActions]);
  
  // Request microphone permission (iOS needs explicit permission)
  const requestPermission = useCallback(async () => {
    if (isIOS) {
      return await iosVoice.requestPermission();
    } else {
      // For non-iOS, permission is requested when starting to listen
      startListening();
      return true;
    }
  }, [isIOS, iosVoice, startListening]);
  
  // Sync state from platform-specific implementations
  useEffect(() => {
    // Don't sync listening state if we're in the middle of a manual change
    if (manualListeningChangeRef.current) {
      console.log('🎤 Skipping state sync - manual listening change in progress');
      return;
    }
    
    if (!isIOS) {
      // Sync Web Speech API state
      setUnifiedListening(webSpeechState.listening);
      setUnifiedTranscript(webSpeechState.transcript);
      setUnifiedError(webSpeechState.permissionError);
      setHarperDetected(webSpeechState.HarperDetected);
      setIsNavigating(webSpeechState.isNavigating);
    } else {
      // Sync iOS state
      setUnifiedListening(iosVoice.isListening);
      // Transcript and errors are handled via callbacks
    }
  }, [
    isIOS,
    webSpeechState.listening,
    webSpeechState.transcript,
    webSpeechState.permissionError,
    webSpeechState.HarperDetected,
    webSpeechState.isNavigating,
    iosVoice.isListening,
  ]);
  
  return {
    // State
    listening: unifiedListening,
    transcript: unifiedTranscript,
    permissionError: unifiedError,
    HarperDetected,
    isNavigating,
    isProcessing: iosVoice.isProcessing,
    isIOS,
    permissionStatus: iosVoice.permissionStatus,
    
    // Actions
    startListening,
    stopListening,
    toggleListening,
    resetStates,
    requestPermission,
  };
};