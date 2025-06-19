"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Waves from "components/waves";
import Link from "next/link";

interface Message {
  id: number;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isLoading?: boolean;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [processingSubmission, setProcessingSubmission] = useState(false);
  const [speechDetected, setSpeechDetected] = useState(false); // New state to track active speech
  const recognitionRef = useRef<any>(null);
  const lastSpeechRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connieDetectedRef = useRef<boolean>(false); // Track if "Connie" was detected
  const collectedSpeechRef = useRef<string>(""); // Store collected speech after "Hey Connie"
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Default questions that can be clicked
  const defaultQuestions = [
    "What events are happening today?",
    "Where is the main conference hall?",
    "When is the next keynote speech?",
    "What food options are available?",
    "How do I access the Wi-Fi?",
    "Where can I find the schedule?",
  ];
  
  // ✅ Ref to prevent double query
  const initialQueryHandled = useRef(false);
  
  // Helper function to extract query after any Connie variation - defined at component level to avoid duplication
  const extractQueryAfterConnie = (transcript: string) => {
    const connieVariations = ["connie", "conny", "coni", "koni", "honey"];
    let query = "";
    
    // Try to find any variation of "hey connie" first
    for (const variation of connieVariations) {
      if (transcript.toLowerCase().includes(`hey ${variation}`)) {
        // Get everything after "hey connie" using case-insensitive RegExp
        query = transcript.split(new RegExp(`hey ${variation}`, 'i'))[1]?.trim();
        break;
      }
    }
    
    // If not found with "hey", try just the name
    if (!query) {
      for (const variation of connieVariations) {
        if (transcript.toLowerCase().includes(variation)) {
          // Get everything after "connie" using case-insensitive RegExp
          query = transcript.split(new RegExp(variation, 'i'))[1]?.trim();
          break;
        }
      }
    }
    
    return query || ""; // Ensure we always return a string
  };
  
  // Add initial query as first message
  useEffect(() => {
    if (initialQuery && !initialQueryHandled.current) {
      initialQueryHandled.current = true; // ✅ Mark as handled

      setMessages([
        {
          id: 1,
          text: initialQuery,
          sender: "user",
          timestamp: new Date(),
        },
      ]);

      // Add loading message
      const loadingMsgId = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: loadingMsgId,
          text: "",
          sender: "assistant",
          timestamp: new Date(),
          isLoading: true,
        },
      ]);

      // Simulate assistant response
      setTimeout(() => {
        setMessages((prev) =>
          prev
            .filter((msg) => msg.id !== loadingMsgId)
            .concat({
              id: loadingMsgId,
              text: `I'd be happy to help with "${initialQuery}". What else would you like to know?`,
              sender: "assistant",
              timestamp: new Date(),
            }),
        );
      }, 1500);
    }
  }, [initialQuery]);

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== "undefined") {
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        // @ts-ignore - TypeScript doesn't know about webkitSpeechRecognition
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.maxAlternatives = 3; // Get multiple alternatives to improve accuracy
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          // Update last speech timestamp whenever we get results
          lastSpeechRef.current = Date.now();
          setSpeechDetected(true);

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const currentTranscript = finalTranscript || interimTranscript;
          setTranscript(currentTranscript);
          
          // Store the full transcript in the ref for better capture
          collectedSpeechRef.current = currentTranscript;

          console.log("Heard:", currentTranscript); // Debug log

          // More flexible detection of "connie" in various forms
          const connieVariations = ["connie", "conny", "coni", "koni", "honey"];
          const foundConnie = connieVariations.some(
            (variation) =>
              currentTranscript.toLowerCase().includes(`hey ${variation}`) ||
              currentTranscript.toLowerCase().includes(variation),
          );

          if (foundConnie && !connieDetectedRef.current) {
            console.log("Detected Connie!"); // Debug log
            connieDetectedRef.current = true;
            
            // Extract what comes after "connie" with more flexible pattern matching
            let query = extractQueryAfterConnie(currentTranscript);
            
            // Update UI to show we're listening for the question
            if (query) {
              setInput(query);
            } else {
              setInput("Listening for your question...");
            }
          } else if (connieDetectedRef.current) {
            // If we already detected Connie, keep collecting speech
            
            // Extract what comes after "connie" with more flexible pattern matching
            let query = extractQueryAfterConnie(currentTranscript);
            
            if (query) {
              setInput(query);
            } else {
              // Try to extract the full speech after detecting Connie
              const fullSpeech = currentTranscript.toLowerCase();
              const connieIndex = connieVariations.reduce((index, variation) => {
                const heyVariationIndex = fullSpeech.indexOf(`hey ${variation}`);
                const variationIndex = fullSpeech.indexOf(variation);
                
                if (heyVariationIndex !== -1) {
                  return Math.max(index, heyVariationIndex + `hey ${variation}`.length);
                } else if (variationIndex !== -1 && (index === -1 || variationIndex < index)) {
                  return Math.max(index, variationIndex + variation.length);
                }
                return index;
              }, -1);
              
              if (connieIndex > -1) {
                const afterConnie = currentTranscript.substring(connieIndex).trim();
                if (afterConnie) {
                  setInput(afterConnie);
                }
              }
            }
            
            // If this is a final result with content, consider auto-submitting
            if (finalTranscript && event.results[event.results.length - 1].isFinal) {
              // Reset the inactivity timer to give a bit more time for additional speech
              lastSpeechRef.current = Date.now();
            }
          }
        };

        recognitionRef.current.onaudiostart = () => {
          console.log("Audio capturing started");
          lastSpeechRef.current = Date.now();
        };

        recognitionRef.current.onspeechstart = () => {
          console.log("Speech detected");
          lastSpeechRef.current = Date.now();
        };

        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended unexpectedly");
          // If we're supposed to be listening but recognition ended, restart it
          if (listening) {
            console.log("Restarting speech recognition");
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error("Error restarting recognition", error);
              // If there's an error, try again after a short delay
              setTimeout(() => {
                try {
                  recognitionRef.current.start();
                } catch (innerError) {
                  console.error("Error on second restart attempt", innerError);
                  // If it fails twice, stop listening
                  setListening(false);
                }
              }, 300);
            }
          }
        };

        recognitionRef.current.onspeechend = () => {
          console.log("Speech ended");
          setSpeechDetected(false);
          
          // If Connie was detected and we have transcript, submit after a short delay
          if (connieDetectedRef.current) {
            console.log("Speech ended, preparing to submit");
            
            // Extract what comes after "connie" one more time to ensure we have the latest
            const finalQuery = extractQueryAfterConnie(collectedSpeechRef.current);
            
            // If we have a query from extraction, use it
            if (finalQuery) {
              setInput(finalQuery);
            } else {
              // Try to get everything after the wake word
              const fullSpeech = collectedSpeechRef.current.toLowerCase();
              const connieVariations = ["connie", "conny", "coni", "koni", "honey"];
              
              for (const variation of connieVariations) {
                if (fullSpeech.includes(`hey ${variation}`)) {
                  const afterWakeWord = collectedSpeechRef.current.split(new RegExp(`hey ${variation}`, 'i'))[1]?.trim();
                  if (afterWakeWord) {
                    setInput(afterWakeWord);
                    break;
                  }
                } else if (fullSpeech.includes(variation)) {
                  const afterWakeWord = collectedSpeechRef.current.split(new RegExp(variation, 'i'))[1]?.trim();
                  if (afterWakeWord) {
                    setInput(afterWakeWord);
                    break;
                  }
                }
              }
            }
            
            // Very short delay to ensure we've processed any final speech recognition results
            setTimeout(() => {
              if (connieDetectedRef.current) {
                // Get the latest input value
                const currentInput = input !== "Listening for your question..." ? input : finalQuery;
                
                if (currentInput && currentInput !== "Listening for your question...") {
                  console.log("Auto-submitting after speech end:", currentInput);
                  
                  // Use another timeout to ensure the input is set before submitting
                  setTimeout(() => {
                    handleSubmit(undefined, currentInput);
                  }, 100);
                } else {
                  stopListening();
                }
              }
            }, 300);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (
            event.error === "not-allowed" ||
            event.error === "permission-denied"
          ) {
            setPermissionError(
              "Microphone access was denied. Please allow microphone access to use this feature.",
            );
            setListening(false);
          } else if (event.error === "no-speech") {
            console.log("No speech detected");
          } else {
            setPermissionError(`Error: ${event.error}. Please try again.`);
            setListening(false);
          }
        };
      } else {
        setPermissionError(
          "Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari.",
        );
      }
    }

    return () => {
      stopListening();
    };
  }, [input]);

  // Check for speech inactivity - use a shorter timeout for better responsiveness
  useEffect(() => {
    if (listening) {
      inactivityTimerRef.current = setInterval(() => {
        const timeSinceLastSpeech = Date.now() - lastSpeechRef.current;
        if (timeSinceLastSpeech > 1000) { // 1 second of inactivity
          console.log("No speech detected for 1 second");
          
          // If we've detected Connie and have input, submit it
          if (connieDetectedRef.current) {
            const finalQuery = extractQueryAfterConnie(collectedSpeechRef.current);
            
            // If we have a query from extraction, use it
            let queryToSubmit = finalQuery;
            
            // If extraction didn't work, try to get everything after the wake word
            if (!queryToSubmit) {
              const fullSpeech = collectedSpeechRef.current.toLowerCase();
              const connieVariations = ["connie", "conny", "coni", "koni", "honey"];
              
              for (const variation of connieVariations) {
                if (fullSpeech.includes(`hey ${variation}`)) {
                  queryToSubmit = collectedSpeechRef.current.split(new RegExp(`hey ${variation}`, 'i'))[1]?.trim();
                  break;
                } else if (fullSpeech.includes(variation)) {
                  queryToSubmit = collectedSpeechRef.current.split(new RegExp(variation, 'i'))[1]?.trim();
                  break;
                }
              }
            }
            
            // Use the extracted query or the current input if it's not the placeholder
            const inputToSubmit = queryToSubmit || (input !== "Listening for your question..." ? input : "");
            
            if (inputToSubmit) {
              console.log("Auto-submitting after speech inactivity:", inputToSubmit);
              handleSubmit(undefined, inputToSubmit);
            } else {
              stopListening();
            }
          } else {
            // Just stop listening if no Connie detected after inactivity
            stopListening();
          }
        }
      }, 200); // Check more frequently (every 200ms)
    } else {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    }
    
    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [listening, input]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent, overrideInput?: string) => {
    if (e) {
      e.preventDefault();
    }
    
    const textToSubmit = overrideInput || input;
    
    if (!textToSubmit.trim() || textToSubmit === "Listening for your question...") return;

    // Set processing state
    setProcessingSubmission(true);

    // Add user message
    const newMessage: Message = {
      id: messages.length + 1,
      text: textToSubmit,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    
    // Reset voice recognition state
    if (listening) {
      stopListening();
    }

    // Add loading message
    const loadingMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingMsgId,
        text: "",
        sender: "assistant",
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    // Simulate assistant response
    setTimeout(() => {
      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== loadingMsgId)
          .concat({
            id: loadingMsgId,
            text: `I'm processing your request: "${textToSubmit}"`,
            sender: "assistant",
            timestamp: new Date(),
          }),
      );
      setProcessingSubmission(false); // Reset processing state
    }, 1500);
  };
  
  // Handle clicking on a default question
  const handleQuestionClick = (question: string) => {
    // Use the same handleSubmit function with the question as override
    handleSubmit(undefined, question);
  };
  
  // Request microphone permission explicitly
  const requestMicrophonePermission = async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the tracks immediately, we just needed the permission
      stream.getTracks().forEach((track) => track.stop());
      startListening();
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      setPermissionError(
        "Microphone access was denied. Please allow microphone access in your browser settings.",
      );
      setListening(false);
    }
  };
  
  const startListening = () => {
    setListening(true);
    setPermissionError(null);
    setTranscript(""); // Clear previous transcript
    setInput(""); // Clear input
    lastSpeechRef.current = Date.now(); // Reset the inactivity timer
    collectedSpeechRef.current = ""; // Reset collected speech
    connieDetectedRef.current = false; // Reset Connie detection
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log("Speech recognition started"); // Debug log
      } catch (error) {
        // If already started, stop and restart
        console.error("Error starting recognition, attempting restart", error);
        restartRecognition();
      }
    }
  };
  
  const stopListening = () => {
    setListening(false);
    
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("Speech recognition stopped"); // Debug log
      } catch (error) {
        console.error("Error stopping recognition", error);
      }
    }
  };
  
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
          lastSpeechRef.current = Date.now(); // Reset the inactivity timer
          console.log("Speech recognition restarted"); // Debug log
        } catch (error) {
          console.error("Error restarting recognition", error);
          // Try one more time after a slightly longer delay
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              console.log("Speech recognition restarted on second attempt");
            } catch (secondError) {
              console.error("Failed to restart recognition after second attempt", secondError);
              setListening(false);
            }
          }, 500);
        }
      }, 100);
    }
  };
  
  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      requestMicrophonePermission();
    }
  };

  // Loading dots component
  const LoadingDots = () => (
    <div className="flex space-x-1 mt-1 justify-center">
      <div
        className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      ></div>
      <div
        className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      ></div>
      <div
        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      ></div>
    </div>
  );

  // Pulsing Microphone Animation
  const PulsingMicrophone = () => (
    <div className="relative">
      <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-blue-500/30 rounded-full animate-ping opacity-75"></div>
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-500/20 rounded-full animate-ping opacity-50" style={{ animationDelay: "300ms" }}></div>
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );

  // Processing Animation
  const ProcessingAnimation = () => (
    <div className="relative">
      <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-indigo-500/30 rounded-full animate-ping opacity-75"></div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 animate-spin"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );

  return (
    <div className="relative flex flex-col h-screen bg-black text-white">
      {/* Background Waves */}
      <Waves
        lineColor="rgba(79, 70, 229, 0.3)" // More subtle for chat background
        backgroundColor="black"
        waveSpeedX={0.01}
        waveSpeedY={0.005}
        waveAmpX={30}
        waveAmpY={15}
        friction={0.95}
        tension={0.01}
        maxCursorMove={80}
        xGap={16}
        yGap={40}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-gray-800 bg-black bg-opacity-70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </Link>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">
            Chat with Connie
          </h1>
        </div>
        
        {/* Voice Status Indicator in Header */}
        {(listening || processingSubmission) && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
            processingSubmission 
              ? 'bg-blue-900/40 border-blue-700/50' 
              : speechDetected 
                ? 'bg-indigo-900/40 border-purple-700/50'
                : 'bg-indigo-900/40 border-indigo-700/50'
          }`}>
            <div className="relative flex items-center justify-center h-5 w-5">
              {processingSubmission ? (
                <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping"></div>
              ) : speechDetected ? (
                <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping"></div>
              ) : (
                <div className="absolute inset-0 bg-indigo-500/30 rounded-full animate-ping"></div>
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${
                  processingSubmission 
                    ? 'text-blue-400' 
                    : speechDetected 
                      ? 'text-purple-400' 
                      : 'text-indigo-400'
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                {processingSubmission ? (
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
            </div>
            <span className="text-xs font-medium text-purple-300">
              {processingSubmission 
                ? "Processing..." 
                : speechDetected
                  ? "Listening to speech..."
                  : connieDetectedRef.current 
                    ? "Waiting for more speech..." 
                    : "Waiting for 'Hey Connie'..."}
            </span>
          </div>
        )}
      </header>

      {/* Chat Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-blue-500/30 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center animate-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400 mb-2">
              How can I help you today?
            </h2>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Ask me anything about the event, or select a popular question
              below.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.sender === "user"
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 text-white"
                  : "bg-gray-800 text-white border border-gray-700"
              }`}
            >
              {message.isLoading ? (
                <LoadingDots />
              ) : (
                <>
                  <p>{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area with Suggested Questions */}
      <div className="relative z-10 border-t border-gray-800 bg-black bg-opacity-70 backdrop-blur-sm">
        {/* Suggested Questions */}
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {defaultQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuestionClick(question)}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-500/20 border border-gray-700 hover:border-purple-500 transition-colors text-sm flex items-center gap-2 group"
              >
                <span className="text-purple-400 group-hover:text-purple-300 flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="truncate">{question}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 pt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className={`w-full bg-gray-900 border ${
                  speechDetected 
                    ? 'border-purple-600/60' 
                    : connieDetectedRef.current 
                      ? 'border-indigo-600/60' 
                      : 'border-gray-700'
                } rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  connieDetectedRef.current ? 'text-purple-300' : ''
                } ${listening ? 'pr-10' : ''}`}
                readOnly={listening && connieDetectedRef.current || processingSubmission}
              />
              
              {/* Listening indicator inside input field */}
              {listening && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="flex space-x-1">
                    <div 
                      className={`w-1.5 h-1.5 ${
                        speechDetected ? 'bg-purple-500' : 'bg-indigo-500'
                      } rounded-full animate-bounce`} 
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div 
                      className={`w-1.5 h-1.5 ${
                        speechDetected ? 'bg-purple-400' : 'bg-indigo-400'
                      } rounded-full animate-bounce`} 
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div 
                      className={`w-1.5 h-1.5 ${
                        speechDetected ? 'bg-purple-600' : 'bg-indigo-600'
                      } rounded-full animate-bounce`} 
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Processing indicator inside input field */}
              {processingSubmission && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Voice Button with enhanced visual feedback */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={processingSubmission}
              className={`w-12 h-12 flex items-center justify-center rounded-full text-white hover:opacity-90 transition-all ${
                processingSubmission
                  ? "bg-gray-700 cursor-not-allowed opacity-70"
                  : listening 
                    ? (speechDetected 
                      ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 shadow-lg shadow-purple-500/30"
                      : "bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-lg shadow-red-500/30")
                    : "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500"
              }`}
              title={listening ? "Stop listening" : "Say 'Hey Connie'"}
            >
              {processingSubmission ? (
                <ProcessingAnimation />
              ) : listening ? (
                speechDetected ? (
                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-blue-500/30 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-500/20 rounded-full animate-ping opacity-50" style={{ animationDelay: "300ms" }}></div>
                    <div className="relative">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <PulsingMicrophone />
                )
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={processingSubmission}
              className={`w-12 h-12 flex items-center justify-center rounded-full text-white hover:opacity-90 transition-all ${
                processingSubmission
                  ? "bg-gray-700 cursor-not-allowed opacity-70"
                  : "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 hover:shadow-lg hover:shadow-purple-500/30"
              }`}
            >
              {processingSubmission ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
          
          {/* Permission Error Message */}
          {permissionError && (
            <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded-lg text-white text-xs text-center">
              <p>{permissionError}</p>
            </div>
          )}
          
          {/* Voice Status - Enhanced visibility */}
          {listening && !permissionError && (
            <div className={`mt-2 p-2 ${
              speechDetected 
                ? 'bg-purple-900/40 border-purple-700/50' 
                : 'bg-indigo-900/40 border-indigo-700/50'
            } rounded-lg text-white text-sm text-center flex items-center justify-center gap-2`}>
              {connieDetectedRef.current ? (
                <>
                  <div className="relative flex h-4 w-4">
                    <div className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                      speechDetected ? 'bg-purple-400' : 'bg-indigo-400'
                    } opacity-75`}></div>
                    <div className={`relative inline-flex rounded-full h-4 w-4 ${
                      speechDetected ? 'bg-purple-500' : 'bg-indigo-500'
                    }`}></div>
                  </div>
                  <p>
                    {speechDetected 
                      ? "Actively listening to your question..." 
                      : "Listening to your question..."} 
                    <span className="text-xs text-purple-300">(will submit automatically when you finish speaking)</span>
                  </p>
                </>
              ) : (
                <>
                  <div className="relative flex h-4 w-4">
                    <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></div>
                    <div className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></div>
                  </div>
                  <p>Say <span className="font-bold">"Hey Connie"</span> followed by your question</p>
                </>
              )}
            </div>
          )}
          
          {/* Processing Status */}
          {processingSubmission && !listening && (
            <div className="mt-2 p-2 bg-blue-900/40 border border-blue-700/50 rounded-lg text-white text-sm text-center flex items-center justify-center gap-2">
              <div className="relative flex h-4 w-4">
                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></div>
                <div className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></div>
              </div>
              <p>Processing your question...</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
