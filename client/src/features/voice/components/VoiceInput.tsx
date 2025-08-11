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
  const recognitionRef = useRef<any | null>(null);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const finalTranscriptRef = useRef(''); // Store current final transcript
  const interimTranscriptRef = useRef(''); // Store current interim transcript
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);
  const hasReceivedSpeechRef = useRef(false);
  const lastResultTimeRef = useRef<number>(0);
  const stableTranscriptRef = useRef<string>('');
  const noSpeechCountRef = useRef<number>(0);

  // Clear silence timer
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Check if transcript is stable (hasn't changed for a while)
  const checkTranscriptStability = () => {
    const currentTranscript = finalTranscriptRef.current || interimTranscriptRef.current;
    
    if (currentTranscript && currentTranscript === stableTranscriptRef.current) {
      // Transcript hasn't changed, user might have stopped speaking
      const timeSinceLastResult = Date.now() - lastResultTimeRef.current;
      
      // Check if mobile for appropriate timeout
      const userAgent = navigator.userAgent;
      const isMobile = /iPad|iPhone|iPod|Android/i.test(userAgent) || ('ontouchstart' in window);
      const stabilityThreshold = isMobile ? 1500 : 1200; // 1.5s for mobile, 1.2s for desktop
      
      if (timeSinceLastResult > stabilityThreshold) {
        console.log(`🎤 Speech stable for ${timeSinceLastResult}ms - user stopped speaking`);
        finishRecognition();
      }
    } else {
      // Transcript changed, update stable reference
      stableTranscriptRef.current = currentTranscript;
      lastResultTimeRef.current = Date.now();
    }
  };
  
  // Start silence timer (with stability checking)
  const startSilenceTimer = () => {
    clearSilenceTimer();
    
    // Check if mobile for appropriate timeout
    const userAgent = navigator.userAgent;
    const isMobile = /iPad|iPhone|iPod|Android/i.test(userAgent) || ('ontouchstart' in window);
    
    // Use shorter intervals for stability checking
    silenceTimerRef.current = setTimeout(() => {
      checkTranscriptStability();
      
      // Continue checking if still listening
      if (!isStoppingRef.current && recognitionRef.current) {
        startSilenceTimer();
      }
    }, 500); // Check every 500ms
  };

  // Finish recognition and send result
  const finishRecognition = () => {
    if (isStoppingRef.current) {
      console.log('🎤 Already stopping, skipping finishRecognition');
      return;
    }
    
    isStoppingRef.current = true;
    console.log('🎤 finishRecognition called - marking as stopping');
    
    // Get the final transcript from refs (current values)
    const textToSend = (finalTranscriptRef.current + ' ' + interimTranscriptRef.current).trim();
    console.log('🎤 Finishing recognition with transcript:', textToSend);

    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Clear timers
    clearSilenceTimer();

    // Send the final transcript if we have any
    if (textToSend && hasReceivedSpeechRef.current) {
      console.log('🎤 Sending final transcript:', textToSend);
      onSpeechEnd(textToSend);
    } else {
      console.log('🎤 No speech to send, just stopping');
    }

    // Reset states
    setFinalTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    hasReceivedSpeechRef.current = false;
    isStoppingRef.current = false;

    // Turn off listening
    onListeningChange(false);
  };

  // Start recognition
  const startRecognition = () => {
    if (recognitionRef.current || isStoppingRef.current) {
      console.log('🎤 Recognition already exists or stopping, skipping start');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ Speech Recognition not supported');
      onListeningChange(false);
      return;
    }

    // Clear all state before starting
    console.log('🎤 Starting new recognition instance');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');
    hasReceivedSpeechRef.current = false;
    isStoppingRef.current = false;
    
    const recognition = new SpeechRecognition();
    
    // Detect mobile devices (iOS, Android, WebKit) for special handling
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(userAgent);
    const isWebKit = /WebKit/i.test(userAgent) && !/Chrome/i.test(userAgent);
    const isMobile = isIOS || isAndroid || ('ontouchstart' in window);
    
    // Use different settings for mobile devices
    if (isMobile) {
      console.log("📱 VoiceInput: Mobile device detected (iOS/Android)");
      console.log("📱 User Agent:", userAgent);
      // Use continuous mode but handle results differently
      recognition.continuous = true;  // Keep listening until we stop
      recognition.interimResults = true;  // Get interim results to show progress
      recognition.maxAlternatives = 1;  // Only one alternative
    } else {
      console.log("💻 VoiceInput: Desktop browser - using continuous mode");
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
    }
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('🎤 Recognition started');
      isStoppingRef.current = false;
    };

    recognition.onresult = (event: any) => {
      // Check if we're on a mobile device (iOS, Android, or WebKit)
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(userAgent);
      const isWebKit = /WebKit/i.test(userAgent) && !/Chrome/i.test(userAgent);
      const isMobile = isIOS || isAndroid || ('ontouchstart' in window);
      
      if (isMobile) {
        // Mobile devices: Build complete transcript from all results
        if (event.results.length > 0) {
          let fullTranscript = '';
          let hasAnyFinal = false;
          
          // Build the complete transcript from all results
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            // On Android, each result is cumulative, so we just take the last one
            // On iOS, we might need to concatenate
            if (isAndroid) {
              fullTranscript = transcript; // Just use the latest
            } else {
              // For iOS or other platforms, concatenate if needed
              if (i === event.results.length - 1) {
                fullTranscript = transcript;
              }
            }
            
            if (result.isFinal) {
              hasAnyFinal = true;
            }
          }
          
          console.log("📱 Mobile - Transcript:", fullTranscript);
          console.log("📱 Has final result:", hasAnyFinal);
          
          // REPLACE the transcript with the complete version
          finalTranscriptRef.current = fullTranscript;
          setFinalTranscript(fullTranscript);
          hasReceivedSpeechRef.current = true;
          
          // Update last result time for stability checking
          lastResultTimeRef.current = Date.now();
          
          // Notify parent with the complete transcript
          if (onTranscriptUpdate) {
            onTranscriptUpdate(fullTranscript, !hasAnyFinal);
          }
          
          // Start/restart stability checking
          startSilenceTimer();
        }
        return;
      }
      
      // Desktop: Original logic
      let newFinalTranscript = '';
      let newInterimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalTranscript += transcript;
          hasReceivedSpeechRef.current = true;
        } else {
          newInterimTranscript += transcript;
        }
      }

      // Update refs with current values
      if (newFinalTranscript) {
        finalTranscriptRef.current += newFinalTranscript;
        setFinalTranscript(finalTranscriptRef.current);
      }
      
      interimTranscriptRef.current = newInterimTranscript;
      setInterimTranscript(newInterimTranscript);

      // Notify parent of transcript updates
      if (onTranscriptUpdate) {
        const fullTranscript = finalTranscriptRef.current + ' ' + newInterimTranscript;
        onTranscriptUpdate(fullTranscript.trim(), !newFinalTranscript);
      }

      // Reset silence timer when we get new results
      if (newFinalTranscript || newInterimTranscript) {
        startSilenceTimer();
      }
    };

    recognition.onerror = (event: any) => {
      // Handle different types of errors
      if (event.error === 'no-speech') {
        console.log('🎤 No speech detected, finishing recognition');
        finishRecognition();
      } else if (event.error === 'audio-capture') {
        console.error('🎤 Audio capture error - check microphone permissions');
        finishRecognition();
      } else if (event.error === 'not-allowed') {
        console.error('🎤 Microphone access denied');
        finishRecognition();
      } else {
        console.error('🎤 Recognition error:', event.error);
        finishRecognition();
      }
    };

    recognition.onend = () => {
      console.log('🎤 Recognition ended, isStoppingRef:', isStoppingRef.current);
      recognitionRef.current = null;
      
      // Don't do anything if we're already stopping
      if (isStoppingRef.current) {
        console.log('🎤 Already stopping - not restarting');
        return;
      }
      
      // Check if we're on a mobile device
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(userAgent);
      const isMobile = isIOS || isAndroid || ('ontouchstart' in window);
      
      // On mobile, we've already processed the result in onresult
      // Don't restart - user needs to click button again
      if (isMobile) {
        console.log('🎤 Mobile: Recognition ended after processing');
        // Clear states for next interaction
        finalTranscriptRef.current = '';
        interimTranscriptRef.current = '';
        hasReceivedSpeechRef.current = false;
        isStoppingRef.current = false;
      } else if (!isStoppingRef.current && isListening && !finalTranscriptRef.current && !hasReceivedSpeechRef.current) {
        // Desktop: Original logic
        console.log('🎤 Desktop: Recognition ended unexpectedly, not auto-restarting');
      } else {
        console.log('🎤 Recognition ended normally');
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      console.log('🎤 Recognition.start() called successfully');
    } catch (error) {
      console.error('🎤 Error starting recognition:', error);
      recognitionRef.current = null;
      onListeningChange(false);
    }
  };

  // Stop recognition
  const stopRecognition = () => {
    console.log('🎤 Stopping recognition');
    finishRecognition();
  };

  // Effect to handle listening state changes
  useEffect(() => {
    if (isListening && !recognitionRef.current && !isStoppingRef.current) {
      console.log('🎤 isListening true, starting recognition');
      startRecognition();
    } else if (!isListening && recognitionRef.current) {
      console.log('🎤 isListening false, stopping recognition');
      stopRecognition();
    }
  }, [isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🎤 VoiceInput cleanup');
      clearSilenceTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  // This component is invisible - it only handles speech recognition logic
  return null;
};

export default VoiceInput;