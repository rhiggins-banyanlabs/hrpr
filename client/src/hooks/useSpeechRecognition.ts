import { useState, useEffect, useRef, useCallback } from 'react';

export interface SpeechRecognitionState {
  listening: boolean;
  transcript: string;
  permissionError: string | null;
  connieDetected: boolean;
  isNavigating: boolean;
}

export interface SpeechRecognitionActions {
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export const useSpeechRecognition = (
  onConnieDetected: (transcript: string) => void
): [SpeechRecognitionState, SpeechRecognitionActions] => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const isNavigatingRef = useRef<boolean>(false);
  const connieDetectedRef = useRef<boolean>(false);

  const CONNIE_VARIATIONS = ["connie", "conny", "coni", "koni", "honey"];

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPermissionError(
        "Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari."
      );
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = handleSpeechResult;
    recognitionRef.current.onaudiostart = () => {
      console.log("Audio capturing started");
    };
    recognitionRef.current.onspeechstart = () => {
      console.log("Speech detected");
    };
    recognitionRef.current.onspeechend = () => {
      console.log("🔚 Speech ended");
      
      // If Connie was detected, immediately navigate
      if (connieDetectedRef.current && !isNavigatingRef.current) {
        console.log("🎯 Triggering immediate navigation from speech end");
        handleConnieDetection(transcript);
      }
    };
    recognitionRef.current.onerror = handleSpeechError;

    return cleanup;
  }, []);

  const handleSpeechResult = (event: any) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.toLowerCase();
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    const currentTranscript = finalTranscript || interimTranscript;
    setTranscript(currentTranscript);
    console.log("🎤 Heard:", currentTranscript);

    const foundConnie = detectConnieInTranscript(currentTranscript);
    console.log("🔍 Connie detection result:", foundConnie);

    if (foundConnie && !connieDetectedRef.current) {
      console.log("✅ Detected Connie! Immediately navigating...");
      connieDetectedRef.current = true;
      
      // Force a state update to trigger UI changes
      setTranscript(currentTranscript + " [CONNIE DETECTED - NAVIGATING]");
      
      // Immediate navigation - don't wait for speech to end
      setTimeout(() => {
        handleConnieDetection(currentTranscript);
      }, 100); // Even faster - just 100ms for UI feedback
    }
  };

  const handleSpeechError = (event: any) => {
    console.error("Speech recognition error", event.error);
    
    if (event.error === "not-allowed" || event.error === "permission-denied") {
      setPermissionError(
        "Microphone access was denied. Please allow microphone access to use this feature."
      );
      setListening(false);
    } else if (event.error === "no-speech") {
      console.log("No speech detected");
    } else {
      setPermissionError(`Error: ${event.error}. Please try again.`);
      setListening(false);
    }
  };

  const detectConnieInTranscript = (transcript: string): boolean => {
    console.log("🔍 Checking transcript for Connie variations:", transcript);
    
    const result = CONNIE_VARIATIONS.some(variation => {
      const heyVariation = transcript.includes(`hey ${variation}`);
      const justVariation = transcript.includes(variation);
      
      console.log(`   - "${variation}": hey=${heyVariation}, just=${justVariation}`);
      
      return heyVariation || justVariation;
    });
    
    console.log("🔍 Final detection result:", result);
    return result;
  };

  const handleConnieDetection = (fullTranscript: string) => {
    console.log("🎯 handleConnieDetection called with:", fullTranscript);
    console.log("🎯 isNavigatingRef.current:", isNavigatingRef.current);
    
    if (isNavigatingRef.current) {
      console.log("⚠️ Already navigating, skipping...");
      return;
    }
    
    console.log("🔄 Setting navigation state...");
    isNavigatingRef.current = true;
    setIsNavigating(true);
    
    // Stop listening completely
    setListening(false);
    
    const query = extractQueryFromTranscript(fullTranscript);
    console.log("📝 Extracted query:", query);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("🛑 Stopped speech recognition");
      } catch (error) {
        console.error("❌ Error stopping recognition", error);
      }
    }

    console.log("🚀 Executing immediate navigation...");
    
    // Immediate navigation - no waiting
    setTimeout(() => {
      onConnieDetected(query);
    }, 50); // Minimal delay just for UI feedback
  };

  const extractQueryFromTranscript = (fullTranscript: string): string => {
    let query = "";

    // Try with "hey" prefix first
    for (const variation of CONNIE_VARIATIONS) {
      if (fullTranscript.includes(`hey ${variation}`)) {
        query = fullTranscript.split(`hey ${variation}`)[1]?.trim();
        break;
      }
    }

    // If not found with "hey", try just the name
    if (!query) {
      for (const variation of CONNIE_VARIATIONS) {
        if (fullTranscript.includes(variation)) {
          query = fullTranscript.split(variation)[1]?.trim();
          break;
        }
      }
    }

    // If no additional query found, return just the greeting
    return query || "hey connie";
  };

  const requestMicrophonePermission = async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      startListening();
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      setPermissionError(
        "Microphone access was denied. Please allow microphone access in your browser settings."
      );
      setListening(false);
    }
  };

  const startListening = useCallback(() => {
    resetState();
    setListening(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log("Speech recognition started");
      } catch (error) {
        console.error("Error starting recognition, attempting restart", error);
        restartRecognition();
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    console.log("🛑 stopListening called, isNavigating:", isNavigating);
    
    // Always stop listening when this function is called
    setListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("Speech recognition stopped");
      } catch (error) {
        console.error("Error stopping recognition", error);
      }
    }
  }, [isNavigating]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      requestMicrophonePermission();
    }
  }, [listening, stopListening]);

  const restartRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition", error);
      }

      setTimeout(() => {
        try {
          recognitionRef.current.start();
          console.log("Speech recognition restarted");
        } catch (error) {
          console.error("Error restarting recognition", error);
        }
      }, 100);
    }
  };

  const resetState = () => {
    setPermissionError(null);
    setTranscript("");
    setIsNavigating(false);
    isNavigatingRef.current = false;
    connieDetectedRef.current = false;
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error during cleanup", error);
      }
    }
  };

  return [
    {
      listening,
      transcript,
      permissionError,
      connieDetected: connieDetectedRef.current,
      isNavigating,
    },
    {
      startListening,
      stopListening,
      toggleListening,
    }
  ];
};