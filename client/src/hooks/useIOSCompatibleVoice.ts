import { useState, useRef, useCallback, useEffect } from 'react';
import { audioConverter } from '@/services/audio-converter.service';

// Comprehensive iOS detection
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Check for iOS devices (iPhone, iPad, iPod) - including Chrome on iOS
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  
  // Check for iPad on iOS 13+ (reports as MacIntel)
  const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  
  // Additional iPad detection for newer iPadOS versions
  const isIPadUserAgent = /iPad/.test(userAgent);
  
  // For iPads, we should ALWAYS use iOS-compatible voice system regardless of browser
  // because Web Speech API is unreliable/disabled on iOS Chrome and Safari has MediaDevices issues
  const result = isIOS || isIPadOS || isIPadUserAgent;
  
  console.log('🍎 iOS Detection Debug:', {
    userAgent: userAgent.substring(0, 100),
    platform,
    maxTouchPoints: navigator.maxTouchPoints,
    isIOS,
    isIPadOS,
    isIPadUserAgent,
    finalResult: result,
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia),
    isChrome: /Chrome/.test(userAgent),
    isChromeOrCriOS: /Chrome|CriOS/.test(userAgent),
    isSafari: /Safari/.test(userAgent),
    detailedUA: userAgent
  });
  
  return result;
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
      console.log('🎤 Requesting microphone permission for iOS...');
      
      // CRITICAL: iOS requires this to be called within a user gesture event
      // Check if we're in a secure context (HTTPS required for iOS)
      if (isIOSDevice() && location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.error('❌ HTTPS required for iOS microphone access');
        const errorMsg = 'Microphone access on iOS requires a secure connection (HTTPS). Please use HTTPS.';
        onError?.(errorMsg);
        return false;
      }
      
      // Step 1: Initialize Audio Context for iOS (MUST be done in user gesture)
      if (isIOSDevice() && !audioContextRef.current) {
        console.log('🎵 Initializing AudioContext for iOS in user gesture...');
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Resume AudioContext immediately (iOS requirement)
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
            console.log('🎵 AudioContext resumed');
          }
          
          // Create a silent audio buffer to "unlock" iOS audio
          const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current.destination);
          source.start();
          
          console.log('🎵 iOS audio session unlocked');
        } catch (audioError) {
          console.warn('⚠️ AudioContext initialization failed:', audioError);
          // Continue anyway, might still work
        }
      }
      
      // Step 2: Try modern MediaDevices API first
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('🎤 Trying modern MediaDevices API...');
        
        // Use the most basic constraints for iOS compatibility
        const constraints = {
          audio: isIOSDevice() ? {
            // Minimal constraints for maximum iOS compatibility
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        };
        
        console.log('🎤 Using constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('🎤 Modern getUserMedia permission granted');
        // Test the stream briefly
        const tracks = stream.getAudioTracks();
        console.log('🎤 Audio tracks received:', tracks.length, tracks);
        
        // Stop the stream immediately (we just needed permission)
        stream.getTracks().forEach(track => {
          console.log('🛑 Stopping track:', track.label);
          track.stop();
        });
        
        setPermissionStatus('granted');
        console.log('✅ Microphone permission granted via modern API');
        return true;
      }
      
      // Step 3: Fallback to legacy getUserMedia for older iOS versions
      console.log('🎤 MediaDevices not available, trying legacy getUserMedia...');
      
      const legacyGetUserMedia = (navigator as any).getUserMedia || 
                               (navigator as any).webkitGetUserMedia || 
                               (navigator as any).mozGetUserMedia || 
                               (navigator as any).msGetUserMedia;
      
      if (!legacyGetUserMedia) {
        const errorMsg = 'Microphone access is not supported in this browser version. Please update to Safari 11+ or use a supported browser.';
        onError?.(errorMsg);
        return false;
      }
      
      // Use legacy API with promise wrapper
      return new Promise<boolean>((resolve) => {
        const constraints = { audio: true };
        console.log('🎤 Using legacy getUserMedia with constraints:', constraints);
        
        legacyGetUserMedia.call(navigator, 
          constraints, 
          (stream: MediaStream) => {
            console.log('🎤 Legacy getUserMedia permission granted');
            console.log('🎤 Legacy stream tracks:', stream.getAudioTracks());
            
            // Stop the stream immediately
            stream.getTracks().forEach(track => {
              console.log('🛑 Stopping legacy track:', track.label);
              track.stop();
            });
            
            setPermissionStatus('granted');
            console.log('✅ Microphone permission granted via legacy API');
            resolve(true);
          },
          (error: any) => {
            console.error('🎤 Legacy getUserMedia permission error:', error);
            
            let message = 'Microphone access denied.';
            if (error.name === 'NotAllowedError') {
              message = 'Please allow microphone access when prompted by your browser. You may need to check your browser settings.';
            } else if (error.name === 'NotFoundError') {
              message = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.name === 'NotReadableError') {
              message = 'Microphone is already in use by another application.';
            } else if (error.name === 'NotSupportedError') {
              message = 'Microphone access is not supported in this browser.';
            }
            
            onError?.(message);
            setPermissionStatus('denied');
            resolve(false);
          }
        );
      });
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

    // iOS-adjusted thresholds
    const VOICE_THRESHOLD = isIOSDevice() ? 12 : 15;
    const SILENCE_THRESHOLD = isIOSDevice() ? 8 : 10;

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
      const silenceFrameThreshold = isIOSDevice() ? 90 : 60; // ~1.5s on iOS, ~1s on others
      
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
      console.log('🎤 Original blob:', { size: audioBlob.size, type: audioBlob.type });
      
      let processedBlob = audioBlob;
      let fileName = 'audio.webm';
      
      // Determine actual file format from mime type
      const mimeType = audioBlob.type || currentMimeTypeRef.current;
      console.log('🎤 Detected mime type:', mimeType);
      
      if (mimeType.includes('mp4')) {
        fileName = 'audio.mp4';
      } else if (mimeType.includes('webm')) {
        fileName = 'audio.webm';
      } else if (mimeType.includes('ogg')) {
        fileName = 'audio.ogg';
      } else if (mimeType.includes('wav')) {
        fileName = 'audio.wav';
      } else {
        // Default to webm for unknown types
        fileName = 'audio.webm';
        console.log('� Unknown format, defaulting to webm');
      }
      
      // Try audio conversion for iOS if needed
      const supportedFormats = ['mp4', 'webm', 'wav', 'ogg', 'm4a'];
      const isAlreadySupported = supportedFormats.some(format => mimeType.includes(format));
      
      if (isAlreadySupported) {
        console.log('🎤 Audio format already supported by Whisper, skipping conversion');
      } else {
        try {
          if (isIOSDevice()) {
            console.log('🍎 iOS detected with non-standard format, attempting conversion...');
            const converted = await audioConverter.convertForDevice(audioBlob, 'webm');
            processedBlob = converted.blob;
            fileName = converted.filename;
            console.log(`✅ Audio converted for iOS: ${fileName}`);
          }
        } catch (conversionError) {
          console.warn('⚠️ Audio conversion failed, using original format:', conversionError);
          // Continue with original blob if conversion fails
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
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
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
      
      // CRITICAL: Ensure we have permission and it was granted in a user gesture
      const hasPermission = permissionStatus === 'granted' || await requestMicrophonePermission();
      if (!hasPermission) {
        console.log('🎤 No permission to record');
        onError?.('Microphone permission is required. Please allow microphone access and try again.');
        return;
      }
      
      // Reset state
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      silenceCountRef.current = 0;
      isRecordingRef.current = true;
      setIsListening(true);
      setTranscript('');
      
      console.log('🎤 Setting up microphone stream...');
      
      // Step 1: Get microphone stream with iOS-optimized settings
      let stream: MediaStream;
      
      // Try modern MediaDevices API first, fallback to legacy if needed
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('🎤 Using modern MediaDevices API for recording...');
        
        const constraints = isIOSDevice() ? {
          audio: {
            // iOS-optimized constraints for maximum compatibility
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            // Don't specify sampleRate - let iOS choose
          }
        } : {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        };
        
        console.log('🎤 Stream constraints:', constraints);
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        // Use legacy getUserMedia for older iOS/Safari versions
        console.log('🎤 Using legacy getUserMedia for recording...');
        const legacyGetUserMedia = (navigator as any).getUserMedia || 
                                 (navigator as any).webkitGetUserMedia || 
                                 (navigator as any).mozGetUserMedia || 
                                 (navigator as any).msGetUserMedia;
        
        if (!legacyGetUserMedia) {
          throw new Error('No getUserMedia implementation available');
        }
        
        stream = await new Promise<MediaStream>((resolve, reject) => {
          legacyGetUserMedia.call(navigator, 
            { audio: true }, // Simple constraints for legacy
            (stream: MediaStream) => resolve(stream),
            (error: any) => reject(error)
          );
        });
      }
      
      streamRef.current = stream;
      console.log('🎤 Microphone stream obtained:', {
        tracks: stream.getAudioTracks().length,
        settings: stream.getAudioTracks()[0]?.getSettings()
      });
      
      // Step 2: Set up audio context for silence detection (iOS requires resumed context)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // CRITICAL: Resume AudioContext for iOS
      if (audioContextRef.current.state === 'suspended') {
        console.log('🎵 Resuming AudioContext for iOS...');
        await audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      console.log('🎵 Audio analysis setup complete');
      
      // Store the stream reference for cleanup
      streamRef.current = stream;
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Set up MediaRecorder with device-specific mime type
      // iOS requires specific handling since it only supports limited formats natively
      let mimeType = '';
      let selectedMimeType = 'audio/webm'; // Default fallback
      
      if (isIOSDevice()) {
        // For iOS, try formats in order of Whisper API compatibility
        const iosMimeTypes = [
          'audio/mp4',           // Best for iOS and Whisper
          'audio/webm',          // Supported by Whisper
          'audio/webm;codecs=opus',
          'audio/wav',           // Supported by Whisper
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
        // For non-iOS devices, prioritize Whisper-compatible formats
        const standardMimeTypes = [
          'audio/webm;codecs=opus', // Best quality, Whisper compatible
          'audio/webm',            // Whisper compatible
          'audio/mp4',             // Whisper compatible
          'audio/wav',             // Whisper compatible
          'audio/ogg;codecs=opus', // Whisper compatible
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
      console.log('🎤 Final mime type for recording:', selectedMimeType);
      
      try {
        mediaRecorderRef.current = mimeType 
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        
        // Log actual MediaRecorder properties
        const actualMimeType = mediaRecorderRef.current.mimeType;
        console.log(`📱 MediaRecorder created successfully:`);
        console.log(`   - iOS: ${isIOSDevice()}`);
        console.log(`   - Requested format: ${selectedMimeType}`);
        console.log(`   - Actual format: ${actualMimeType}`);
        console.log(`   - State: ${mediaRecorderRef.current.state}`);
        
        // Update our reference with the actual mime type
        if (actualMimeType && actualMimeType !== selectedMimeType) {
          currentMimeTypeRef.current = actualMimeType;
          console.log(`🔄 Updated mime type to actual: ${actualMimeType}`);
        }
        
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