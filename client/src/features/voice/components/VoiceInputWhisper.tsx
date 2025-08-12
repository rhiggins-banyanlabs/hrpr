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

    // Detect iOS for adjusted thresholds
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Voice activity thresholds - iOS mics often have different sensitivity
    const VOICE_THRESHOLD = isIOS ? 12 : 15;  // Lower threshold for iOS
    const SILENCE_THRESHOLD = isIOS ? 8 : 10; // Lower threshold for iOS

    if (average > VOICE_THRESHOLD) {
      // Voice detected
      silenceCountRef.current = 0;
      hasSpokenRef.current = true;
      clearSilenceTimer();
    } else if (average < SILENCE_THRESHOLD && hasSpokenRef.current) {
      // Silence detected after speech
      silenceCountRef.current++;
      
      // Check for sustained silence
      // iOS: 90 frames = ~1.5 seconds (more tolerance for iOS processing)
      // Other: 60 frames = ~1 second at 60fps
      const silenceFrameThreshold = isIOS ? 90 : 60;
      
      if (silenceCountRef.current > silenceFrameThreshold) {
        console.log(`🎤 Silence detected (iOS: ${isIOS}), stopping recording`);
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
      
      // Detect iOS devices
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Reset state
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      silenceCountRef.current = 0;
      isRecordingRef.current = true;

      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.error('🎤 Not in secure context - microphone access requires HTTPS');
        throw new Error('Microphone access requires HTTPS connection');
      }

      // Get microphone access with iOS-optimized settings
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: isIOS ? {
            // iOS-specific settings for better compatibility
            echoCancellation: false,  // iOS handles this natively
            noiseSuppression: false,  // iOS handles this natively
            autoGainControl: false,   // iOS handles this natively
            sampleRate: 48000,        // Higher sample rate for iOS
          } : {
            // Standard settings for other platforms
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
      } catch (error: any) {
        console.error('🎤 Microphone permission error:', error);
        
        // Handle specific error cases
        if (error.name === 'NotAllowedError') {
          // Permission denied
          if (isIOS) {
            alert('Microphone access denied. Please go to Settings > Safari > Microphone and allow access for this website.');
          } else {
            alert('Microphone access denied. Please allow microphone access in your browser settings.');
          }
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          alert('Microphone is already in use by another application.');
        } else {
          alert(`Unable to access microphone: ${error.message}`);
        }
        
        onListeningChange(false);
        isRecordingRef.current = false;
        return;
      }
      
      streamRef.current = stream;

      // Set up audio context for silence detection
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Set up MediaRecorder with iOS-compatible formats
      let mimeType = 'audio/webm';
      
      if (isIOS) {
        // iOS Safari supports limited formats
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
        console.log('🎤 iOS detected, using mimeType:', mimeType);
      } else {
        // Other browsers - use best available codec
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: isIOS ? 128000 : undefined // Set bitrate for iOS
      });
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
          // Show "Processing..." state
          if (onTranscriptUpdate) {
            onTranscriptUpdate('Processing...', true);
          }
          await processAudio();
        } else {
          console.log('🎤 No speech detected, not processing');
        }
        
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        isRecordingRef.current = false;
      };

      // Start recording with iOS-optimized timeslice
      const timeslice = isIOS ? 250 : 100; // Larger chunks for iOS
      mediaRecorder.start(timeslice);
      console.log(`🎤 MediaRecorder started (timeslice: ${timeslice}ms, iOS: ${isIOS})`);
      
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
    
    // Immediately update the UI state
    onListeningChange(false);
    
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
      
      // Detect iOS for proper blob type
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Create audio blob with appropriate type
      const blobType = isIOS && MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
      const filename = isIOS ? 'recording.mp4' : 'recording.webm';
      
      console.log(`🎤 Processing audio - iOS: ${isIOS}, Type: ${blobType}, Size: ${audioBlob.size} bytes`);
      
      // Send to Whisper API
      const formData = new FormData();
      formData.append('audio', audioBlob, filename);

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
      // Don't call onListeningChange here - already called in stopRecording
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
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Removed - processing indicator is now shown directly in onstop

  // This component is invisible - it only handles recording logic
  return null;
};

export default VoiceInputWhisper;