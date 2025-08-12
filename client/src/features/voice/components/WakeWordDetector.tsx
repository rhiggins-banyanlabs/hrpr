import { useEffect, useRef, useState } from 'react';

interface WakeWordDetectorProps {
  onWakeWordDetected: () => void;
  isActive: boolean;
}

const WakeWordDetector: React.FC<WakeWordDetectorProps> = ({
  onWakeWordDetected,
  isActive
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startupSkipChecksRef = useRef<number>(0); // Skip initial checks to avoid immediate false triggers
  const [isListening, setIsListening] = useState(false);

  const WAKE_WORDS = [
    'hey harper',
    'hi harper', 
    'hello harper',
    'harper',
    'hey harbor',  // Common misrecognition
    'hey hopper',  // Common misrecognition
  ];

  // Start continuous recording for wake word detection
  const startWakeWordDetection = async () => {
    try {
      console.log('👂 Starting wake word detection');
      
      // Detect iOS devices for optimized settings
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      console.log(`👂 iOS detection: ${isIOS}`);
      
      // Get microphone access with iOS-optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: isIOS ? {
          // iOS-specific settings
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
      streamRef.current = stream;
      setIsListening(true);
      // Skip the very first few check cycles to avoid false positives right after activation
      // This prevents triggering the intro immediately upon button click
      startupSkipChecksRef.current = 1; // number of intervals to skip

      // Set up MediaRecorder with iOS-compatible formats
      let mimeType = 'audio/webm';
      
      if (isIOS) {
        // iOS Safari supports limited formats
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
        console.log('👂 iOS detected, using mimeType:', mimeType);
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
      isRecordingRef.current = true;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording in chunks with iOS-optimized timing
      const timeslice = isIOS ? 2000 : 1000; // Larger chunks for iOS
      mediaRecorder.start(timeslice);
      
      // Check for wake word - more frequently on iOS due to potential audio issues
      const checkInterval = isIOS ? 3000 : 2000; // Check every 3 seconds on iOS
      checkIntervalRef.current = setInterval(() => {
        if (startupSkipChecksRef.current > 0) {
          startupSkipChecksRef.current -= 1;
          // Clear old chunks during the warm-up period
          audioChunksRef.current = [];
          return;
        }
        if (audioChunksRef.current.length > 0) {
          checkForWakeWord();
        }
      }, checkInterval);
      
      console.log(`👂 Recording started - timeslice: ${timeslice}ms, check interval: ${checkInterval}ms`);

      console.log('👂 Wake word detector active');
    } catch (error: any) {
      console.error('👂 Error starting wake word detection:', error);
      setIsListening(false);
      
      // Handle specific iOS errors
      if (error.name === 'NotAllowedError') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIOS) {
          console.error('👂 iOS microphone permission denied');
          // Could show a user-friendly message here
        }
      }
    }
  };

  // Check the audio for wake word
  const checkForWakeWord = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    try {
      // Detect iOS for proper blob handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Create audio blob from recent chunks
      const recentChunks = audioChunksRef.current.slice(-2); // Use last 2 chunks for iOS compatibility
      const blobType = isIOS && MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const audioBlob = new Blob(recentChunks, { type: blobType });
      
      // Skip if blob is too small (likely no audio)
      if (audioBlob.size < 1000) {
        console.log('👂 Audio chunk too small, skipping');
        return;
      }
      
      // Clear old chunks but keep last one for continuity
      audioChunksRef.current = audioChunksRef.current.slice(-1);
      
      // Send to Whisper API with proper filename
      const filename = isIOS ? 'wakeword.mp4' : 'wakeword.webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, filename);
      
      console.log(`👂 Checking wake word - iOS: ${isIOS}, Type: ${blobType}, Size: ${audioBlob.size} bytes`);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) return;

      const data = await response.json();
      const transcript = data.text?.toLowerCase().trim();

      if (transcript) {
        console.log('👂 Wake word check - Heard:', transcript);
        
        // Check if any wake word is in the transcript
        const wakeWordDetected = WAKE_WORDS.some(word => {
          const detected = transcript.includes(word.toLowerCase());
          if (detected) {
            console.log(`👂 ✅ Wake word match found: "${word}" in "${transcript}"`);
          }
          return detected;
        });
        
        if (wakeWordDetected) {
          console.log('🎯 Wake word detected! Stopping detector and activating Harper...');
          stopWakeWordDetection();
          onWakeWordDetected();
        } else {
          console.log('👂 No wake word found in:', transcript);
        }
      } else {
        console.log('👂 No transcript received from Whisper API');
      }
    } catch (error) {
      console.error('👂 Error checking for wake word:', error);
    }
  };

  // Stop wake word detection
  const stopWakeWordDetection = () => {
    console.log('👂 Stopping wake word detection');
    
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    audioChunksRef.current = [];
    isRecordingRef.current = false;
    setIsListening(false);
  };

  // Handle activation state changes
  useEffect(() => {
    if (isActive && !isRecordingRef.current) {
      startWakeWordDetection();
    } else if (!isActive && isRecordingRef.current) {
      stopWakeWordDetection();
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWakeWordDetection();
    };
  }, []);

  // Visual indicator (optional - for debugging)
  if (!isListening) return null;
  
  return (
    <div className="fixed bottom-4 right-4 text-xs text-gray-500">
      👂 Listening for "Hey Harper"...
    </div>
  );
};

export default WakeWordDetector;