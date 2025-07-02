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
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      isStoppingRef.current = false;
      hasReceivedSpeechRef.current = false;
      setFinalTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let newFinalTranscript = '';
      let newInterimTranscript = '';

      // Process all results
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          newFinalTranscript += transcript;
          hasReceivedSpeechRef.current = true;
          console.log('🎤 Final result received:', transcript);
          
          // Start silence timer after receiving final speech
          startSilenceTimer();
        } else {
          newInterimTranscript += transcript;
          console.log('🎤 Interim result received:', transcript);
        }
      }

      // Update states and refs - accumulate final transcript
      if (newFinalTranscript) {
        const updatedFinal = (finalTranscriptRef.current + ' ' + newFinalTranscript).trim();
        setFinalTranscript(updatedFinal);
        finalTranscriptRef.current = updatedFinal;
        console.log('🎤 Updated final transcript:', updatedFinal);
      }
      setInterimTranscript(newInterimTranscript);
      interimTranscriptRef.current = newInterimTranscript;

      // Update parent with combined transcript
      const combinedTranscript = ((finalTranscriptRef.current + ' ' + newInterimTranscript).trim());
      if (onTranscriptUpdate && combinedTranscript) {
        console.log('🎤 Updating parent with transcript:', combinedTranscript);
        onTranscriptUpdate(combinedTranscript, !newFinalTranscript);
      }

      // If we received any speech, clear and restart silence timer
      if (newFinalTranscript || newInterimTranscript) {
        startSilenceTimer();
      }
    };

    recognition.onend = () => {
      console.log('🎤 Recognition ended');
      
      // Don't restart if we're intentionally stopping
      if (isStoppingRef.current) {
        console.log('🎤 Stopping intentionally, not restarting');
        return;
      }

      // Don't restart if we've already processed speech successfully
      if (hasReceivedSpeechRef.current) {
        console.log('🎤 Speech was processed successfully, finishing instead of restarting');
        finishRecognition();
        return;
      }

      // If we're still supposed to be listening and haven't received speech, restart
      if (isListening && !hasReceivedSpeechRef.current) {
        console.log('🎤 Restarting recognition - no speech received yet');
        setTimeout(() => {
          if (isListening && !isStoppingRef.current && !hasReceivedSpeechRef.current) {
            startRecognition();
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      // Only log serious errors, ignore expected "no-speech" errors
      if (event.error === 'not-allowed') {
        console.error('🎤 Microphone access denied');
        alert('Please allow microphone access');
        onListeningChange(false);
        return;
      }
      
      if (event.error === 'audio-capture') {
        console.error('🎤 No microphone detected');
        alert('No microphone detected. Please check your microphone.');
        onListeningChange(false);
        return;
      }

      // For "no-speech" error after successful processing, just finish
      if (event.error === 'no-speech' && hasReceivedSpeechRef.current) {
        console.log('🎤 Finishing after successful speech processing');
        finishRecognition();
        return;
      }

      // For aborted errors, try restarting if still listening
      if (event.error === 'aborted' && isListening && !isStoppingRef.current) {
        console.log('🎤 Recognition aborted, restarting...');
        setTimeout(() => {
          if (isListening && !isStoppingRef.current) {
            startRecognition();
          }
        }, 200);
        return;
      }

      // Silently ignore "no-speech" errors as they're expected
      if (event.error === 'no-speech') {
        // Don't log anything for no-speech errors
        return;
      }

      // Log other unexpected errors
      console.log('🎤 Speech recognition error:', event.error);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('❌ Failed to start recognition:', error);
      onListeningChange(false);
    }
  };

  // Main effect to handle listening state changes
  useEffect(() => {
    console.log('🎤 VoiceInput effect triggered:', { isListening, hasRecognition: !!recognitionRef.current, isStopping: isStoppingRef.current });
    
    if (isListening && !recognitionRef.current && !isStoppingRef.current) {
      console.log('🎤 Starting voice input...');
      startRecognition();
    } else if (isListening && !recognitionRef.current && isStoppingRef.current) {
      console.log('🎤 Resetting stopping state and starting voice input...');
      isStoppingRef.current = false; // Reset stopping state
      startRecognition();
    } else if (!isListening && recognitionRef.current) {
      console.log('🎤 Stopping voice input...');
      finishRecognition();
    }

    // Cleanup on unmount
    return () => {
      console.log('🎤 VoiceInput cleanup triggered');
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      clearSilenceTimer();
    };
  }, [isListening]);

  return null;
};

export default VoiceInput;