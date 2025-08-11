import { useState, useEffect, useRef, useCallback } from 'react';

export interface SpeechRecognitionState {
  listening: boolean;
  transcript: string;
  permissionError: string | null;
  HarperDetected: boolean;
  isNavigating: boolean;
}

export interface SpeechRecognitionActions {
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetStates: () => void;
}

export const useSpeechRecognition = (
  onHarperDetected: (transcript: string) => void
): [SpeechRecognitionState, SpeechRecognitionActions] => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const isNavigatingRef = useRef<boolean>(false);
  const HarperDetectedRef = useRef<boolean>(false);
  const lastProcessedTranscriptRef = useRef<string>("");
  const finalizedTranscriptRef = useRef<string>("");

  const Harper_VARIATIONS = [
    "harper", 
    "harbor",  // Common misrecognition
    "harpur",  // Common mispronunciation
    "hopper",  // Common misrecognition
    "copper"   // Sometimes heard as this
  ];

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
    
    // Detect mobile devices (iOS, Android, WebKit) for special handling
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(userAgent);
    const isWebKit = /WebKit/i.test(userAgent) && !/Chrome/i.test(userAgent);
    const isMobile = isIOS || isAndroid || ('ontouchstart' in window);
    
    // Use different settings for mobile devices to prevent concatenation
    if (isMobile) {
      console.log("📱 Mobile device (iOS/Android) detected - using single-shot mode to prevent concatenation");
      recognitionRef.current.continuous = false;  // Single-shot mode
      recognitionRef.current.interimResults = false;  // No interim results
    } else {
      console.log("💻 Desktop browser - using continuous mode");
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
    }
    recognitionRef.current.maxAlternatives = 1;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = handleSpeechResult;
    recognitionRef.current.onaudiostart = () => {
      console.log("Audio capturing started");
    };
    recognitionRef.current.onspeechstart = () => {
      console.log("Speech detected");
    };
    recognitionRef.current.onspeechend = () => {
      console.log("🔚 Speech ended");
      
      // If Harper was detected, immediately navigate
      if (HarperDetectedRef.current && !isNavigatingRef.current) {
        console.log("🎯 Triggering immediate navigation from speech end");
        handleHarperDetection(transcript);
      }
    };
    
    recognitionRef.current.onend = () => {
      console.log("🔚 Recognition ended");
      
      // If we're still supposed to be listening and Harper wasn't detected, restart
      if (listening && !HarperDetectedRef.current && !isNavigatingRef.current) {
        console.log("🔄 Restarting recognition to continue wake word detection");
        setTimeout(() => {
          if (listening && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error("Error restarting recognition:", error);
            }
          }
        }, 100);
      }
    };
    
    recognitionRef.current.onerror = handleSpeechError;

    return cleanup;
  }, []);

  const handleSpeechResult = (event: any) => {
    // Detect if we're on a mobile device (iOS, Android, or WebKit)
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(userAgent);
    const isWebKit = /WebKit/i.test(userAgent) && !/Chrome/i.test(userAgent);
    const isMobile = isIOS || isAndroid || ('ontouchstart' in window);
    
    if (isMobile) {
      // Mobile devices: Take only the LAST result to prevent concatenation
      if (event.results.length > 0) {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.toLowerCase().trim();
        
        console.log("📱 Mobile (iOS/Android) - using last result only:", transcript);
        
        // Clear previous transcripts to prevent accumulation
        lastProcessedTranscriptRef.current = "";
        finalizedTranscriptRef.current = "";
        
        setTranscript(transcript);
        
        const foundHarper = detectHarperInTranscript(transcript);
        if (foundHarper && !HarperDetectedRef.current) {
          console.log("✅ Detected Harper on Mobile (iOS/Android)!");
          HarperDetectedRef.current = true;
          setTranscript(transcript + " [Harper DETECTED]");
          setTimeout(() => {
            handleHarperDetection(transcript);
          }, 100);
        }
        
        // On iOS/WebKit, restart recognition after processing
        if (!foundHarper && listening) {
          setTimeout(() => {
            if (recognitionRef.current && listening) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log("Recognition already started");
              }
            }
          }, 500);
        }
        
        return;
      }
    }
    
    // Desktop: Original logic
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
    console.log("🎤 Desktop heard:", currentTranscript);

    const foundHarper = detectHarperInTranscript(currentTranscript);
    console.log("🔍 Harper detection result:", foundHarper);

    if (foundHarper && !HarperDetectedRef.current) {
      console.log("✅ Detected Harper! Immediately navigating...");
      HarperDetectedRef.current = true;
      
      // Force a state update to trigger UI changes
      setTranscript(currentTranscript + " [Harper DETECTED - NAVIGATING]");
      
      // Immediate navigation - don't wait for speech to end
      setTimeout(() => {
        handleHarperDetection(currentTranscript);
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
      console.log("No speech detected - continuing to listen...");
      // Don't stop listening for no-speech errors, just continue
    } else if (event.error === "network") {
      console.log("Network error - restarting recognition...");
      setTimeout(() => {
        if (listening) {
          restartRecognition();
        }
      }, 1000);
    } else {
      console.log(`Speech error: ${event.error} - restarting recognition...`);
      setTimeout(() => {
        if (listening) {
          restartRecognition();
        }
      }, 1000);
    }
  };

  const detectHarperInTranscript = (transcript: string): boolean => {
    console.log("🔍 Checking transcript for Harper variations:", transcript);
    
    const result = Harper_VARIATIONS.some(variation => {
      const heyVariation = transcript.includes(`hey ${variation}`);
      const justVariation = transcript.includes(variation);
      
      console.log(`   - "${variation}": hey=${heyVariation}, just=${justVariation}`);
      
      return heyVariation || justVariation;
    });
    
    console.log("🔍 Final detection result:", result);
    return result;
  };

  const handleHarperDetection = (fullTranscript: string) => {
    console.log("🎯 handleHarperDetection called with:", fullTranscript);
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
      onHarperDetected(query);
      // Reset HarperDetected state after processing
      HarperDetectedRef.current = false;
    }, 50); // Minimal delay just for UI feedback
  };

  const extractQueryFromTranscript = (fullTranscript: string): string => {
    let query = "";

    // Try with "hey" prefix first
    for (const variation of Harper_VARIATIONS) {
      if (fullTranscript.includes(`hey ${variation}`)) {
        query = fullTranscript.split(`hey ${variation}`)[1]?.trim();
        break;
      }
    }

    // If not found with "hey", try just the name
    if (!query) {
      for (const variation of Harper_VARIATIONS) {
        if (fullTranscript.includes(variation)) {
          query = fullTranscript.split(variation)[1]?.trim();
          break;
        }
      }
    }

    // If no additional query found, return just the greeting
    return query || "hey Harper";
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

  const resetStates = () => {
    setListening(false);
    setTranscript("");
    setPermissionError(null);
    setIsNavigating(false);
    HarperDetectedRef.current = false;
    isNavigatingRef.current = false;
    lastProcessedTranscriptRef.current = "";
    finalizedTranscriptRef.current = "";
  };

  const toggleListening = useCallback(() => {
    console.log('🔘 toggleListening called', { listening, currentState: { listening } });
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
    HarperDetectedRef.current = false;
    lastProcessedTranscriptRef.current = "";
    finalizedTranscriptRef.current = "";
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
      HarperDetected: HarperDetectedRef.current,
      isNavigating,
    },
    {
      startListening,
      stopListening,
      toggleListening,
      resetStates,
    }
  ];
};