"use client";
import Orb from "components/orb";
import Waves from "components/waves";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [listening, setListening] = useState(false);
  const [showSpeaker, setShowSpeaker] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false); // Loading state for UI
  const recognitionRef = useRef<any>(null);
  const lastSpeechRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef<boolean>(false); // Prevent duplicate navigation
  const collectedSpeechRef = useRef<string>(""); // Store collected speech
  const connieDetectedRef = useRef<boolean>(false); // Track if "Connie" was detected
  const router = useRouter();

  // Define our color scheme based on the button gradient
  const buttonGradient = {
    from: "indigo-600", // rgb(79, 70, 229)
    via: "purple-600", // rgb(147, 51, 234)
    to: "blue-500", // rgb(59, 130, 246)
  };

  // Check for speech inactivity - wait longer to collect more speech
  useEffect(() => {
    if (listening) {
      inactivityTimerRef.current = setInterval(() => {
        const timeSinceLastSpeech = Date.now() - lastSpeechRef.current;
        if (timeSinceLastSpeech > 3000) {
          // 3 seconds instead of 2
          console.log("No speech detected for 3 seconds, stopping listening");

          // If we've detected Connie but still collecting speech
          if (connieDetectedRef.current && collectedSpeechRef.current) {
            navigateToChat(collectedSpeechRef.current);
          } else {
            stopListening();
          }
        }
      }, 500); // Check every half second
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
  }, [listening]);

  // Navigate to chat with query
  const navigateToChat = (fullTranscript: string) => {
    if (isNavigatingRef.current) return; // Prevent duplicate navigation
    isNavigatingRef.current = true;
    setIsNavigating(true); // Show loading indicator

    // Extract what comes after "connie" with more flexible pattern matching
    let query = "";
    const connieVariations = ["connie", "conny", "coni", "koni", "honey"];

    // Try to find any variation of "hey connie" first
    for (const variation of connieVariations) {
      if (fullTranscript.includes(`hey ${variation}`)) {
        query = fullTranscript.split(`hey ${variation}`)[1]?.trim();
        break;
      }
    }

    // If not found with "hey", try just the name
    if (!query) {
      for (const variation of connieVariations) {
        if (fullTranscript.includes(variation)) {
          query = fullTranscript.split(variation)[1]?.trim();
          break;
        }
      }
    }

    // Stop listening but keep orb state until navigation
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition", error);
      }
    }

    console.log("Preparing to navigate with query:", query || "(none)");

    // Add a slight delay to show the loading state
    setTimeout(() => {
      // Navigate with or without query
      if (query) {
        console.log("Navigating to chat with query:", query);
        router.push(`/chat?query=${encodeURIComponent(query)}`);
      } else {
        console.log("Navigating to chat with no query");
        router.push("/chat");
      }
    }, 800); // Short delay for visual feedback
  };

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

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          // Update last speech timestamp whenever we get results
          lastSpeechRef.current = Date.now();

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

          console.log("Heard:", currentTranscript); // Debug log

          // More flexible detection of "connie" in various forms
          const connieVariations = ["connie", "conny", "coni", "koni", "honey"];
          const foundConnie = connieVariations.some(
            (variation) =>
              currentTranscript.includes(`hey ${variation}`) ||
              currentTranscript.includes(variation),
          );

          if (foundConnie && !connieDetectedRef.current) {
            console.log("Detected Connie!"); // Debug log
            connieDetectedRef.current = true;

            // Start collecting speech after detecting "Connie"
            collectedSpeechRef.current = currentTranscript;
          } else if (connieDetectedRef.current) {
            // If we already detected Connie, keep collecting speech
            collectedSpeechRef.current = currentTranscript;
          }
        };

        recognitionRef.current.onaudiostart = () => {
          console.log("Audio capturing started");
          lastSpeechRef.current = Date.now(); // Reset the timer when audio starts
        };

        recognitionRef.current.onspeechstart = () => {
          console.log("Speech detected");
          lastSpeechRef.current = Date.now(); // Reset the timer when speech starts
        };

        recognitionRef.current.onspeechend = () => {
          console.log("Speech ended");
          // Only navigate if Connie was detected and we're not already navigating
          if (connieDetectedRef.current && !isNavigatingRef.current) {
            // Use a short timeout to wait for any final results
            setTimeout(() => {
              if (collectedSpeechRef.current && !isNavigatingRef.current) {
                navigateToChat(collectedSpeechRef.current);
              }
            }, 500);
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
            // No need to restart, let the inactivity timer handle it
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
  }, [router]);

  // Handle icon transition when listening state changes
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (listening) {
      timer = setTimeout(() => {
        setShowSpeaker(true);
      }, 250); // Reduced from 500ms to 250ms for faster transition
    } else {
      setShowSpeaker(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [listening]);

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
    setIsNavigating(false); // Reset navigation state
    lastSpeechRef.current = Date.now(); // Reset the inactivity timer
    collectedSpeechRef.current = ""; // Reset collected speech
    isNavigatingRef.current = false; // Reset navigation flag
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
    if (!isNavigating) {
      // Don't reset UI state if we're navigating
      setListening(false);
    }

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

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col items-center justify-center bg-black">
      {/* Background Waves */}
      <Waves
        lineColor="rgba(79, 70, 229, 0.6)" // Matching indigo-600 with transparency
        backgroundColor="black"
        waveSpeedX={0.02}
        waveSpeedY={0.01}
        waveAmpX={40}
        waveAmpY={20}
        friction={0.9}
        tension={0.01}
        maxCursorMove={120}
        xGap={12}
        yGap={36}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-4">
        {/* Title and Subtitle */}
        <div className="text-center mb-2">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">
            Connie
          </h1>
          <p className="text-lg sm:text-xl mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300">
            Your AI Event Assistant
          </p>
        </div>

        {/* Orb */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80">
          <Orb
            hoverIntensity={0.6}
            rotateOnHover={true}
            hue={0}
            forceHoverState={connieDetectedRef.current || isNavigating}
          />
          {/* Central Icon with Transition */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`transition-all duration-300 ${listening ? "scale-110 opacity-90" : "scale-100 opacity-70"}`}
            >
              {/* Microphone Icon - shows when not listening */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`w-16 h-16 sm:w-20 sm:h-20 transition-all duration-300 ${showSpeaker || isNavigating ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}
                fill="none"
                stroke="url(#icon-gradient)"
                strokeWidth="1.5"
              >
                <defs>
                  <linearGradient
                    id="icon-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="rgb(79, 70, 229)" />{" "}
                    {/* indigo-600 */}
                    <stop offset="50%" stopColor="rgb(147, 51, 234)" />{" "}
                    {/* purple-600 */}
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" />{" "}
                    {/* blue-500 */}
                  </linearGradient>
                </defs>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>

              {/* Speaker Icon - shows when listening but not navigating */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`w-16 h-16 sm:w-20 sm:h-20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${showSpeaker && !isNavigating && !connieDetectedRef.current ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
                fill="none"
                stroke="url(#speaker-gradient)"
                strokeWidth="1.5"
              >
                <defs>
                  <linearGradient
                    id="speaker-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="rgb(79, 70, 229)" />{" "}
                    {/* indigo-600 */}
                    <stop offset="50%" stopColor="rgb(147, 51, 234)" />{" "}
                    {/* purple-600 */}
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" />{" "}
                    {/* blue-500 */}
                  </linearGradient>
                </defs>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                />
              </svg>

              {/* Connie Detected Icon - shows when Connie is detected */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`w-16 h-16 sm:w-20 sm:h-20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${connieDetectedRef.current && !isNavigating ? "opacity-100 scale-100 animate-pulse" : "opacity-0 scale-75"}`}
                fill="none"
                stroke="url(#connie-gradient)"
                strokeWidth="1.5"
              >
                <defs>
                  <linearGradient
                    id="connie-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="rgb(79, 70, 229)" />{" "}
                    {/* indigo-600 */}
                    <stop offset="50%" stopColor="rgb(147, 51, 234)" />{" "}
                    {/* purple-600 */}
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" />{" "}
                    {/* blue-500 */}
                  </linearGradient>
                </defs>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>

              {/* Loading Icon - shows when navigating */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`w-16 h-16 sm:w-20 sm:h-20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isNavigating ? "opacity-100 scale-100 animate-spin" : "opacity-0 scale-75"}`}
                fill="none"
                stroke="url(#loading-gradient)"
                strokeWidth="1.5"
              >
                <defs>
                  <linearGradient
                    id="loading-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="rgb(79, 70, 229)" />{" "}
                    {/* indigo-600 */}
                    <stop offset="50%" stopColor="rgb(147, 51, 234)" />{" "}
                    {/* purple-600 */}
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" />{" "}
                    {/* blue-500 */}
                  </linearGradient>
                </defs>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Mic Button */}
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={toggleListening}
            disabled={isNavigating}
            className={`group relative flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 text-white py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${isNavigating ? "opacity-70 cursor-not-allowed" : "hover:scale-105"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 ${listening ? "animate-pulse" : "group-hover:animate-pulse"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  listening
                    ? "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                    : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                }
              />
            </svg>
            <span className="font-bold tracking-wider text-lg">
              {isNavigating ? (
                <span>
                  Processing{" "}
                  <span className="text-xl font-extrabold">
                    your request...
                  </span>
                </span>
              ) : connieDetectedRef.current ? (
                <span>
                  Listening to{" "}
                  <span className="text-xl font-extrabold">
                    your question...
                  </span>
                </span>
              ) : listening ? (
                <span>
                  Listening for{" "}
                  <span className="text-xl font-extrabold">"Hey Connie"</span>
                  ...
                </span>
              ) : (
                <span>
                  Press to listen for{" "}
                  <span className="text-xl font-extrabold">"Hey Connie"</span>
                </span>
              )}
            </span>
          </button>

          <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 text-center max-w-md font-medium">
            Click the button above and say{" "}
            <span className="text-lg font-bold">"Hey Connie"</span> for all your
            conference needs.
          </p>
        </div>
      </div>
    </div>
  );
}
