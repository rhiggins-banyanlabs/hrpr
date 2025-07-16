import React, { useState, useEffect } from 'react';
import Orb from "@/shared/components/orb";

interface VoiceOrbProps {
  listening: boolean;
  HarperDetected: boolean;
  isNavigating: boolean;
  // New props for unified functionality
  isVoiceInputActive?: boolean;
  onVoiceInputToggle?: () => void;
  isChatOpen?: boolean;
  isHarperSpeaking?: boolean;
  isHarperActivated?: boolean; // New prop for activated state
}

const IconGradient: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="rgb(79, 70, 229)" />
      <stop offset="50%" stopColor="rgb(147, 51, 234)" />
      <stop offset="100%" stopColor="rgb(59, 130, 246)" />
    </linearGradient>
  </defs>
);

const IconWrapper: React.FC<{ 
  children: React.ReactNode; 
  show: boolean; 
  className?: string 
}> = ({ children, show, className = "" }) => (
  <div
    className={`w-16 h-16 sm:w-20 sm:h-20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
      show ? "opacity-100 scale-100" : "opacity-0 scale-75"
    } ${className}`}
  >
    {children}
  </div>
);

const VoiceOrb: React.FC<VoiceOrbProps> = ({
  listening,
  HarperDetected,
  isNavigating,
  isVoiceInputActive = false,
  onVoiceInputToggle,
  isChatOpen = false,
  isHarperSpeaking = false,
  isHarperActivated = false,
}) => {
  const [showSpeaker, setShowSpeaker] = useState(false);

  // Determine which state takes priority
  const isActivelyRecording = isVoiceInputActive;
  const isListeningForWakeWord = listening && !isVoiceInputActive && !isHarperActivated;
  const shouldShowRecordingState = isActivelyRecording;

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isListeningForWakeWord) {
      timer = setTimeout(() => {
        setShowSpeaker(true);
      }, 250);
    } else {
      setShowSpeaker(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isListeningForWakeWord]);

  // Debug current state (commented out to reduce noise)
  // console.log("🔍 VoiceOrb State:", {
  //   listening, HarperDetected, isNavigating, isVoiceInputActive,
  //   isHarperSpeaking, isHarperActivated, isActivelyRecording,
  //   isListeningForWakeWord, shouldShowRecordingState, showSpeaker
  // });

  // Handle click - only allow when Harper is activated and not speaking
  const handleClick = () => {
    console.log("🎤 VoiceOrb clicked!", { 
      isChatOpen, 
      isHarperActivated,
      isHarperSpeaking, 
      hasToggleFunction: !!onVoiceInputToggle,
      isClickable 
    })
    
    if ((isChatOpen || isHarperActivated) && !isHarperSpeaking && onVoiceInputToggle) {
      console.log('🎤 VoiceOrb executing voice input toggle')
      onVoiceInputToggle()
    } else {
      console.log('🎤 VoiceOrb click ignored - conditions not met')
    }
  };

  // Determine if orb should be clickable
  const isClickable = (isChatOpen || isHarperActivated) && !isHarperSpeaking && onVoiceInputToggle;

  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80">
      <div
        className={`absolute inset-0 z-10 ${
          isClickable ? 'cursor-pointer' : 'cursor-default'
        }`}
        onClick={handleClick}
      />
      <Orb
        hoverIntensity={0.6}
        rotateOnHover={true}
        hue={0}
        forceHoverState={
          HarperDetected || 
          (isNavigating && !isHarperActivated) || 
          shouldShowRecordingState || 
          isHarperSpeaking ||
          (listening && !isHarperActivated)
        }
      />
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`transition-all duration-300 ${
            isListeningForWakeWord || shouldShowRecordingState ? "scale-110 opacity-90" : "scale-100 opacity-70"
          }`}
        >
          {/* Microphone Icon - Default state or when actively recording */}
          <IconWrapper show={(!showSpeaker && !isNavigating && !isHarperActivated) || shouldShowRecordingState || (isHarperActivated && !isVoiceInputActive && !isHarperSpeaking)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={`w-full h-full ${shouldShowRecordingState ? 'animate-pulse' : ''}`}
              fill="none"
              stroke="url(#icon-gradient)"
              strokeWidth="1.5"
            >
              <IconGradient id="icon-gradient" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
              {/* Recording indicator when actively recording */}
              {shouldShowRecordingState && (
                <circle cx="18" cy="6" r="3" fill="red">
                  <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
                </circle>
              )}
            </svg>
          </IconWrapper>

          {/* Speaker Icon - When listening for wake word */}
          <IconWrapper show={showSpeaker && !isNavigating && !HarperDetected && !shouldShowRecordingState}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-full h-full"
              fill="none"
              stroke="url(#speaker-gradient)"
              strokeWidth="1.5"
            >
              <IconGradient id="speaker-gradient" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
              />
            </svg>
          </IconWrapper>

          {/* Processing Icon - Show microphone instead of spinning arrows */}
          <IconWrapper show={isNavigating && !isHarperActivated}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-full h-full animate-pulse"
              fill="none"
              stroke="url(#processing-gradient)"
              strokeWidth="1.5"
            >
              <IconGradient id="processing-gradient" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
              {/* Processing indicator */}
              <circle cx="18" cy="6" r="3" fill="orange">
                <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </IconWrapper>
        </div>
      </div>

      {/* Click hint when Harper is activated - INSIDE THE ORB */}
      {isHarperActivated && !isHarperSpeaking && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-sm text-indigo-200 font-medium text-center z-20">
          {isVoiceInputActive ? 'Recording...' : 'Click to speak'}
        </div>
      )}

      {/* Visual feedback for active recording */}
      {shouldShowRecordingState && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
      )}
    </div>
  );
};

export default VoiceOrb;