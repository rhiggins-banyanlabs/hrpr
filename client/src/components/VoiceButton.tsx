
import React from 'react';

interface VoiceButtonProps {
  listening: boolean;
  isNavigating: boolean;
  HarperDetected: boolean;
  onToggle: () => void;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  listening,
  isNavigating,
  HarperDetected,
  onToggle,
}) => {
  const getButtonText = () => {
    if (HarperDetected) {
      return (
        <span>
          Harper detected! <span className="text-xl font-extrabold">Processing...</span>
        </span>
      );
    }
    
    if (listening) {
      return (
        <span>
          Listening for <span className="text-xl font-extrabold">&quot;Hey Harper&quot;</span>...
        </span>
      );
    }
    
    return (
      <span>
        Press and say <span className="text-xl font-extrabold">&quot;Hey Harper&quot;</span>
      </span>
    );
  };

  const getIconPath = () => {
    return listening
      ? "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
      : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z";
  };

  const handleClick = () => {
    console.log("🔘 VoiceButton clicked", { listening, HarperDetected, isNavigating });
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      disabled={HarperDetected}
      className={`group relative flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 text-white py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${
        HarperDetected ? "opacity-70 cursor-not-allowed" : "hover:scale-105"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-6 w-6 ${(listening || HarperDetected) ? "animate-pulse" : "group-hover:animate-pulse"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={getIconPath()}
        />
      </svg>
      <span className="font-bold tracking-wider text-lg">
        {getButtonText()}
      </span>
    </button>
  );
};