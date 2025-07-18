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
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const finalTranscriptRef = useRef(''); // Store current final transcript
  const interimTranscriptRef = useRef(''); // Store current interim transcript
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);
  const hasReceivedSpeechRef = useRef(false);

  // Clear silence timer
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Start silence timer (2 seconds)
  const startSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      console.log('🎤 Silence timeout - stopping recognition');
      finishRecognition();
    }, 2000);
  };

  // Finish recognition and send result
  const finishRecognition = () => {
    if (isStoppingRef.current) return;
    
    isStoppingRef.current = true;
    
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

    console.log('🎤 Starting new recognition instance');
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('🎤 Recognition started');
      isStoppingRef.current = false;
    };

    recognition.onresult = (event: any) => {
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
      console.log('🎤 Recognition ended');
      recognitionRef.current = null;
      
      // Only restart if we're intentionally listening AND not stopping AND we haven't finished with a transcript
      // AND we haven't received any speech (which would indicate we're done)
      if (!isStoppingRef.current && isListening && !finalTranscriptRef.current && !hasReceivedSpeechRef.current) {
        console.log('🎤 Recognition ended unexpectedly, checking if should restart...');
        setTimeout(() => {
          // Double-check that we should still be listening AND Harper is not speaking
          if (isListening && !isStoppingRef.current && !finalTranscriptRef.current) {
            // Check if Harper is speaking by querying the DOM or using a callback
            // For now, don't auto-restart - let the user manually restart
            console.log('🎤 Not auto-restarting - letting user control restart');
          }
        }, 100);
      } else {
        console.log('🎤 Recognition ended normally, not restarting');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
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