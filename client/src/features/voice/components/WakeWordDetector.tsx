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
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;
      setIsListening(true);

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      isRecordingRef.current = true;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording in chunks
      mediaRecorder.start(1000); // Capture 1 second chunks
      
      // Check for wake word every 2 seconds
      checkIntervalRef.current = setInterval(() => {
        if (audioChunksRef.current.length > 0) {
          checkForWakeWord();
        }
      }, 2000);

      console.log('👂 Wake word detector active');
    } catch (error) {
      console.error('👂 Error starting wake word detection:', error);
      setIsListening(false);
    }
  };

  // Check the audio for wake word
  const checkForWakeWord = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    try {
      // Create audio blob from recent chunks (last 3 seconds)
      const recentChunks = audioChunksRef.current.slice(-3);
      const audioBlob = new Blob(recentChunks, { type: 'audio/webm' });
      
      // Clear old chunks but keep last one for continuity
      audioChunksRef.current = audioChunksRef.current.slice(-1);
      
      // Send to Whisper API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'wakeword.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) return;

      const data = await response.json();
      const transcript = data.text?.toLowerCase().trim();

      if (transcript) {
        console.log('👂 Heard:', transcript);
        
        // Check if any wake word is in the transcript
        const wakeWordDetected = WAKE_WORDS.some(word => 
          transcript.includes(word.toLowerCase())
        );
        
        if (wakeWordDetected) {
          console.log('🎯 Wake word detected!');
          stopWakeWordDetection();
          onWakeWordDetected();
        }
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