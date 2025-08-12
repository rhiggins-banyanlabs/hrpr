import { useState, useRef, useCallback, useEffect } from 'react';
import { audioConverter } from '@/services/audio-converter.service';

// Comprehensive iOS detection
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Check for iOS devices (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  
  // Check for iPad on iOS 13+ (reports as MacIntel)
  const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  
  // Check for iOS Safari specifically
  const isIOSSafari = isIOS && /Safari/.test(userAgent) && !/CriOS/.test(userAgent);
  
  return isIOS || isIPadOS || isIOSSafari;
};

interface UseIOSCompatibleVoiceProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

export const useIOSCompatibleVoice = ({ onTranscript, onError }: UseIOSCompatibleVoiceProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const silenceCountRef = useRef(0);
  const currentMimeTypeRef = useRef<string>('audio/webm');

  // Check microphone permission status
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions || !navigator.permissions.query) {
      // Permissions API not available (common on iOS)
      return 'prompt';
    }
    
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
      return result.state;
    } catch (error) {
      console.log('🎤 Permission check not supported');
      return 'prompt';
    }
  }, []);

  // iOS-specific audio session initialization
  const initializeIOSAudioSession = useCallback(async () => {
    if (!isIOSDevice()) return true;
    
    try {
      // Create a silent audio context to initialize iOS audio session
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a silent buffer
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      // Play the silent buffer to unlock audio
      source.start();
      
      // Resume the context if it's suspended (iOS requirement)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      console.log('🍎 iOS audio session initialized');
      return true;
    } catch (error) {
      console.error('🍎 Failed to initialize iOS audio session:', error);
      return false;
    }
  }, []);

  // Request microphone permission with iOS-specific handling
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🎤 Checking/requesting microphone permission...');
      
      // Check if we already have permission
      if (permissionStatus === 'granted' && streamRef.current) {
        console.log('🎤 Permission already granted, reusing stream');
        return true;
      }
      
      // For iOS, use the simplest possible constraints
      const constraints = isIOSDevice() ? {
        audio: true  // Simplest possible constraint for iOS
      } : {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };
      
      console.log('🎤 Requesting new permission with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store the stream for later use - DON'T STOP IT!
      streamRef.current = stream;
      
      // For iOS, keep the stream alive to avoid re-requesting permission
      if (isIOSDevice()) {
        console.log('🍎 Keeping stream alive for iOS to avoid re-permission');
        // Mute all tracks instead of stopping them
        stream.getTracks().forEach(track => {
          track.enabled = false; // Mute but keep alive
        });
      } else {
        // For non-iOS, we can stop the stream
        stream.getTracks().forEach(track => track.stop());
      }
      
      setPermissionStatus('granted');
      console.log('🎤 Microphone permission granted');
      return true;
    } catch (error: any) {
      console.error('🎤 Microphone permission error:', error);
      
      if (error.name === 'NotAllowedError') {
        setPermissionStatus('denied');
        const message = isIOSDevice() 
          ? 'Please allow microphone access when prompted by Safari. Check Settings > Safari > Camera & Microphone if needed.'
          : 'Microphone access denied. Please allow microphone access in your browser settings.';
        onError?.(message);
      } else if (error.name === 'NotFoundError') {
        onError?.('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        onError?.('Microphone is already in use by another application. Please close other apps using the microphone.');
      } else if (error.message.includes('not allowed by the user agent')) {
        setPermissionStatus('denied');
        onError?.('Microphone access blocked by browser. Please check Safari settings and try again.');
      } else {
        console.error('🎤 Full error details:', error);
        onError?.(`Unable to access microphone: ${error.message}`);
      }
      
      setPermissionStatus('denied');
      return false;
    }
  }, [initializeIOSAudioSession, onError]);

  // Detect silence for auto-stop
  const detectSilence = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

    // iOS-adjusted thresholds (higher = less sensitive)
    const VOICE_THRESHOLD = isIOSDevice() ? 20 : 15;  // Increased for iOS
    const SILENCE_THRESHOLD = isIOSDevice() ? 15 : 10;  // Increased for iOS

    if (average > VOICE_THRESHOLD) {
      // Voice detected
      silenceCountRef.current = 0;
      hasSpokenRef.current = true;
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else if (average < SILENCE_THRESHOLD && hasSpokenRef.current) {
      // Silence detected after speech
      silenceCountRef.current++;
      
      // iOS needs more tolerance for processing delays
      const silenceFrameThreshold = isIOSDevice() ? 150 : 60; // ~2.5s on iOS, ~1s on others
      
      if (silenceCountRef.current > silenceFrameThreshold) {
        console.log(`🎤 Silence detected (iOS: ${isIOSDevice()}), stopping recording`);
        stopRecording();
        return;
      }
    }

    // Continue monitoring
    if (isRecordingRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectSilence);
    }
  }, []);

  // Process audio with Whisper API
  const processAudioWithWhisper = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      setIsProcessing(true);
      console.log('🎤 Processing audio with Whisper API...');
      
      let processedBlob = audioBlob;
      let fileName = 'audio.webm';
      
      // For iOS, skip FFmpeg conversion and send raw audio
      if (isIOSDevice()) {
        console.log('🍎 iOS detected - skipping FFmpeg conversion, using raw audio');
        processedBlob = audioBlob;
        // Use the mime type that was actually recorded
        if (currentMimeTypeRef.current.includes('mp4')) {
          fileName = 'audio.mp4';
        } else if (currentMimeTypeRef.current.includes('webm')) {
          fileName = 'audio.webm';
        } else {
          fileName = 'audio.wav';
        }
        console.log(`🍎 iOS sending raw audio as: ${fileName}`);
      } else {
        // For non-iOS, try FFmpeg conversion
        try {
          console.log('🎵 Converting audio for browser compatibility...');
          const converted = await audioConverter.convertForDevice(audioBlob, 'webm');
          processedBlob = converted.blob;
          fileName = converted.filename;
          console.log(`✅ Audio converted: ${fileName}`);
        } catch (conversionError) {
          console.warn('⚠️ Audio conversion failed, trying original format:', conversionError);
          // Fall back to original format if conversion fails
          processedBlob = audioBlob;
          fileName = 'audio.webm';
        }
      }
      
      const formData = new FormData();
      formData.append('audio', processedBlob, fileName);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'json');
      
      // Log what we're sending to the API
      console.log('🎤 Sending to transcription API:', {
        fileName,
        blobSize: processedBlob.size,
        blobType: processedBlob.type
      });

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎤 Transcription API error:', response.status, errorText);
        throw new Error(`Transcription failed: ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      const transcribedText = result.text || '';
      
      console.log('🎤 Transcription result:', transcribedText);
      return transcribedText;
    } catch (error) {
      console.error('🎤 Transcription error:', error);
      onError?.('Failed to transcribe audio. Please try again.');
      return '';
    } finally {
      setIsProcessing(false);
    }
  }, [onError]);

  // Stop recording and process audio
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;
    
    console.log('🎤 Stopping recording...');
    isRecordingRef.current = false;
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Stop the media recorder
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Wait for the final data
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
        } else {
          resolve();
        }
      });
    }
    
    // For iOS, mute tracks instead of stopping to keep permission
    if (streamRef.current) {
      if (isIOSDevice()) {
        console.log('🍎 Muting iOS stream (keeping alive for permission)');
        streamRef.current.getTracks().forEach(track => {
          track.enabled = false; // Mute but keep alive
        });
        // Keep streamRef.current alive!
      } else {
        // For non-iOS, stop tracks normally
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    
    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsListening(false);
    
    // Process the recorded audio if we have chunks
    if (audioChunksRef.current.length > 0 && hasSpokenRef.current) {
      const audioBlob = new Blob(audioChunksRef.current, { type: currentMimeTypeRef.current });
      
      // Debug the audio blob before processing
      console.log('🎤 Audio blob for processing:', {
        size: audioBlob.size,
        type: audioBlob.type,
        chunks: audioChunksRef.current.length,
        hasSpoken: hasSpokenRef.current
      });
      
      if (audioBlob.size === 0) {
        console.error('🎤 Audio blob is empty - no audio was recorded');
        onError?.('No audio was recorded. Please try speaking louder or closer to the microphone.');
        return;
      }
      
      const transcribedText = await processAudioWithWhisper(audioBlob);
      
      if (transcribedText) {
        setTranscript(transcribedText);
        onTranscript(transcribedText);
      }
    } else {
      console.warn('🎤 No audio to process:', {
        chunksLength: audioChunksRef.current.length,
        hasSpoken: hasSpokenRef.current
      });
      onError?.('No speech detected. Please try speaking after tapping record.');
    }
    
    // Reset state
    audioChunksRef.current = [];
    hasSpokenRef.current = false;
    silenceCountRef.current = 0;
  }, [processAudioWithWhisper, onTranscript]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting iOS-compatible recording...');
      
      // Check permission first
      const hasPermission = permissionStatus === 'granted' || await requestMicrophonePermission();
      if (!hasPermission) {
        console.log('🎤 No permission to record');
        return;
      }
      
      // Reset state
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      silenceCountRef.current = 0;
      isRecordingRef.current = true;
      setIsListening(true);
      setTranscript('');
      
      // Get or reuse microphone stream
      let stream = streamRef.current;
      
      if (isIOSDevice() && stream) {
        // For iOS, reuse existing stream and re-enable tracks
        console.log('🍎 Reusing existing iOS stream');
        stream.getTracks().forEach(track => {
          track.enabled = true; // Re-enable tracks
        });
      } else {
        // For non-iOS or if no stream exists, get a new one
        const constraints = isIOSDevice() ? {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
          }
        } : {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
      }
      
      // Set up audio context for silence detection
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Set up MediaRecorder with device-specific mime type
      // iOS requires specific handling since it only supports m4a/ALAC natively
      let mimeType = '';
      let selectedMimeType = 'audio/webm'; // Default fallback
      
      if (isIOSDevice()) {
        // For iOS, we'll record in any supported format and convert with FFmpeg
        const iosMimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          ''  // Browser default
        ];
        
        console.log('🍎 Checking iOS-compatible recording formats:');
        for (const type of iosMimeTypes) {
          const supported = type === '' ? true : MediaRecorder.isTypeSupported(type);
          console.log(`  ${type || 'browser default'}: ${supported ? '✅' : '❌'}`);
          
          if (supported && !mimeType) {
            mimeType = type;
            selectedMimeType = type || 'audio/webm';
            console.log('🍎 Selected recording format for iOS:', mimeType || 'browser default');
            break;
          }
        }
      } else {
        // For non-iOS devices, try standard formats
        const standardMimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          ''
        ];
        
        console.log('🎤 Checking standard recording formats:');
        for (const type of standardMimeTypes) {
          const supported = type === '' ? true : MediaRecorder.isTypeSupported(type);
          console.log(`  ${type || 'browser default'}: ${supported ? '✅' : '❌'}`);
          
          if (supported && !mimeType) {
            mimeType = type;
            selectedMimeType = type || 'audio/webm';
            console.log('🎤 Selected recording format:', mimeType || 'browser default');
            break;
          }
        }
      }
      
      // Store the mime type for blob creation
      currentMimeTypeRef.current = selectedMimeType;
      
      try {
        mediaRecorderRef.current = mimeType 
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        
        console.log(`📱 MediaRecorder created successfully (iOS: ${isIOSDevice()}, format: ${selectedMimeType})`);
      } catch (error) {
        console.error('🎤 MediaRecorder creation failed:', error);
        onError?.('Recording not supported on this device. Please try a different browser.');
        return;
      }
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('🎤 MediaRecorder error:', event);
        onError?.('Recording failed. Please try again.');
        stopRecording();
      };
      
      // Start recording
      mediaRecorderRef.current.start(100); // Collect data every 100ms for iOS compatibility
      
      // Start silence detection
      detectSilence();
      
      console.log('🎤 Recording started successfully');
    } catch (error: any) {
      console.error('🎤 Failed to start recording:', error);
      onError?.(`Failed to start recording: ${error.message}`);
      setIsListening(false);
      isRecordingRef.current = false;
    }
  }, [permissionStatus, requestMicrophonePermission, detectSilence, stopRecording, onError]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isListening, startRecording, stopRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    permissionStatus,
    isIOSDevice: isIOSDevice(),
    startRecording,
    stopRecording,
    toggleRecording,
    requestPermission: requestMicrophonePermission,
  };
};