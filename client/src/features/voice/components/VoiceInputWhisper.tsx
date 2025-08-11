import { useEffect, useRef, useState } from 'react';

interface VoiceInputWhisperProps {
  onSpeechEnd: (text: string) => void;
  onTranscriptUpdate?: (transcript: string, isInterim: boolean) => void;
  isListening: boolean;
  onListeningChange: (isListening: boolean) => void;
}

const VoiceInputWhisper: React.FC<VoiceInputWhisperProps> = ({
  onSpeechEnd,
  onTranscriptUpdate,
  isListening,
  onListeningChange,
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const silenceCountRef = useRef(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clear silence timer
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Detect silence using audio levels
  const detectSilence = () => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;

    // Voice activity thresholds
    const VOICE_THRESHOLD = 15;
    const SILENCE_THRESHOLD = 10;

    if (average > VOICE_THRESHOLD) {
      // Voice detected
      silenceCountRef.current = 0;
      hasSpokenRef.current = true;
      clearSilenceTimer();
    } else if (average < SILENCE_THRESHOLD && hasSpokenRef.current) {
      // Silence detected after speech
      silenceCountRef.current++;
      
      // Check for sustained silence (60 frames = ~1 second at 60fps)
      if (silenceCountRef.current > 90) { // 1.5 seconds of silence
        console.log('🎤 Silence detected, stopping recording');
        stopRecording();
        return;
      }
    }

    // Continue monitoring
    if (isRecordingRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectSilence);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      console.log('🎤 Starting Whisper-based recording');
      
      // Reset state
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      silenceCountRef.current = 0;
      isRecordingRef.current = true;

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Set up audio context for silence detection
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio');
        
        // Only process if we have audio data and user spoke
        if (audioChunksRef.current.length > 0 && hasSpokenRef.current) {
          await processAudio();
        } else {
          console.log('🎤 No speech detected, not processing');
          onListeningChange(false);
        }
        
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        isRecordingRef.current = false;
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      console.log('🎤 MediaRecorder started');
      
      // Start silence detection
      detectSilence();

      // Set a maximum recording time of 30 seconds
      silenceTimerRef.current = setTimeout(() => {
        console.log('🎤 Max recording time reached');
        stopRecording();
      }, 30000);

    } catch (error) {
      console.error('🎤 Error starting recording:', error);
      onListeningChange(false);
      isRecordingRef.current = false;
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('🎤 Stopping recording');
    clearSilenceTimer();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  // Process recorded audio
  const processAudio = async () => {
    try {
      setIsProcessing(true);
      
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Send to Whisper API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      const transcript = data.text?.trim();

      if (transcript) {
        console.log('🎤 Transcription result:', transcript);
        
        // Send final transcript
        onSpeechEnd(transcript);
        
        // Update display
        if (onTranscriptUpdate) {
          onTranscriptUpdate(transcript, false);
        }
      } else {
        console.log('🎤 No transcription result');
      }

    } catch (error) {
      console.error('🎤 Error processing audio:', error);
    } finally {
      setIsProcessing(false);
      onListeningChange(false);
      audioChunksRef.current = [];
    }
  };

  // Handle listening state changes
  useEffect(() => {
    if (isListening && !isRecordingRef.current && !isProcessing) {
      console.log('🎤 isListening true, starting recording');
      startRecording();
    } else if (!isListening && isRecordingRef.current) {
      console.log('🎤 isListening false, stopping recording');
      stopRecording();
    }
  }, [isListening, isProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🎤 VoiceInputWhisper cleanup');
      clearSilenceTimer();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Show processing indicator
  useEffect(() => {
    if (isProcessing && onTranscriptUpdate) {
      onTranscriptUpdate('Processing...', true);
    }
  }, [isProcessing, onTranscriptUpdate]);

  // This component is invisible - it only handles recording logic
  return null;
};

export default VoiceInputWhisper;