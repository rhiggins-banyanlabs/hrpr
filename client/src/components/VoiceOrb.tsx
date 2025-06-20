import React, { useState, useEffect } from 'react';
import Orb from "@/components/orb";

interface VoiceOrbProps {
  listening: boolean;
  connieDetected: boolean;
  isNavigating: boolean;
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

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  listening,
  connieDetected,
  isNavigating,
}) => {
  const [showSpeaker, setShowSpeaker] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (listening) {
      timer = setTimeout(() => {
        setShowSpeaker(true);
      }, 250);
    } else {
      setShowSpeaker(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [listening]);

  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80">
      <Orb
        hoverIntensity={0.6}
        rotateOnHover={true}
        hue={0}
        forceHoverState={connieDetected || isNavigating}
      />
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`transition-all duration-300 ${
            listening ? "scale-110 opacity-90" : "scale-100 opacity-70"
          }`}
        >
          {/* Microphone Icon */}
          <IconWrapper show={!showSpeaker && !isNavigating}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-full h-full"
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
            </svg>
          </IconWrapper>

          {/* Speaker Icon */}
          <IconWrapper show={showSpeaker && !isNavigating && !connieDetected}>
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

          {/* Connie Detected Icon */}
          <IconWrapper show={connieDetected && !isNavigating} className="animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-full h-full"
              fill="none"
              stroke="url(#connie-gradient)"
              strokeWidth="1.5"
            >
              <IconGradient id="connie-gradient" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </IconWrapper>

          {/* Loading Icon */}
          <IconWrapper show={isNavigating} className="animate-spin">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-full h-full"
              fill="none"
              stroke="url(#loading-gradient)"
              strokeWidth="1.5"
            >
              <IconGradient id="loading-gradient" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </IconWrapper>
        </div>
      </div>
    </div>
  );
};